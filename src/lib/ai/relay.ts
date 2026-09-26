import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/*
 * Ulune's relay to an AI provider whose API does not answer pages directly
 * (lib/ai/call.ts). The reader's key and the prompt pass through, once: the
 * relay keeps nothing, writes nothing to its logs, and can reach only the
 * four providers' chat endpoints (lib/ai/chat.ts).
 */

const relaySchema = z.object({
  provider: z.enum(["claude", "gemini", "grok", "chatgpt"]),
  apiKey: z.string().min(8).max(400),
  system: z.string().max(12_000),
  user: z.string().max(40_000),
  maxTokens: z.number().int().min(64).max(4200),
  timeoutMs: z.number().int().min(1000).max(85_000),
});

export type RelayAnswer = { ok: true; text: string } | { ok: false; status: number; message: string };

export const relayAi = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof relaySchema>) => relaySchema.parse(input))
  .handler(async ({ data }): Promise<RelayAnswer> => {
    const { AiHttpError, completeChat } = await import("./chat");
    try {
      return { ok: true, text: await completeChat(data, "server") };
    } catch (err) {
      if (err instanceof AiHttpError) return { ok: false, status: err.status, message: err.message };
      const aborted = err instanceof Error && (err.name === "AbortError" || /aborted/i.test(err.message));
      return { ok: false, status: aborted ? 504 : 502, message: aborted ? "timeout" : "unreachable" };
    }
  });
