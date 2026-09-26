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
