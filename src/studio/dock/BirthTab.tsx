import { BirthForm } from "@/components/birth-form";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { chartDisplayName } from "@/lib/chart/library";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { sampleBirth } from "@/lib/chart/sample";
import { useI18n } from "@/lib/i18n/locale";
import { localizeError } from "@/lib/i18n/errors";
import { startTour } from "@/lib/tour/state";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/studio/store";
import { useSpace } from "@/lib/space/state";
import { PathLink } from "@/components/path-link";
import { ENCYCLOPEDIA_PATHS, pagePath } from "@/studio/map";
import { useSyncExternalStore } from "react";
import { Suspense } from "react";
import { useShareUi } from "@/components/share/share-state";
import { lazyNamed } from "@/lib/lazy-component";

/** Above the form when it opened for a request for the reader's chart (share and compare plan, idea B4): its own download, with the request. */
const RequestHead = lazyNamed(() => import("@/components/share/request-head"), "RequestHead");

/**
 * Where charts are calculated, as Settings › "Where charts are calculated" keeps it (the key of
 * lib/engine/choice.ts, read here without that module, which stays out of the first load). Settings
 * is a page of its own: coming back draws this form again, and reads it again.
 */
function calculatedOn(): "device" | "server" {
  try {
    return localStorage.getItem("ulune.calculate") === "server" ? "server" : "device";
  } catch {
    return "device";
  }
}
const noChange = () => () => {};

/**
 * The birth form: on the stage for a new chart or a second person, in the
 * panel to edit one. A first visit (no chart open, none kept on this device)
 * gets the page's title, "Cast a birth chart", one line on what it gives,
 * and two links under it: the sample chart and the tour. `modeLine` says why
 * the form stands where a mode was asked for (a link to Transits, say);
 * `back` leads back to a page that needs no chart (the Calendar's sky).
 */
