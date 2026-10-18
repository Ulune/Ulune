import { groupsNeedWords } from "@/lib/i18n/catalog/groups-need-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { openSpaceSheet, type SpaceStatus } from "@/lib/space/state";

/*
 * Groups of charts and notes on charts are kept only in the private space
 * (share and compare plan, ideas B5 and B6): while none is open, where they
 * are offered (the switcher's Groups row, the Birth tab's Notes) one quiet
 * line says so, its first words the way in ("Create your private space to
 * sort your charts into groups."). The space's own classes (.ob-keep, under
 * a chart): nothing of this needs a style sheet of its own, so it costs
 * nothing to readers who never open it.
 */

export function NeedLine({ status, what, testId }: { status: SpaceStatus; what: "groups" | "notes"; testId: string }) {
  const { t, locale } = useI18n();
  const T = bookT(groupsNeedWords, t, locale);
  if (status === "unavailable") {
    return (
      <p className="ob-keep" data-testid={testId} data-need="unavailable">
        {T("keptUnavailable")}
      </p>
    );
  }
  const locked = status === "locked";
  const line = T(locked ? (what === "groups" ? "keptLockedGroups" : "keptLockedNotes") : what === "groups" ? "keptNeedGroups" : "keptNeedNotes");
  const slot = locked ? "{unlock}" : "{create}";
  const at = line.indexOf(slot);
  return (
    <p className="ob-keep" data-testid={testId} data-need={locked ? "locked" : "none"}>
      {line.slice(0, Math.max(at, 0))}
      <button
        type="button"
        className="ob-keep-link"
        data-testid={`${testId}-way-in`}
        onClick={() => openSpaceSheet(locked ? "unlock" : "create")}
      >
        {T(locked ? "keptNeedUnlock" : "keptNeedCreate")}
      </button>
      {at < 0 ? null : line.slice(at + slot.length)}
    </p>
  );
}
