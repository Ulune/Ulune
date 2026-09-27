import type { CatalogKey } from "@/lib/i18n/catalog";

export type LegalPath = "/privacy" | "/legal" | "/terms" | "/credits" | "/accessibility";

/** The legal pages, in the order links show them (the legal pages' own list, Settings, the site's footer). */
export const LEGAL_LINKS: { to: LegalPath; label: CatalogKey; id: string }[] = [
  { to: "/privacy", label: "legalPrivacy", id: "privacy" },
  { to: "/legal", label: "legalNotice", id: "legal" },
  { to: "/terms", label: "legalTerms", id: "terms" },
  { to: "/credits", label: "legalCredits", id: "credits" },
  { to: "/accessibility", label: "legalAccessibility", id: "accessibility" },
];
