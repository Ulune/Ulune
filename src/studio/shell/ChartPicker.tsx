import { ChevronDown, Pencil, Plus, Users, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useStudioUrl } from "@/studio/use-studio-url";
import { AnchoredPopover } from "@/components/anchored-popover";
import { chartDisplayName } from "@/lib/chart/library";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { UluneMark } from "@/studio/shell/ulune-mark";
import { useStudioStore } from "@/studio/store";
import { toast } from "@/lib/toast";

export function ChartPicker() {
  const { t } = useI18n();
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
        onClick={() => (open ? close() : setOpen(true))}
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
          {rows.length ? (
            <ul className="ob-picker-list">
              {shown.length === 0 ? <li className="ob-picker-none">{t("libraryNone")}</li> : null}
              {shown.map((row) => {
                const on = row.id === activeId && (!creating || addingPartner);
                const label = chartDisplayName(row.input, t("untitled"));
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
                            close();
                          }}
                          aria-current={on ? "true" : undefined}
                          className={cn("ob-picker-name", on && "is-on")}
                        >
                          <span className="truncate">{label}</span>
                          <span className="ob-picker-meta">
                            {[formatEuropeanDate(row.input.date), row.input.placeLabel.split(",")[0]].filter(Boolean).join(" · ")}
                          </span>
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
                          <button
                            type="button"
                            data-testid="chart-pair"
                            title={t("libraryPair", { name: label })}
                            aria-label={t("libraryPair", { name: label })}
                            onClick={() => {
                              setPartner("synastry", row.id);
                              setPage("synastry");
                              close();
                            }}
                            className="ob-icon-btn ob-icon-btn--quiet"
                          >
                            <Users className="size-4" strokeWidth={1.75} />
                          </button>
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
        </div>
      </AnchoredPopover>
    </>
  );
}
