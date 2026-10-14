import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { howUluneCalculates, type ChinesePageId, type MethodNote } from "@/lib/chinese/method-notes";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { useI18n } from "@/lib/i18n/locale";

/*
 * The Chinese pages' method notes as they show them (languages plan, part
 * 29; the words and the rules in lib/chinese/method-notes.ts):
 *
 *   - MethodNotes: the notes a birth calls for (hooks/useMethodNotes.ts: born
 *     between 23:00 and 01:00, outside the table's years, a "~" pillar, New
 *     Year moved by the calendar of the time), each a quiet line with an ⓘ as
 *     astrology's under its wheel (.ulune-method-note), set where these pages
 *     read first: the top of the side panel's first read.
 *   - HowUluneCalculates: the language's school and choices, folded at the
 *     end of the first read.
 *
 * Both follow Settings → Chinese traditions live; nothing is sent.
 */

/** The notes, each with its ⓘ; nothing when none applies. */
export function MethodNotes({ notes }: { notes: readonly MethodNote[] }) {
  const { locale } = useI18n();
  if (!notes.length) return null;
  return (
    <div className="ulune-cn-notes">
      {notes.map((n, i) => (
        <p key={`${n.id}-${i}`} className="ulune-method-note" role="note" data-testid="method-note" data-note={n.id}>
          <Info className="ulune-method-note-icon" strokeWidth={1.75} aria-hidden />
          <span>
            {n.lead ? (
              <>
                <b className="ulune-cn-note-lead">{n.lead}</b>
                {" — "}
              </>
            ) : null}
            {n.text}
            {n.settings ? (
              <>
                {" "}
                <Link to="/settings" hash="chinese" className="ob-keep-link" data-testid="method-note-settings">
                  {cnWord(locale, "cnmSettings")}
                </Link>
              </>
            ) : null}
          </span>
        </p>
      ))}
    </div>
  );
}

/** "How Ulune calculates": the page's language, its school and its choices, folded. */
export function HowUluneCalculates({ page }: { page: ChinesePageId }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const how = howUluneCalculates(page, prefs, locale);
  return (
    <details className="ob-rc-about ulune-cn-how" data-testid="method-notes" data-page={page}>
      <summary>{how.title}</summary>
      <ul className="ulune-cn-how-list">
        {how.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </details>
  );
}
