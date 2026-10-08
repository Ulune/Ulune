import { useEffect, useRef, useState } from "react";
import { dateFormat } from "@/lib/intl-cache";
import { openSpaceSheet, useSpace } from "@/lib/space/state";
import { EncLink } from "./frame";
import { clearRecent, loadKeep, NOTE_MAX, noteRead, saveNote, toggleBookmark, useKeep, type KeptPage } from "./keep";
import { tr } from "./words";
import type { Lang, PageData } from "./types";

/*
 * The reader's own encyclopedia (encyclopedia plan, part 20), its own
 * download after the page is drawn (KeepSlot in EntryPage.tsx and
 * HomePage.tsx): on a page, Bookmark and a note of the reader's own; on the
 * encyclopedia's home, the pages kept, the notes and the pages recently
 * read. Kept sealed in the private space (keep.ts); without one open, the
 * buttons say so and offer the way in.
 */

function day(lang: Lang, at: number): string {
  return dateFormat(lang === "en" ? "en-GB" : "fr", { day: "numeric", month: "long", year: "numeric" }).format(new Date(at));
}

/** Without an open space: one line saying where these are kept, and the way in. */
function NeedSpace({ lang }: { lang: Lang }) {
  const status = useSpace((s) => s.status);
  if (status === "unavailable") return <p className="ob-enc-keep-need">{tr(lang, "encKeepUnavailable")}</p>;
  const locked = status === "locked";
  return (
    <p className="ob-enc-keep-need" data-testid="enc-keep-need">
      {tr(lang, "encKeepNeedSpace")}{" "}
      <button type="button" className="ob-enc-keep-link" onClick={() => openSpaceSheet(locked ? "unlock" : "create")} data-testid="enc-keep-way-in">
        {tr(lang, locked ? "encKeepUnlock" : "encKeepSignIn")}
      </button>
    </p>
  );
}