export function BirthTab({
  onStage = false,
  modeLine = null,
  back = null,
}: {
  onStage?: boolean;
  modeLine?: string | null;
  back?: { label: string; onBack: () => void } | null;
}) {
  const { locale, t } = useI18n();
  const input = useStudioStore((s) => s.input);
  const chart = useStudioStore((s) => s.chart);
  const creating = useStudioStore((s) => s.creating);
  const casting = useStudioStore((s) => s.casting);
  const formEpoch = useStudioStore((s) => s.formEpoch);
  const timeUnknown = useStudioStore((s) => s.timeUnknown);
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const addingPartnerFor = useStudioStore((s) => s.pair.addingPartnerFor);
  const setInput = useStudioStore((s) => s.setInput);
  const setNumerologyNames = useStudioStore((s) => s.setNumerologyNames);
  const setChineseCount = useStudioStore((s) => s.setChineseCount);
  const onNumerology = useStudioStore((s) => s.page === "numerology" || s.page === "numerology-cycles");
  const cast = useStudioStore((s) => s.cast);
  const beginEdit = useStudioStore((s) => s.beginEdit);
  const discardDraft = useStudioStore((s) => s.discardDraft);
  const error = useStudioStore((s) => s.error);
  const composing = useStudioStore((s) => s.composing);
  const spaceStatus = useSpace((s) => s.status);
  const spaceOpen = spaceStatus === "open";
  const asked = useShareUi((s) => s.request !== null);
  // What is kept of what is typed here: nothing, or the private space.
  const keptHint = spaceOpen ? t("birthKeptSpace") : t("birthKeptNothing");
  // Where the chart is calculated (Settings, on-device plan, step 5): the device by default, as the server's page says.
  const where = useSyncExternalStore(noChange, calculatedOn, () => "device");

  const mode = addingPartnerFor ? "partner" : creating || !chart ? "new" : "edit";
  const firstVisit = mode === "new" && !chart && rows.length === 0 && spaceStatus !== "locked";
  const locked = mode === "new" && spaceStatus === "locked";
  const active = rows.find((row) => row.id === activeId) ?? null;
  const editingName =
    mode === "edit" && active ? chartDisplayName(active.input, t("untitled")) : null;
  const heading =
    mode === "partner"
      ? t("partnerKicker")
      : firstVisit
        ? t("firstTitle")
        : mode === "new"
          ? t("newNatal")
          : editingName
            ? editingName
            : t("castANatal");
  const hint =
    mode === "partner"
      ? t("partnerHint")
      : locked
        ? t("firstLocked")
        : firstVisit && !spaceOpen
          ? t("firstLine")
          : mode === "new"
            ? keptHint
            : editingName
          ? [
              formatEuropeanDate(input.date),
              timeUnknown ? t("timeUnknown") : input.time,
              input.placeLabel,
              t(HOUSE_SYSTEM_LABEL[chart?.meta.houseSystem ?? input.houseSystem ?? "placidus"]),
              chart ? (chart.patterns.isDay ? t("tableDay") : t("tableNight")) : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : keptHint;
  const submitLabel =
    mode === "edit" && editingName ? t("updateName", { name: editingName }) : t("castChart");
  const Title = onStage ? "h1" : "h2";

  return (
    <div
      id="cast-form"
      className={cn("ulune-dock-scroll ob-birth", onStage && "ob-birth--stage")}
      data-on-stage={onStage ? "1" : undefined}
    >
      <div className="ob-birth-head">
        {asked && onStage && mode === "new" ? (
          <Suspense fallback={null}>
            <RequestHead />
          </Suspense>
        ) : null}
        {back ? (
          <button type="button" className="ob-sample-link ob-birth-back" data-testid="birth-back" onClick={back.onBack}>
            {back.label}
          </button>
        ) : null}
        {modeLine ? (
          <p className="ob-birth-mode" data-testid="birth-mode-line">
            {modeLine}
          </p>
        ) : null}
        {firstVisit ? null : (
          <p data-testid="birth-kicker" className="ulune-kicker text-fg-muted">
            {mode === "partner" ? t("partnerKicker") : t("foldBirth")}
          </p>
        )}
        <Title
          className="ob-birth-title font-display text-xl leading-none text-fg"
          data-testid="birth-title"
          data-first={firstVisit ? "1" : undefined}
        >
          {heading}
        </Title>
        <p className="ob-birth-hint text-xs text-fg-muted" data-testid="birth-hint">
          {hint}
        </p>
      </div>
      <BirthForm
        key={`birth-${formEpoch}`}
        mode={mode}
        value={input}
        castMeta={mode === "edit" && chart ? chart.meta : null}
        busy={casting}
        submitLabel={submitLabel}
        onChange={setInput}
        onBeginEdit={beginEdit}
        onCast={(next) => void cast(next)}
        namesOpen={onNumerology && mode !== "partner"}
        onNames={mode === "edit" ? setNumerologyNames : undefined}
        onChineseCount={mode === "edit" ? setChineseCount : undefined}
      />
      <p className="ob-cast-note" data-testid="cast-note" data-calculate={where}>
        {t(where === "server" ? "castNoteServer" : "castNote")}
      </p>
      {firstVisit ? (
        <noscript>
          <p className="ob-cast-note ob-noscript">{t("noScript")}</p>
        </noscript>
      ) : null}
      {(mode === "new" && rows.length > 0) || mode === "partner" ? (
        <button
          type="button"
          data-testid="birth-discard"
          onClick={() => discardDraft()}
          className="min-h-[var(--row-h)] w-full px-3 text-sm text-fg-muted hover:text-fg"
        >
          {t("discardDraft")}
        </button>
      ) : null}
      {firstVisit ? (
        <div className="ob-first-links">
          <button
            type="button"
            data-testid="sample-chart"
            className="ob-sample-link"
            onClick={() => void cast(sampleBirth(t("sampleName")))}
          >
            {t("firstSample")}
          </button>
          <button type="button" data-testid="first-tour" className="ob-sample-link ob-tour-link" onClick={startTour}>
            {t("firstTour")}
          </button>
          {/* Two other ways in, without a chart (page reorganisation, R7). */}
          <PathLink href={locale === "fr" ? ENCYCLOPEDIA_PATHS.fr : ENCYCLOPEDIA_PATHS.en} className="ob-sample-link" data-testid="first-encyclopedia">
            {t("firstEncyclopedia")}
          </PathLink>
          <PathLink href={pagePath("timing", locale)} className="ob-sample-link" data-testid="first-calendar">
            {t("firstCalendar")}
          </PathLink>
        </div>
      ) : null}
      {error && !composing ? (
        <p role="alert" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-danger">
          {localizeError(error, locale)}
        </p>
      ) : null}
    </div>
  );
}
