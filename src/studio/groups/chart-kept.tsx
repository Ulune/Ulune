import { Suspense, useId } from "react";
import { groupsNeedWords } from "@/lib/i18n/catalog/groups-need-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { lazyNamed } from "@/lib/lazy-component";
import { useSpace } from "@/lib/space/state";
import { NeedLine } from "./need-line";

/** The notes' field and the chart's groups: their own download, with their style sheet, once a space is open. */
const NoteField = lazyNamed(() => import("./note-field"), "NoteField");

/*
 * The Birth tab's Notes (share and compare plan, idea B6), under the form of
 * a chart that is kept: fetched once the page is idle (studio/dock/BirthTab.tsx).
 * With the private space open, the notes' field and the chart's groups
 * (note-field.tsx); otherwise one quiet line saying they are kept only there,
 * with the way in (need-line.tsx). Nothing here has a style sheet of its own.
 */
export function ChartKept({ id, name }: { id: string; name: string }) {
  const { t, locale } = useI18n();
  const status = useSpace((s) => s.status);
  const headId = useId();
  if (status === "checking") return null;
  if (status === "open") {
    return (
      <Suspense fallback={null}>
        <NoteField id={id} name={name} />
      </Suspense>
    );
  }
  return (
    <section aria-labelledby={headId} data-testid="chart-notes" data-state="need">
      <h3 id={headId} className="ulune-kicker text-fg-muted">
        {bookT(groupsNeedWords, t, locale)("keptNotes")}
      </h3>
      <NeedLine status={status} what="notes" testId="notes-need" />
    </section>
  );
}
