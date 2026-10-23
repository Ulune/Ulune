/**
 * ai-words: [English, French]. Words said only by AI readings' own code (the
 * AI accounts, the ask box, the composers, their failures), kept out of the
 * app's catalog (index.ts) so they load with that code instead of with every
 * page's first download (the first-load trim, 13 Oct 2026; the rest of
 * catalog/ai.ts joined them in the 2.0 fixes, item 3). Read through bookT
 * (src/lib/i18n/words-book.ts); scripts/i18n-catalog.test.mjs holds them to
 * the catalog's rules.
 */
export const aiWords = {
  // Once the app's catalog's (catalog/ai.ts).
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

  aiAccountsBody: [
    "Writing and questions use your own key — Claude, Gemini, Grok or ChatGPT.",
    "La rédaction et les questions utilisent votre propre clé — Claude, Gemini, Grok ou ChatGPT.",
  ],
  aiAccountsTitle: ["Your AI accounts", "Vos comptes IA"],
  aiConnect: ["Save key", "Enregistrer la clé"],
  aiConnected: ["Connected · {last4}", "Connecté · {last4}"],
  aiInvalidKey: [
    "That key looks too short. Paste the whole key.",
    "Cette clé semble trop courte. Collez la clé entière.",
  ],
  aiKeyPlaceholder: ["Paste your API key", "Collez votre clé API"],
  aiRemove: ["Remove", "Retirer"],
  aiSaving: ["Saving…", "Enregistrement…"],
  aiUseThis: ["Use", "Utiliser"],
  aiUsing: ["Using {name}", "IA utilisée\u202f: {name}"],
  aiKeySaveFailed: [
    "Couldn’t save this key. Check it with your provider, then try again.",
    "Impossible d’enregistrer cette clé. Vérifiez-la chez votre fournisseur, puis réessayez.",
  ],
  aiSwitchFailed: ["Couldn’t switch to this AI. Try again.", "Impossible de passer à cette IA. Réessayez."],
  aiRemoveFailed: ["Couldn’t remove this key. Try again.", "Impossible de retirer cette clé. Réessayez."],
  aiKeptTab: [
    "Keys stay in this tab only and go when it closes. Sign in to keep them on this device, encrypted.",
    "Les clés restent dans cet onglet seulement et sont effacées à sa fermeture. Connectez-vous pour les garder sur cet appareil, chiffrées.",
  ],
  aiKeptSpace: [
    "Keys are kept in your private space, encrypted, on this device only.",
    "Les clés sont gardées dans votre espace privé, chiffrées, sur cet appareil seulement.",
  ],
  aiPositionsOnly: [
    "Your AI receives the chart’s positions, never the name, birth date or place.",
    "Votre IA reçoit les positions du thème, jamais le nom, la date ni le lieu de naissance.",
  ],
  aiDirect: [
    "Your key and questions go from this browser to {name} only.",
    "Votre clé et vos questions vont de ce navigateur à {name} seulement.",
  ],
  aiRelayed: [
    "{name} doesn’t answer web pages directly, so Ulune’s server passes your key and question on and keeps nothing.",
    "{name} ne répond pas directement aux pages web\u202f: le serveur d’Ulune transmet votre clé et votre question, sans rien garder.",
  ],
} as const satisfies Record<string, readonly [string, string]>;

export type AiWord = keyof typeof aiWords;
