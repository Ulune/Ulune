/*
 * The twelve animals as Ulune glyphs (languages plan, part 9): an original
 * set of line drawings, drawn for Ulune in the planet glyphs' language
 * (src/lib/chart/glyph-svg.ts): a 24 × 24 box, one round-capped stroke
 * weight, a few dots for eyes and nostrils, no fills but those. Indexed by
 * the animal's place in the cycle (0 = the Rat … 11 = the Pig), the same as
 * its branch. Pure strings, so the wheel, the cards, the table and the
 * encyclopedia can all draw them; scripts/chinese-glyphs.test.mjs keeps
 * them inside their box and apart from each other.
 */

const ST = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const LT = 'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"';
const dot = (x: number, y: number, r = 0.85) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`;

/** The inner markup of each glyph (paths and dots in a 0 0 24 24 box), by animal. */
export const ANIMAL_GLYPH_INNER: readonly string[] = [
  // 0 · Rat: in profile, facing left: the pointed snout, the round ear, the long tail curling up behind.
  `<path d="M3 15.8C5.6 12 8.6 10.2 12 10.4 15.4 10.6 17.4 13 17.2 15.6 17 17.8 15.2 18.6 13 18.6H8C6 18.6 4.4 17.4 3 15.8Z" ${ST}/><path d="M7.6 11.6C6.8 9.6 7.8 7.6 9.6 7.6 11.2 7.6 12 9 11.6 10.6" ${ST}/><path d="M17 16.8C19.6 17.6 21.2 15.6 20.8 13.2 20.4 11.2 18.6 11.4 18.8 12.8" ${ST}/>${dot(6.8, 14.4)}`,
  // 1 · Ox: from the front: the horns sweeping up and out, the long head, the nostrils.
  `<path d="M8 9.4C5 9.2 3.4 7.2 3.8 4.4M16 9.4C19 9.2 20.6 7.2 20.2 4.4" ${ST}/><path d="M8 9.4H16C16.4 13.4 15.8 16.6 15 18.6 14.4 20 13.4 20.6 12 20.6S9.6 20 9 18.6C8.2 16.6 7.6 13.4 8 9.4Z" ${ST}/><path d="M8 11.4 5.4 12.6M16 11.4 18.6 12.6" ${ST}/>${dot(10.7, 17.6, 0.75)}${dot(13.3, 17.6, 0.75)}`,
  // 2 · Tiger: from the front: the round ears, the broad head, the three stripes on the brow.
  `<path d="M5.4 12C5.4 7.6 8.4 5.4 12 5.4S18.6 7.6 18.6 12C18.6 16.8 15.6 19.8 12 19.8S5.4 16.8 5.4 12Z" ${ST}/><path d="M6.6 8.2C5.2 7.4 5.2 5 7.2 4.6 8.2 4.4 9 4.8 9.4 5.6M17.4 8.2C18.8 7.4 18.8 5 16.8 4.6 15.8 4.4 15 4.8 14.6 5.6" ${ST}/><path d="M10.2 7.8H13.8M12 7.8V10.2M10.4 10.2H13.6" ${LT}/><path d="M5.6 11.6 7.6 12.2M5.8 14.4 7.6 14M18.4 11.6 16.4 12.2M18.2 14.4 16.4 14" ${LT}/><path d="M10.6 14.8H13.4L12 16.2Z" ${LT}/>${dot(9.4, 12.4)}${dot(14.6, 12.4)}`,
  // 3 · Rabbit: from the front: the two long ears, the round head.
  `<ellipse cx="9.6" cy="7.2" rx="1.6" ry="4.1" transform="rotate(-12 9.6 7.2)" ${ST}/><ellipse cx="14.4" cy="7.2" rx="1.6" ry="4.1" transform="rotate(12 14.4 7.2)" ${ST}/><circle cx="12" cy="15.6" r="4.8" ${ST}/>${dot(10.2, 15, 0.75)}${dot(13.8, 15, 0.75)}`,
  // 4 · Dragon: the head facing left, a horn swept back, a whisker, the body coiling below with its crest.
  `<path d="M12.6 5.6C11.4 4.4 9.4 4.2 8.2 5.4L3.8 6.4C2.8 6.6 2.8 8.6 3.8 8.8L8.4 9.8C10 10.2 11.6 9.6 12.6 8.4" ${ST}/><path d="M10.6 4.8C10.8 3.2 11.8 2.4 13.4 2.2M11.8 2.8 13.4 4.4" ${LT}/><path d="M12.6 5.6C17 7.4 19 11.6 16.6 14.4 14.4 17 9.2 15 7.8 17.6 6.8 19.4 8.8 21 12 20.6 15 20.2 18.4 19.6 20.6 17.4" ${ST}/><path d="M16.6 6.8 17.8 5.6M18.6 9.4 20.2 8.8" ${LT}/><path d="M3.8 8.8C3.4 10.6 4.4 12 5.8 11.8" ${LT}/>${dot(8.8, 6.9, 0.7)}`,
  // 5 · Snake: the head and its forked tongue at the top, the body in an S below.
  `<ellipse cx="15.6" cy="5.4" rx="2.4" ry="1.7" ${ST}/><path d="M18 5.4 19.8 4.6M18 5.4 19.8 6.4" ${LT}/><path d="M13.4 6.2C9.4 6.8 7 8.6 8 10.8 9 13 15.6 12.2 16.8 14.8 18 17.6 13.8 19.8 9.6 19.6 7.6 19.5 6 18.8 5 17.8" ${ST}/>`,
  // 6 · Horse: the head and neck in profile, facing left: the pricked ear, the long face, the mane.
  `<path d="M16.6 20.6C17.4 14.6 16.8 9.2 13.8 5.8L14.4 3.4 12.4 5C9.6 5.4 7.4 8.2 5.2 12.2 4.6 13.4 5.2 14.6 6.4 14.6 8 14.6 9.4 13.8 10.6 13.2 11.2 15.6 10.2 18.2 8.8 20.6" ${ST}/><path d="M15.8 7.2 17.8 8M16.6 10.2 18.6 10.8M17 13.2 19 13.6" ${LT}/>${dot(10.6, 8.6, 0.75)}`,
  // 7 · Goat: from the front: the horns curling back, the narrow face, the beard.
  `<path d="M9.6 8.8C8.6 5.4 4.8 4.4 4 7.2 3.4 9.4 5.8 10.2 6.8 8.8M14.4 8.8C15.4 5.4 19.2 4.4 20 7.2 20.6 9.4 18.2 10.2 17.2 8.8" ${ST}/><path d="M9.4 8.6H14.6C15 12.6 14.2 16.4 12 18.8 9.8 16.4 9 12.6 9.4 8.6Z" ${ST}/><path d="M11 18.2 12 21.4 13 18.2" ${LT}/>${dot(10.9, 12, 0.75)}${dot(13.1, 12, 0.75)}`,
  // 8 · Monkey: from the front: the ears standing out, the heart-shaped face.
  `<circle cx="12" cy="12.6" r="7" ${ST}/><path d="M5.2 10.8C3 10.6 2.6 14.4 5.2 14.6M18.8 10.8C21 10.6 21.4 14.4 18.8 14.6" ${ST}/><path d="M12 10.6C10.6 9 7.8 9.6 8 12.2 8.2 15.8 10.4 17.6 12 17.6S15.8 15.8 16 12.2C16.2 9.6 13.4 9 12 10.6Z" ${LT}/>${dot(10.4, 12.4, 0.75)}${dot(13.6, 12.4, 0.75)}`,
  // 9 · Rooster: in profile, facing left: the comb, the beak, the wattle, the tail raised high.
  `<path d="M6.2 9.6C5.4 9 5.4 7.6 5.8 6.6 6.4 5.2 8.4 4.8 9.6 5.8 10.4 6.6 10.6 8.2 10.4 9.4 12 11 14.4 10.8 16 8.4 17 6.6 18 4.8 19.8 4.6 20.2 8.2 19.6 13.4 17.2 15.6 15 17.8 11.6 18 9.4 16.8 7 15.4 6 12.8 6.2 9.6Z" ${ST}/><path d="M6.4 5.4C5.8 3.6 7.4 2.8 8 4.2 8.4 2.8 10.2 3 10 4.6 11 4.4 11.6 5.6 10.6 6.4" ${LT}/><path d="M5.6 7.2 3.6 8.2 5.8 8.8" ${LT}/><path d="M17.4 7.2C18.4 9.4 18.2 11.8 16.8 13.6" ${LT}/><path d="M12.4 17.8V20.8M15 17.2V20.8" ${ST}/>${dot(7.8, 7.4, 0.7)}`,
  // 10 · Dog: from the front: the soft ears falling, the nose, the mouth.
  `<path d="M7.6 8.2C8.6 5.8 10.2 5 12 5S15.4 5.8 16.4 8.2C17.2 10.4 17.2 13.8 16.2 16.2 15.2 18.6 13.6 19.6 12 19.6S8.8 18.6 7.8 16.2C6.8 13.8 6.8 10.4 7.6 8.2Z" ${ST}/><path d="M8.6 6.6C5.8 5.2 3.4 7.4 3.8 11.2 4 13.4 5.6 14.2 7 13M15.4 6.6C18.2 5.2 20.6 7.4 20.2 11.2 20 13.4 18.4 14.2 17 13" ${ST}/><ellipse cx="12" cy="14.8" rx="1.5" ry="1.05" fill="currentColor"/><path d="M12 15.8V17M10.6 17.4C11.4 17.9 12 17.6 12 17 12 17.6 12.6 17.9 13.4 17.4" ${LT}/>${dot(10, 11, 0.75)}${dot(14, 11, 0.75)}`,
  // 11 · Pig: from the front: the pointed ears, the round head, the snout and its nostrils.
  `<circle cx="12" cy="13" r="7" ${ST}/><path d="M6.8 8.2 5.8 3.8 10 6.2M17.2 8.2 18.2 3.8 14 6.2" ${ST}/><ellipse cx="12" cy="15" rx="3" ry="2.2" ${ST}/>${dot(11, 15, 0.7)}${dot(13, 15, 0.7)}${dot(9.4, 11, 0.75)}${dot(14.6, 11, 0.75)}`,
];

/** A glyph as a whole SVG document (for a sheet, a figure, a download). */
export function animalGlyphSvg(animal: number): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${ANIMAL_GLYPH_INNER[((animal % 12) + 12) % 12]}</svg>`;
}
