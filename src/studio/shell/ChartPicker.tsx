import { ChevronDown, Pencil, Plus, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudioUrl } from "@/studio/use-studio-url";
import { AnchoredPopover } from "@/components/anchored-popover";
import { chartDisplayName } from "@/lib/chart/library";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { useI18n } from "@/lib/i18n/locale";
import { whenIdle } from "@/lib/lazy-component";
import { importWithRetry } from "@/lib/lazy-retry";
import { useSpace } from "@/lib/space/state";
import { cn } from "@/lib/utils";
import { languageOf, lensesOf, pageFor } from "@/studio/map";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { UluneMark } from "@/studio/shell/ulune-mark";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import { toast } from "@/lib/toast";

/*
 * The chart switcher, "People and places" (reorganisation plan, R9): the
 * charts, then the homes a private space keeps for Feng Shui
 * (picker-places.tsx, its own download, fetched at idle once a space exists
 * so the switcher opens with them). Its pair button compares in the language
 * on screen (languages plan, part 28).
 */
type Places = typeof import("@/studio/shell/picker-places");
let placesMod: Places | undefined;
const loadPlaces = () => importWithRetry(() => import("@/studio/shell/picker-places"), { attempts: 2 }).then((m) => (placesMod = m));
/**
 * "Back to…", each row's "Compare with…" and "Ask someone for their chart" (share and compare plan,
 * ideas B3 and B4, feature 2): their own download, at idle (or as the switcher opens, if that is sooner).
 */
type Extras = typeof import("@/studio/show/picker-extras");
let extrasMod: Extras | undefined;
const loadExtras = () => importWithRetry(() => import("@/studio/show/picker-extras"), { attempts: 2 }).then((m) => (extrasMod = m));

/**
 * Where the pair button compares: in the Relationship lens of the language on
 * screen (BaZi's from BaZi), else in astrology's, on the page last used in it
 * (Synastry or Composite), as a press on that lens would lead.
 */
function pairPageOf(page: StudioPage): StudioPage {
  const lang = languageOf(page);
  return pageFor(lang && lensesOf(lang).includes("relationship") ? lang : "astrology", "relationship");
}

/** A chart shared by a link (share plan, feature 1), opened from here once: no longer "Shared with you", in its sealed record either. */
function seenShared(id: string): void {
  useStudioStore.setState((s) => ({ rows: s.rows.map((r) => (r.id === id ? { ...r, sharedAt: undefined } : r)) }));
}

/** "16 Oct", "1er oct.": the day a chart was shared with the reader. */
function sharedDay(at: number, locale: string): string {
  const d = new Date(at);
  const day = d.getDate();
  return `${locale === "fr" && day === 1 ? "1er" : day} ${d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { month: "short" })}`;
}

