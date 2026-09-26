import type { ElementReading, LocalDossier } from "./types";

/*
 * Small, pure helpers on a built dossier. They live apart from the builders
 * (interpret-local.ts) so the studio can use them without loading the
 * reading text.
 */

export function natalRootReading(dossier: LocalDossier | null): ElementReading | null {
  if (!dossier) return null;
  return dossier.byId["planet:sun"] ?? (dossier.order[0] ? (dossier.byId[dossier.order[0]] ?? null) : null);
}

export function mergeGrokIntoDossier(
  dossier: LocalDossier,
  grok: {
    planets?: Record<string, { headline?: string; body?: string; aspects?: string }>;
    houses?: Record<string, { headline?: string; body?: string }>;
    signs?: Record<string, { body?: string }>;
    angles?: Record<string, { headline?: string; body?: string }>;
    aspects?: Record<string, { body?: string }>;
  },
): LocalDossier {
  const next = { ...dossier, byId: { ...dossier.byId } };
  const patch = (id: string, title?: string, paragraphs?: string[]) => {
    const cur = next.byId[id];
    if (!cur) return;
    next.byId[id] = {
      ...cur,
      title: title?.trim() || cur.title,
      paragraphs: paragraphs?.filter(Boolean).length ? paragraphs.filter(Boolean) : cur.paragraphs,
      ai: paragraphs?.filter(Boolean).length ? paragraphs.filter(Boolean) : cur.ai,
    };
  };
  if (grok.planets) {
    for (const [k, v] of Object.entries(grok.planets)) {
      patch(`planet:${k}`, v.headline, [v.body ?? "", v.aspects ?? ""]);
    }
  }
  if (grok.houses) {
    for (const [k, v] of Object.entries(grok.houses)) {
      patch(`house:${k}`, v.headline, [v.body ?? ""]);
    }
  }
  if (grok.signs) {
    for (const [k, v] of Object.entries(grok.signs)) {
      patch(`sign:${k}`, undefined, [v.body ?? ""]);
    }
  }
  if (grok.angles) {
    for (const [k, v] of Object.entries(grok.angles)) {
      patch(`angle:${k}`, v.headline, [v.body ?? ""]);
    }
  }
  if (grok.aspects) {
    for (const [k, v] of Object.entries(grok.aspects)) {
      patch(`aspect:${k}`, undefined, [v.body ?? ""]);
    }
  }
  return next;
}
