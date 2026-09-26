import type { AiProvider } from "./providers";

/*
 * One chat completion from the reader's own AI account, with the reader's own
 * key. The same code runs in the browser, which calls the provider directly
 * where the provider allows it (lib/ai/call.ts), and in Ulune's relay for the
 * others (lib/ai/relay.ts). Nothing here keeps or logs the key or the text.
 */

export class AiHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AiHttpError";
    this.status = status;
  }
}

export type ChatRequest = {
  provider: AiProvider;
  apiKey: string;
  system: string;
  user: string;
  maxTokens: number;
  timeoutMs: number;
};

/** `browser`: sent from the page, which Anthropic asks to be said out loud. */
export async function completeChat(opts: ChatRequest, from: "browser" | "server" = "server", outer?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const onOuter = () => controller.abort();
  outer?.addEventListener("abort", onOuter);
  try {
    if (opts.provider === "claude") return await callClaude(opts, controller.signal, from);
    if (opts.provider === "gemini") return await callGemini(opts, controller.signal);
    return await callOpenAiCompat(opts, controller.signal);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuter);
  }
}

/** The provider's own words on a refusal, short, and never the key. */
function errorText(raw: string, apiKey: string): string {
  return raw.slice(0, 220).split(apiKey).join("…");
}

async function callOpenAiCompat(opts: ChatRequest, signal: AbortSignal): Promise<string> {
  const grok = opts.provider === "grok";
  const url = grok ? "https://api.x.ai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = grok ? "grok-4.5" : "gpt-4o";
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };
  if (grok) body.reasoning_effort = "low";
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) throw new AiHttpError(res.status, errorText(raw, opts.apiKey));
  const parsed = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] };
  return parsed.choices?.[0]?.message?.content ?? "";
}

async function callClaude(opts: ChatRequest, signal: AbortSignal, from: "browser" | "server"): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": opts.apiKey,
    "anthropic-version": "2023-06-01",
  };
  // Anthropic answers pages directly once they say so: the key is the
  // reader's own, typed into this page, so there is no one to hide it from.
  if (from === "browser") headers["anthropic-dangerous-direct-browser-access"] = "true";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) throw new AiHttpError(res.status, errorText(raw, opts.apiKey));
  const parsed = JSON.parse(raw) as { content?: { type?: string; text?: string }[] };
  return (parsed.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n\n");
}

async function callGemini(opts: ChatRequest, signal: AbortSignal): Promise<string> {
  // The key in a header, not the address, so it is in no log of addresses.
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.user }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens },
      }),
    },
  );
  const raw = await res.text().catch(() => "");
  if (!res.ok) throw new AiHttpError(res.status, errorText(raw, opts.apiKey));
  const parsed = JSON.parse(raw) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (parsed.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
}
