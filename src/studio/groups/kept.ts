import type { KeptGroup, NoteRecord } from "@/lib/space/records";

/*
 * The reader's groups of charts and notes on charts, as data (share and
 * compare plan, ideas B5 and B6). They are kept only in the private space,
 * sealed like the charts (lib/space/records.ts: state/groups, note/<id>), and
 * read and written by kept-store.ts. Pure, so the records' rules are tested
 * on their own (scripts/groups-notes.test.mjs): what a record may hold; a
 * group made, renamed, moved and deleted; a chart put in or taken out; the
 * charts a reader forgot leaving every group; a backup's groups and notes
 * joining the space's.
 *
 * Built for the synced account to come (feature 4): a note is a record of
 * its own, so two devices' notes on different charts never meet, and of two
 * on the same chart the later wins (`at`); the groups are one list, joined
 * rather than overwritten (joinGroups), each group keeping when it last
 * changed.
 */

export type { KeptGroup, NoteRecord };

export const GROUP_NAME_MAX = 40;
export const GROUPS_MAX = 24;
export const NOTE_MAX = 2000;
/** An id as Ulune makes them (a UUID; "legacy-…" for charts from before the space), with room to spare. */
const ID_MAX = 128;

/**
 * Never kept: control characters (tab and line feed aside), invisible format
 * marks and the marks that turn the direction of text, as a shared link's
 * names (lib/share/format.ts). Angle brackets stay: a note is plain text,
 * never read as HTML, and "<3" is a note.
 */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u061c\u180e\u200b\u200e\u200f\u2028-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/g;

/** At most `max` UTF-16 units, as a field's maxLength counts them, never half a character. */
function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  const last = text.charCodeAt(max - 1);
  return text.slice(0, last >= 0xd800 && last <= 0xdbff ? max - 1 : max);
}

/** Case and accents aside, as names and searches are compared ("Famille" and "famille" are one group). */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** A group's name as kept: one line, its spaces collapsed, at most 40 characters; "" when nothing is left. */
export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return cut(raw.replace(CONTROL, " ").replace(/\s+/g, " ").trim(), GROUP_NAME_MAX).trim();
}

/** A note's text as kept: plain text, its line ends as \n, at most 2,000 characters. */
export function cleanText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return cut(raw.replace(/\r\n?/g, "\n").replace(CONTROL, ""), NOTE_MAX);
}

const stamp = (at: unknown): number => (typeof at === "number" && Number.isFinite(at) && at > 0 ? at : 0);
const isId = (id: unknown): id is string => typeof id === "string" && id.length > 0 && id.length <= ID_MAX;

/** A note read from a record (the space's, a backup's): null when it holds nothing to keep. */
export function cleanNote(raw: unknown): NoteRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<NoteRecord>;
  const text = cleanText(r.text);
  return text.trim() ? { text, at: stamp(r.at) } : null;
}

/** The groups read from a record (the space's, a backup's): those well formed, each id and each name once, 24 at most. */
export function cleanGroups(raw: unknown): KeptGroup[] {
  const list = raw && typeof raw === "object" ? (raw as { groups?: unknown }).groups : null;
  if (!Array.isArray(list)) return [];
  const out: KeptGroup[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const g of list) {
    if (out.length >= GROUPS_MAX) break;
    if (!g || typeof g !== "object") continue;
    const x = g as Partial<KeptGroup>;
    const name = cleanName(x.name);
    if (!isId(x.id) || ids.has(x.id) || !name || names.has(fold(name))) continue;
    ids.add(x.id);
    names.add(fold(name));
    out.push({ id: x.id, name, members: Array.isArray(x.members) ? [...new Set(x.members.filter(isId))] : [], at: stamp(x.at) });
  }
  return out;
}

export type GroupError = "empty" | "taken" | "full";

/** A new group at the end of the reader's order, or why not. */
export function addGroup(groups: readonly KeptGroup[], rawName: string, id: string, at: number, members: string[] = []): KeptGroup[] | GroupError {
  const name = cleanName(rawName);
  if (!name) return "empty";
  if (groups.some((g) => fold(g.name) === fold(name))) return "taken";
  if (groups.length >= GROUPS_MAX) return "full";
  return [...groups, { id, name, members: [...new Set(members)], at }];
}

/** A group's new name, or why not (another group has it; the same name again changes nothing). */
export function renameGroup(groups: readonly KeptGroup[], id: string, rawName: string, at: number): readonly KeptGroup[] | GroupError {
  const name = cleanName(rawName);
  if (!name) return "empty";
  if (groups.some((g) => g.id !== id && fold(g.name) === fold(name))) return "taken";
  if (groups.some((g) => g.id === id && g.name === name)) return groups;
  return groups.map((g) => (g.id === id ? { ...g, name, at } : g));
}

