import { GLOSSARY_ORDER, glossaryBody, glossaryFor, glossaryTerm, type GlossaryId } from "@/lib/i18n/glossary";
import { useI18n } from "@/lib/i18n/locale";
import { Term } from "@/encyclopedia/Term";

/** A glossary word's entry in the encyclopedia: its id, in kebab case (lifePath → life-path). */
const entryOf = (id: GlossaryId) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Some of the glossary's words, each with its sentence or two (a table part's "Words used here"). */
export function GlossaryTerms({ ids }: { ids: GlossaryId[] }) {
  return <Terms ids={ids} />;
}

function Terms({ ids }: { ids: GlossaryId[] }) {
  const { locale } = useI18n();
  return (
    <dl className="ob-glossary-dl">
      {ids.map((id) => (
        <div key={id} className="ob-glossary-item" data-term={id}>
          <dt>
            <Term id={entryOf(id)}>{glossaryTerm(id, locale)}</Term>
          </dt>
          <dd>{glossaryBody(id, locale)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The glossary's words: those the open reading uses first, then the others
 * (all of them, in order, when `all`). Its own download, opened on demand.
 */
export function GlossaryList({ page, selectedId, all = false }: { page: string; selectedId: string | null; all?: boolean }) {
  const { t } = useI18n();
  const here = all ? [] : glossaryFor(page, selectedId);
  const rest = GLOSSARY_ORDER.filter((id) => !here.includes(id));
  return (
    <div className="ob-glossary-body">
      {here.length ? (
        <>
          <h3 className="ob-glossary-h">{t("glossaryHere")}</h3>
          <Terms ids={here} />
          <h3 className="ob-glossary-h">{t("glossaryOther")}</h3>
        </>
      ) : null}
      <Terms ids={rest} />
    </div>
  );
}
