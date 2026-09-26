/** ai: [English, French]. */
export const ai = {
  aiAccounts: ["Your AI", "Votre IA"],
  aiAccountsBody: [
    "Writing and questions use your own key — Claude, Gemini, Grok or ChatGPT.",
    "La rédaction et les questions utilisent votre propre clé — Claude, Gemini, Grok ou ChatGPT.",
  ],
  aiAccountsTitle: ["Your AI accounts", "Vos comptes IA"],
  aiConnect: ["Save key", "Enregistrer la clé"],
  aiConnected: ["Connected · {last4}", "Connecté · {last4}"],
  aiHintChatgpt: ["OpenAI platform → API keys", "Plateforme OpenAI → clés API"],
  aiHintClaude: ["Anthropic console → API keys", "Console Anthropic → clés API"],
  aiHintGemini: ["Google AI Studio → Get API key", "Google AI Studio → clés API"],
  aiHintGrok: ["xAI console → API keys", "Console xAI → clés API"],
  aiInvalidKey: [
    "That key looks too short. Paste the full secret.",
    "Cette clé est trop courte. Collez le secret entier.",
  ],
  aiKeyPlaceholder: ["Paste your API key", "Collez votre clé API"],
  aiNeedKey: ["Connect one of your AI accounts first.", "Connectez d’abord l’un de vos comptes IA."],
  aiOpenAccounts: ["Connect AI", "Connecter l’IA"],
  aiRemove: ["Remove", "Retirer"],
  aiSaving: ["Saving…", "Enregistrement…"],
  aiUseThis: ["Use", "Utiliser"],
  aiUsing: ["Using {name}", "En cours : {name}"],
  aiKeySaveFailed: [
    "Couldn’t save this key. Check it with your provider, then try again.",
    "Impossible d’enregistrer cette clé. Vérifiez-la chez votre fournisseur, puis réessayez.",
  ],
  aiSwitchFailed: ["Couldn’t switch to this AI. Try again.", "Impossible de passer à cette IA. Réessayez."],
  aiRemoveFailed: ["Couldn’t remove this key. Try again.", "Impossible de retirer cette clé. Réessayez."],
  aiKeptTab: [
    "Keys stay in this tab only and go when it closes. Sign in to keep them on this device, encrypted.",
    "Les clés restent dans cet onglet seulement et partent à sa fermeture. Connectez-vous pour les garder sur cet appareil, chiffrées.",
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
    "{name} ne répond pas directement aux pages web : le serveur d’Ulune transmet votre clé et votre question, sans rien garder.",
  ],
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
