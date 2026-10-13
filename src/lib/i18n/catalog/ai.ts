/** ai: [English, French]. */
export const ai = {
  aiAccounts: ["Your AI", "Votre IA"],
  aiHintChatgpt: ["OpenAI platform → API keys", "Plateforme OpenAI → clés API"],
  aiHintClaude: ["Anthropic console → API keys", "Console Anthropic → clés API"],
  aiHintGemini: ["Google AI Studio → Get API key", "Google AI Studio → clés API"],
  aiHintGrok: ["xAI console → API keys", "Console xAI → clés API"],
  aiNeedKey: ["Connect one of your AI accounts first.", "Connectez d’abord l’un de vos comptes IA."],
  aiOpenAccounts: ["Connect AI", "Connecter l’IA"],
  aiErrKey: [
    "{name} didn’t accept this key. Check it in your {name} account, then save it again.",
    "{name} n’a pas accepté cette clé. Vérifiez-la dans votre compte {name}, puis enregistrez-la à nouveau.",
  ],
  aiErrLimit: [
    "{name} says this account has reached its limit. Try again later.",
    "{name} indique que ce compte a atteint sa limite. Réessayez plus tard.",
  ],
  aiErrNetwork: [
    "Couldn’t reach {name}. Check the connection, then try again.",
    "Impossible de joindre {name}. Vérifiez la connexion, puis réessayez.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
