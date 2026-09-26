/** legal: [English, French]. The legal pages' titles and links (lib/legal). */
export const legal = {
  legalAbout: ["About Ulune", "À propos d’Ulune"],
  legalPrivacy: ["Privacy", "Confidentialité"],
  legalNotice: ["Legal notice", "Mentions légales"],
  legalTerms: ["Terms of use", "Conditions d’utilisation"],
  legalCredits: ["Credits", "Crédits"],
  legalAccessibility: ["Accessibility", "Accessibilité"],
  legalNewTab: ["opens in a new tab", "s’ouvre dans un nouvel onglet"],
} as const satisfies Record<string, readonly [string, string]>;
