import { importWithRetry } from "@/lib/lazy-retry";
import type { ChatRequest } from "./chat";
import { callsDirectly, refuseDirect } from "./providers";

/*
 * Where a request to the reader's AI goes. A provider whose API answers pages
 * directly is called from the browser, so the key and the text reach it
 * alone; the others go through Ulune's relay (lib/ai/relay.ts), which passes
 * them on and keeps nothing. If a browser refuses a direct call (a provider
 * changed its policy), the relay takes over for the rest of the visit
 * (lib/ai/providers.ts keeps which, for the accounts panel too).
 */

/** What went wrong, in terms the reader can act on. */
export type AiFailureKind = "key" | "limit" | "timeout" | "provider" | "network";

export class AiCallError extends Error {
  readonly kind: AiFailureKind;
  constructor(kind: AiFailureKind) {
    super(kind);
    this.name = "AiCallError";
    this.kind = kind;
  }
}

function fromStatus(status: number): AiCallError {
  if (status === 401 || status === 403) return new AiCallError("key");
  if (status === 429) return new AiCallError("limit");
  if (status === 504 || status === 408) return new AiCallError("timeout");
  if (status === 502) return new AiCallError("network");
  return new AiCallError("provider");
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

export async function callAi(req: ChatRequest, signal?: AbortSignal): Promise<string> {
  const { AiHttpError, completeChat } = await importWithRetry(() => import("./chat"));
  if (callsDirectly(req.provider)) {
    try {
      return await completeChat(req, "browser", signal);
    } catch (err) {
      if (err instanceof AiHttpError) throw fromStatus(err.status);
      if (isAbort(err)) throw new AiCallError("timeout");
      // A TypeError before any answer: the browser did not let the call out
      // (or there is no connection, which the relay will find as well).
      if (!(err instanceof TypeError)) throw new AiCallError("provider");
      refuseDirect(req.provider);
    }
  }
  const { relayAi } = await importWithRetry(() => import("./relay"));
  let answer;
  try {
    answer = await relayAi({ data: req, signal });
  } catch (err) {
    throw new AiCallError(isAbort(err) ? "timeout" : "network");
  }
  if (answer.ok) return answer.text;
  throw fromStatus(answer.status);
}