/** A group moved up (-1) or down (+1) the reader's order; the same list when it can't move. */
export function moveGroup(groups: readonly KeptGroup[], id: string, by: -1 | 1): readonly KeptGroup[] {
  const i = groups.findIndex((g) => g.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= groups.length) return groups;
  const next = [...groups];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** A group deleted: its charts are not touched. */
export function dropGroup(groups: readonly KeptGroup[], id: string): readonly KeptGroup[] {
  return groups.some((g) => g.id === id) ? groups.filter((g) => g.id !== id) : groups;
}

/** A chart put in a group (`inside`) or taken out of it; the same list when it already is where it should be. */
export function setMember(groups: readonly KeptGroup[], groupId: string, chartId: string, inside: boolean, at: number): readonly KeptGroup[] {
  const g = groups.find((x) => x.id === groupId);
  if (!g || g.members.includes(chartId) === inside) return groups;
  const members = inside ? [...g.members, chartId] : g.members.filter((m) => m !== chartId);
  return groups.map((x) => (x === g ? { ...g, members, at } : x));
}

/** The charts a reader forgot leave every group (the groups stay, even empty); the same list when none was in one. */
export function forgetCharts(groups: readonly KeptGroup[], ids: Iterable<string>): readonly KeptGroup[] {
  const gone = new Set(ids);
  if (!gone.size || !groups.some((g) => g.members.some((m) => gone.has(m)))) return groups;
  return groups.map((g) => (g.members.some((m) => gone.has(m)) ? { ...g, members: g.members.filter((m) => !gone.has(m)) } : g));
}

/** Only the space's charts in the groups: one forgotten before the groups were read leaves them then. */
export function keepMembers(groups: readonly KeptGroup[], kept: ReadonlySet<string>): readonly KeptGroup[] {
  return forgetCharts(
    groups,
    groups.flatMap((g) => g.members.filter((m) => !kept.has(m))),
  );
}

/** The groups a chart is in, in the reader's order. */
export function groupsOf(groups: readonly KeptGroup[], chartId: string): KeptGroup[] {
  return groups.filter((g) => g.members.includes(chartId));
}

/**
 * A backup's groups joined to the space's (lib/space/runtime.ts, adding a
 * backup to the space open here): a group with the same id (an older backup
 * of this space) or the same name (another device's) takes the backup's
 * charts too, and the backup's name when it is the same group renamed later;
 * the others come after the reader's own, up to 24. Nothing is ever taken
 * out. The backup's charts are named as this space knows them (`mapId`: a
 * chart id of the backup's to this space's, undefined for one that is not
 * here). Null when nothing changes.
 */
export function joinGroups(
  ours: readonly KeptGroup[],
  theirs: readonly KeptGroup[],
  mapId: (id: string) => string | undefined,
): KeptGroup[] | null {
  const out = ours.map((g) => ({ ...g, members: [...g.members] }));
  let changed = false;
  for (const t of theirs) {
    const members = [...new Set(t.members.map(mapId).filter(isId))];
    const here = out.find((g) => g.id === t.id) ?? out.find((g) => fold(g.name) === fold(t.name));
    if (!here) {
      if (out.length >= GROUPS_MAX) continue;
      out.push({ id: t.id, name: t.name, members, at: t.at });
      changed = true;
      continue;
    }
    const was = here.at;
    let moved = false;
    const named = here.id === t.id && t.at > was && t.name !== here.name;
    if (named && !out.some((g) => g !== here && fold(g.name) === fold(t.name))) {
      here.name = t.name;
      moved = true;
    }
    const adding = members.filter((m) => !here.members.includes(m));
    if (adding.length) {
      here.members.push(...adding);
      moved = true;
    }
    if (moved) {
      here.at = Math.max(was, t.at);
      changed = true;
    }
  }
  return changed ? out : null;
}

/** Whether a backup's note on a chart replaces the space's: there is none here, or an older, different one. */
export function joinsNote(here: NoteRecord | null, theirs: NoteRecord): boolean {
  return !here || (here.at < theirs.at && here.text !== theirs.text);
}

/** Whether a note holds every word typed, case and accents aside (the switcher's search, when it looks in notes). */
export function noteFinds(note: NoteRecord | undefined, query: string): boolean {
  if (!note) return false;
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const text = fold(note.text);
  return words.every((w) => text.includes(w));
}