function NoteEditor({ page, onDone }: { page: PageData; onDone: () => void }) {
  const lang = page.lang;
  const note = useKeep((s) => s.notes[page.id]);
  const [text, setText] = useState(note?.text ?? "");
  const [saved, setSaved] = useState<number | null>(note?.at ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(text);
  latest.current = text;
  const save = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (await saveNote(page, latest.current)) setSaved(latest.current.trim() ? Date.now() : null);
  };
  // Saved as it is written, a moment after the last key, and when the field is left.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void saveNote(page, latest.current);
      }
    },
    [page],
  );
  return (
    <div className="ob-enc-note" data-testid="enc-note">
      <label className="ob-enc-note-label" htmlFor="enc-note-text">
        {tr(lang, "encKeepYourNote")}
      </label>
      <textarea
        id="enc-note-text"
        className="ob-enc-note-text"
        value={text}
        maxLength={NOTE_MAX}
        rows={4}
        placeholder={tr(lang, "encKeepNotePlaceholder")}
        onChange={(e) => {
          setText(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void save(), 700);
        }}
        onBlur={() => void save()}
        data-testid="enc-note-text"
      />
      <div className="ob-enc-note-foot">
        <span className="ob-enc-note-status" aria-live="polite" data-testid="enc-note-status">
          {saved ? tr(lang, "encKeepNoteSaved", { date: day(lang, saved) }) : tr(lang, "encKeepNoteHint")}
        </span>
        {note ? (
          <button
            type="button"
            className="ob-enc-keep-link"
            onClick={() => {
              setText("");
              latest.current = "";
              void save().then(onDone);
            }}
            data-testid="enc-note-delete"
          >
            {tr(lang, "encKeepNoteDelete")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A page's Bookmark and note; the page is noted as read. */
export function PageKeep({ page }: { page: PageData }) {
  const lang = page.lang;
  const where = useKeep((s) => s.where);
  const marked = useKeep((s) => s.bookmarks.some((b) => b.id === page.id));
  const hasNote = useKeep((s) => Boolean(s.notes[page.id]));
  const [writing, setWriting] = useState(false);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    void noteRead(page);
    setWriting(false);
    setAsked(false);
  }, [page]);
  const open = where === "space";
  return (
    <div className="ob-enc-keep" data-testid="enc-keep">
      <div className="ob-enc-keep-bar">
        <button
          type="button"
          className="ob-enc-keep-button"
          aria-pressed={open ? marked : undefined}
          onClick={() => (open ? void toggleBookmark(page) : setAsked(true))}
          data-testid="enc-bookmark"
        >
          <span aria-hidden="true">{marked ? "★" : "☆"}</span> {tr(lang, marked ? "encKeepBookmarked" : "encKeepBookmark")}
        </button>
        {hasNote && !writing ? null : (
          <button
            type="button"
            className="ob-enc-keep-button"
            aria-expanded={open ? writing : undefined}
            onClick={() => (open ? setWriting(!writing) : setAsked(true))}
            data-testid="enc-note-add"
          >
            <span aria-hidden="true">✎</span> {tr(lang, writing ? "encKeepNoteClose" : "encKeepNoteAdd")}
          </button>
        )}
      </div>
      {!open && asked ? <NeedSpace lang={lang} /> : null}
      {open && (writing || hasNote) ? <NoteEditor key={page.id} page={page} onDone={() => setWriting(false)} /> : null}
    </div>
  );
}

function List({ pages, lang, testId, note }: { pages: KeptPage[]; lang: Lang; testId: string; note?: (p: KeptPage) => string | null }) {
  return (
    <ul className="ob-enc-shelf-list" data-testid={testId}>
      {pages.map((p) => (
        <li key={p.id} data-entry={p.id}>
          <EncLink to={lang} slug={p.slug[lang]} className="ob-enc-compact-link">
            {p.title[lang]}
          </EncLink>
          {note?.(p) ? <span className="ob-enc-shelf-note"> — {note(p)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** The home's shelf: the pages kept, the notes, the pages recently read. */
export function Shelf({ lang }: { lang: Lang }) {
  const keep = useKeep();
  useEffect(() => {
    void loadKeep();
  }, []);
  const notes = Object.values(keep.notes).sort((a, b) => b.at - a.at);
  if (!keep.ready || (!keep.bookmarks.length && !notes.length && !keep.recent.length)) return null;
  const firstLine = (t: string) => {
    const line = t.trim().split("\n")[0] ?? "";
    return line.length > 90 ? `${line.slice(0, 88)}…` : line;
  };
  return (
    <section className="ob-enc-shelf" aria-labelledby="h-shelf" data-testid="enc-shelf">
      <h2 id="h-shelf" className="ob-enc-h2">
        {tr(lang, "encShelf")}
      </h2>
      {keep.bookmarks.length ? (
        <div className="ob-enc-shelf-group">
          <h3 className="ob-enc-mine-h3">{tr(lang, "encShelfBookmarks")}</h3>
          <List pages={keep.bookmarks} lang={lang} testId="enc-shelf-bookmarks" />
        </div>
      ) : null}
      {notes.length ? (
        <div className="ob-enc-shelf-group">
          <h3 className="ob-enc-mine-h3">{tr(lang, "encShelfNotes")}</h3>
          <List pages={notes.map((n) => n.page)} lang={lang} testId="enc-shelf-notes" note={(p) => firstLine(keep.notes[p.id]?.text ?? "")} />
        </div>
      ) : null}
      {keep.recent.length ? (
        <div className="ob-enc-shelf-group">
          <div className="ob-enc-shelf-head">
            <h3 className="ob-enc-mine-h3">{tr(lang, "encShelfRecent")}</h3>
            <button type="button" className="ob-enc-keep-link" onClick={() => void clearRecent()} data-testid="enc-shelf-clear">
              {tr(lang, "encShelfClear")}
            </button>
          </div>
          <List pages={keep.recent.slice(0, 10)} lang={lang} testId="enc-shelf-recent" />
          {keep.where === "tab" ? <p className="ob-enc-mine-note">{tr(lang, "encShelfTabOnly")}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