export function ChartPicker() {
  const { t, locale } = useI18n();
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const creating = useStudioStore((s) => s.creating);
  const addingPartner = Boolean(useStudioStore((s) => s.pair.addingPartnerFor));
  const select = useStudioStore((s) => s.select);
  const edit = useStudioStore((s) => s.edit);
  const startNew = useStudioStore((s) => s.startNew);
  const remove = useStudioStore((s) => s.remove);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "birth">("recent");
  const setPartner = useStudioStore((s) => s.setPartner);
  const { setPage } = useStudioUrl({ hydrate: false });
  const page = useStudioStore((s) => s.page);
  // The homes' code once a space exists (open: its homes; locked, on Feng Shui's pages: the way to unlock them), at idle.
  const status = useSpace((s) => s.status);
  const wantPlaces = status === "open" || status === "locked";
  const [places, setPlaces] = useState(placesMod);
  // The "People" heading only when that code was here as the switcher opened: the charts never move under the pointer.
  const [placesAtOpen, setPlacesAtOpen] = useState(placesMod);
  useEffect(() => {
    if (!wantPlaces || places) return;
    const load = () => void loadPlaces().then(setPlaces, () => {});
    if (!open) return whenIdle(load, 4000);
    load();
  }, [wantPlaces, places, open]);
  // Read from this device's memory only while the switcher is open (never on the server, as the shell's other reads).
  const pairPage = open ? pairPageOf(page) : "synastry";
  const many = rows.length > 6;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) =>
          `${r.input.name} ${r.input.placeLabel} ${r.input.date} ${formatEuropeanDate(r.input.date)}`.toLowerCase().includes(q),
        )
      : [...rows];
    const birthKey = (d: string) => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
      return m ? `${m[3]}${m[2]}${m[1]}` : d;
    };
    if (sort === "name") list.sort((a, b) => (a.input.name || "").localeCompare(b.input.name || ""));
    else if (sort === "birth") list.sort((a, b) => birthKey(a.input.date).localeCompare(birthKey(b.input.date)));
    else list.sort((a, b) => b.savedAt - a.savedAt);
    return list;
  }, [rows, query, sort]);
  const chipRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setConfirmId(null);
  }, []);

  // Its rows of ideas B3 and B4 and each row's Compare: fetched once the page is idle (or as it opens, if that is sooner).
  const [extras, setExtras] = useState(extrasMod);
  useEffect(() => {
    if (extras) return;
    const load = () => void loadExtras().then(setExtras, () => {});
    if (!open) return whenIdle(load, 4000);
    load();
  }, [extras, open]);
  const active = rows.find((row) => row.id === activeId);
  const chip =
    creating && !addingPartner
      ? t("new")
      : active
        ? chartDisplayName(active.input, t("untitled"))
        : t("charts");

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        data-testid="chart-chip"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={chip}
        onClick={() => {
          if (open) return close();
          setPlacesAtOpen(placesMod);
          setOpen(true);
        }}
        className="ob-chip"
      >
        <UluneMark className="ob-chip-mark" />
        <span className="ob-chip-name">{chip}</span>
        <ChevronDown className="ob-chip-caret" strokeWidth={1.75} aria-hidden />
      </button>
      <AnchoredPopover
        open={open}
        anchorRef={chipRef}
        onClose={close}
        width={320}
        role="dialog"
        aria-label={t("charts")}
        hideLabel={t("charts")}
      >
        <div data-testid="chart-picker" className="ob-pop ob-picker">
          {placesAtOpen ? <placesAtOpen.PeopleHead /> : null}
          {many ? (
            <div className="ob-picker-tools">
              <input
                type="search"
                data-testid="chart-search"
                className="ob-picker-search"
                placeholder={t("librarySearch")}
                aria-label={t("librarySearch")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                data-testid="chart-sort"
                className="ob-picker-sort"
                aria-label={t("librarySort")}
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="recent">{t("librarySortRecent")}</option>
                <option value="name">{t("librarySortName")}</option>
                <option value="birth">{t("librarySortBirth")}</option>
              </select>
            </div>
          ) : null}
          {extras ? <extras.PickerBack onClose={close} /> : null}
          {rows.length ? (
            <ul className="ob-picker-list">
              {shown.length === 0 ? <li className="ob-picker-none">{t("libraryNone")}</li> : null}
              {shown.map((row) => {
                const on = row.id === activeId && (!creating || addingPartner);
                const label = chartDisplayName(row.input, t("untitled"));
                const pair = t("libraryPair", { name: label, page: t(PAGE_LABEL[pairPage]) });
                const confirming = confirmId === row.id;
                return (
                  <li
                    key={row.id}
                    data-testid="chart-row"
                    data-name={label}
                    className="ob-picker-row"
                  >
                    {confirming ? (
                      <div className="ob-picker-confirm">
                        <span className="ob-picker-confirm-q">
                          {t("confirmRemoveChart", { name: label })}
                        </span>
                        <div className="ob-picker-confirm-actions">
                          <button
                            type="button"
                            className="ob-btn ob-btn--ghost"
                            onClick={() => setConfirmId(null)}
                          >
                            {t("keepChart")}
                          </button>
                          <button
                            type="button"
                            data-testid="chart-remove-confirm"
                            className="ob-btn ob-btn--danger"
                            onClick={() => {
                              void remove(row.id);
                              toast(t("toastChartRemoved", { name: label }));
                              close();
                            }}
                          >
                            {t("confirmRemove")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            select(row.id);
                            if (row.sharedAt) seenShared(row.id);
                            close();
                          }}
                          aria-current={on ? "true" : undefined}
                          className={cn("ob-picker-name", on && "is-on")}
                        >
                          <span className="truncate">{label}</span>
                          <span className="ob-picker-meta">
                            {[formatEuropeanDate(row.input.date), row.input.placeLabel.split(",")[0]].filter(Boolean).join(" · ")}
                          </span>
                          {row.sharedAt ? (
                            <span className="ob-picker-meta" data-testid="chart-shared" style={{ color: "var(--color-fg-muted)" }}>
                              {t("sharedWithYou", { date: sharedDay(row.sharedAt, locale) })}
                            </span>
                          ) : null}
                        </button>
                        {on ? (
                          <>
                            <button
                              type="button"
                              data-testid="chart-edit"
                              title={t("editBirth")}
                              aria-label={t("editBirth")}
                              onClick={() => {
                                edit(row.id);
                                close();
                              }}
                              className="ob-icon-btn ob-icon-btn--quiet"
                            >
                              <Pencil className="size-4" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              data-testid="chart-remove"
                              title={t("removeChart")}
                              aria-label={t("removeChart")}
                              onClick={() => setConfirmId(row.id)}
                              className="ob-icon-btn ob-icon-btn--quiet ob-icon-btn--danger"
                            >
                              <X className="size-4" strokeWidth={1.75} />
                            </button>
                          </>
                        ) : activeId ? (
                          <>
                            {/* Side by side with the chart shown (Compare, studio/compare): with the rows of ideas B3 and B4. */}
                            {extras ? <extras.RowCompare id={row.id} name={label} go={setPage} onClose={close} /> : null}
                            <button
                              type="button"
                              data-testid="chart-pair"
                              title={pair}
                              aria-label={pair}
                              onClick={() => {
                                // Composite keeps its own partner; the other pages share synastry's.
                                setPartner(pairPage === "composite" ? "composite" : "synastry", row.id);
                                setPage(pairPage);
                                close();
                              }}
                              className="ob-icon-btn ob-icon-btn--quiet"
                            >
                              <Users className="size-4" strokeWidth={1.75} />
                            </button>
                          </>
                        ) : null}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <button
            type="button"
            data-testid="new-chart"
            onClick={() => {
              startNew();
              close();
            }}
            className={cn("ob-picker-new", creating && !addingPartner && "is-on")}
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            {t("new")}
          </button>
          {extras ? <extras.PickerAsk onClose={close} /> : null}
          {places ? <places.PickerPlaces go={setPage} onClose={close} /> : null}
        </div>
      </AnchoredPopover>
    </>
  );
}
