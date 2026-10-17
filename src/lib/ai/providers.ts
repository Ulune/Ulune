export const AI_PROVIDER_IDS = ["claude", "gemini", "grok", "chatgpt"] as const;
export type AiProvider = (typeof AI_PROVIDER_IDS)[number];

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export const AI_PROVIDER_META: Record<
  AiProvider,
  { name: string; hintKey: "aiHintClaude" | "aiHintGemini" | "aiHintGrok" | "aiHintChatgpt"; docs: string }
> = {
  claude: {
    name: "Claude",
    hintKey: "aiHintClaude",
    docs: "https://console.anthropic.com/settings/keys",
  },
  gemini: {
    name: "Gemini",
    hintKey: "aiHintGemini",
    docs: "https://aistudio.google.com/apikey",
  },
  grok: {
    name: "Grok",
    hintKey: "aiHintGrok",
    docs: "https://console.x.ai",
  },
  chatgpt: {
    name: "ChatGPT",
    hintKey: "aiHintChatgpt",
    docs: "https://platform.openai.com/api-keys",
  },
};

export function providerName(id: AiProvider): string {
  return AI_PROVIDER_META[id].name;
}

/*
 * Which provider is called from the page itself, the key and the text reaching
 * it alone, and which goes through Ulune's relay (lib/ai/call.ts). Here rather
 * than in call.ts so that the AI accounts panel, which says which, does not
 * bring the calls into the studio's first download (first-load review, 17 Oct 2026).
 */
const DIRECT: Record<AiProvider, boolean> = {
  claude: true,
  chatgpt: true,
  gemini: true,
  grok: false,
};

/** Providers whose direct call the browser refused this visit: the relay takes over until the page reloads. */
const refused = new Set<AiProvider>();

/** Whether this provider is called from the page itself (no relay). */
export function callsDirectly(provider: AiProvider): boolean {
  return DIRECT[provider] && !refused.has(provider);
}

/** The browser did not let a direct call out: the relay for the rest of the visit. */
export function refuseDirect(provider: AiProvider): void {
  refused.add(provider);
}
