import { CalendarPlus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { dateFormat, numberFormat } from "@/lib/intl-cache";
import { NOTE_MAX } from "./kept";
import { loadKept, saveNote, useKept } from "./kept-store";
import { useKeptWords } from "./kept-words";
import { TagChips } from "./picker-groups";
import "./groups.css";

/*
 * The notes on a chart and its groups, in the Birth tab (share and compare
 * plan, ideas B6 and B5), with the private space open (chart-kept.tsx says
 * where they are kept otherwise). A few lines of plain text, up to 2,000
 * characters, sealed a moment after the last key (and when the field is
 * left), with a button to begin a line with today's date. Never sent: not in
 * a share link, an export or a copied summary; the browser's spelling check
 * is off in the field, so no enhanced spelling service is handed the text.
 * Under it, the chart's groups to tick, or a first one to make.
 */

/** How long after the last key a note is sealed. */
const SEAL_MS = 700;
/** The count of characters shows from here. */
const COUNT_FROM = NOTE_MAX - 200;

export function NoteField({ id, name }: { id: string; name: string }) {
  const ready = useKept((s) => s.ready);
  useEffect(() => void loadKept(), []);
  if (!ready) return null;
  // Another chart: its own note, from the start.
  return <NoteEditor key={id} id={id} name={name} />;
}

function NoteEditor({ id, name }: { id: string; name: string }) {
  const { locale } = useI18n();
  const T = useKeptWords();
  const lang = locale === "fr" ? "fr" : "en-GB";
  // The note as the field opens; the field's text is the note from then on.
  const [kept] = useState(() => useKept.getState().notes[id]);
  const [text, setText] = useState(kept?.text ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(kept?.at || null);
  const field = useRef<HTMLTextAreaElement>(null);
  const latest = useRef(text);
  const dirty = useRef(false);
  const timer = useRef(0);
  const headId = useId();
  const fieldId = useId();
  const hintId = useId();
  const statusId = useId();
  const groupsId = useId();

  const save = async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    const value = latest.current;
    if (await saveNote(id, value)) setSavedAt(value.trim() ? Date.now() : null);
  };
  const change = (next: string) => {
    setText(next);
    latest.current = next;
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SEAL_MS);
  };
  // What waits to be sealed is sealed as the field goes (another chart, another tab of the panel).
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (dirty.current) void saveNote(id, latest.current);
    },
    [id],
  );

  /** Today's date at the start of a line, where the caret is ("18 Oct 2026 — "). */
  const stamp = () => {
    const el = field.current;
    const from = el?.selectionStart ?? text.length;
    const to = el?.selectionEnd ?? from;
    const before = text.slice(0, from);
    const line = `${before && !before.endsWith("\n") ? "\n" : ""}${dateFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date())} — `;
    const next = before + line + text.slice(to);
    if (next.length > NOTE_MAX) return;
    change(next);
    const caret = before.length + line.length;
    window.requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const status = !savedAt
    ? ""
    : new Date(savedAt).toDateString() === new Date().toDateString()
      ? T("keptNotesSavedAt", { time: dateFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(new Date(savedAt)) })
      : T("keptNotesSavedOn", { date: dateFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(new Date(savedAt)) });
  const count = (n: number) => numberFormat(lang, {}).format(n);

  return (
    <section className="ob-kept-note" aria-labelledby={headId} data-testid="chart-notes" data-state="open">
      <div className="ob-kept-note-head">
        <h3 id={headId} className="ulune-kicker text-fg-muted">
          <label htmlFor={fieldId}>{T("keptNotes")}</label>
        </h3>
        <button type="button" className="ob-kept-stamp" data-testid="notes-stamp" title={T("keptNotesStampLabel")} aria-label={T("keptNotesStampLabel")} onClick={stamp}>
          <CalendarPlus className="size-4" strokeWidth={1.75} aria-hidden />
          {T("keptNotesStamp")}
        </button>
      </div>
      <textarea
        ref={field}
        id={fieldId}
        className="ob-kept-note-text"
        data-testid="notes-text"
        value={text}
        rows={4}
        maxLength={NOTE_MAX}
        placeholder={T("keptNotesPlaceholder")}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={`${hintId} ${statusId}`}
        onChange={(e) => change(e.target.value)}
        onBlur={() => void save()}
      />
      <p className="ob-kept-note-foot">
        <span id={statusId} aria-live="polite" data-testid="notes-status">
          {status}
        </span>
        {text.length >= COUNT_FROM ? (
          <span className="ob-kept-note-count" data-full={text.length >= NOTE_MAX ? "" : undefined} data-testid="notes-count">
            {T("keptNotesCount", { n: count(text.length), max: count(NOTE_MAX) })}
          </span>
        ) : null}
      </p>
      <p id={hintId} className="ob-kept-note-hint">
        {T("keptNotesHint")}
      </p>
      <div className="ob-kept-note-groups">
        <h3 id={groupsId} className="ulune-kicker text-fg-muted">
          {T("keptGroups")}
        </h3>
        <TagChips chartId={id} label={T("keptTagFor", { name })} testId="notes-groups" />
      </div>
    </section>
  );
}
