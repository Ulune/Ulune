/** Live Look type roles from <html>. Pairings rewrite display + sans. */

export async function typeFaces(page) {
  return page.evaluate(() => {
    const first = (v) => v.replace(/['"]/g, "").split(",")[0].trim();
    const cs = getComputedStyle(document.documentElement);
    return {
      display: first(cs.getPropertyValue("--font-display")),
      sans: first(cs.getPropertyValue("--font-sans")),
      mono: first(cs.getPropertyValue("--font-mono")),
    };
  });
}

export function faceInFamily(family, face) {
  if (!family || !face) return false;
  return new RegExp(face.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(family);
}
