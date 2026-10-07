import { useI18n } from "@/lib/i18n/locale";
import { pickerWord } from "@/studio/shell/picker-words";
import "./language-hint.css";

/**
 * The language button's one-time hint for readers who knew 1.x (page
 * reorganisation plan, R8; lang-hint.ts says who): a small note under the
 * button, pointing at it, saying where the four tabs went. Not a dialog: it
 * takes no focus and covers nothing the reader needs to press; the button
 * names it as its description, so a screen reader hears it with the button,
 * and "Got it" follows the button in the Tab order. Its own download, with
 * its words and its styles, fetched only for the readers it is shown to.
 */
export function LanguageHint({ id, onDone }: { id: string; onDone: () => void }) {
  const { locale } = useI18n();
  return (
    <div className="ob-lang-hint" role="note" aria-labelledby={`${id}-title`} data-testid="lang-hint">
      <p id={`${id}-title`} className="ob-lang-hint-title">
        {pickerWord(locale, "langHintTitle")}
      </p>
      <p id={id} className="ob-lang-hint-body">
        {pickerWord(locale, "langHintBody")}
      </p>
      <button type="button" className="ob-lang-hint-ok" data-testid="lang-hint-ok" onClick={onDone}>
        {pickerWord(locale, "langHintOk")}
      </button>
    </div>
  );
}
