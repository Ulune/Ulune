/*
 * Running text with its encyclopedia words found (encyclopedia plan, part
 * 16): a reading's paragraph, matched against its tradition's lexicon
 * (scripts/encyclopedia/lexicon.mjs). Each entry links once per paragraph,
 * at its first mention; the entries a reading is about link nowhere in it
 * (its "In the encyclopedia" section names them). Pure: the reading card
 * and the review script (scripts/encyclopedia/link-review.mjs) share it.
 */

/** [form, entry id, slug]; an empty id keeps the form plain (a Chinese term's name not written yet that holds another's, as "Travelling Horse" holds "Horse"). */
export type LexiconRow = [string, string, string];

export type Linked = { text: string; id?: string; slug?: string };

export type Matcher = { re: RegExp; byForm: Map<string, LexiconRow> };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One regular expression for a lexicon (its forms longest first), whole words only; French elision allowed (« l’Ascendant »). */
export function compileLexicon(rows: readonly LexiconRow[]): Matcher | null {
  if (!rows.length) return null;
  const byForm = new Map<string, LexiconRow>();
  const alts: string[] = [];
  for (const row of rows) {
    byForm.set(row[0], row);
    alts.push(escape(row[0]));
  }
  return { re: new RegExp(`(?<![\\p{L}\\p{N}-])(?:${alts.join("|")})(?![\\p{L}\\p{N}-])`, "gu"), byForm };
}

/** A paragraph cut into plain pieces and linked words. */
export function linkText(text: string, m: Matcher | null, exclude: ReadonlySet<string> = new Set()): Linked[] {
  if (!m || !text) return [{ text }];
  const out: Linked[] = [];
  const done = new Set<string>();
  let last = 0;
  m.re.lastIndex = 0;
  for (let hit = m.re.exec(text); hit; hit = m.re.exec(text)) {
    const row = m.byForm.get(hit[0]);
    if (!row || !row[1] || exclude.has(row[1]) || done.has(row[1])) continue;
    done.add(row[1]);
    if (hit.index > last) out.push({ text: text.slice(last, hit.index) });
    out.push({ text: hit[0], id: row[1], slug: row[2] });
    last = hit.index + hit[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
