import { useCallback, useEffect, useRef, useState } from "react";
import { searchPlaces } from "@/lib/chart/functions";
import { isAbortError } from "@/lib/chart/geocode";
import {
  formatEuropeanDate,
  isCompleteBirthDate,
  isCompleteBirthTime,
  isValidBirthTime,
  maskBirthTime,
  parseCoords,
} from "@/lib/chart/parse-birth";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import type { MessageKey } from "@/lib/i18n/messages";

const HOUSE_SYSTEM_NOTE: Record<HouseSystemId, MessageKey> = {
  placidus: "houseNotePlacidus",
  koch: "houseNoteKoch",
  equal: "houseNoteEqual",
  whole: "houseNoteWhole",
  porphyry: "houseNotePorphyry",
  regiomontanus: "houseNoteRegiomontanus",
  campanus: "houseNoteCampanus",
  alcabitius: "houseNoteAlcabitius",
  morinus: "houseNoteMorinus",
  topocentric: "houseNoteTopocentric",
};
import {
  HOUSE_SYSTEM_IDS,
  type BirthInput,
  type HouseSystemId,
  type NatalChart,
  type PlaceHit,
} from "@/lib/chart/types";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { BirthDateField } from "./birth-date-field";
import { AnchoredPopover } from "./anchored-popover";
import { MaskedInput } from "./masked-input";
import { Button } from "./ui/button";
import { Input, Label } from "./ui/input";

const PLACE_DEBOUNCE_MS = 120;
/** After HH:MM, wait this long for seconds (HH:MM:SS) before moving on to the place. */
const TIME_ADVANCE_MS = 450;

/** Every quarter-hour offset from UTC−12:00 to UTC+14:00, as "+05:30" / "-04:00". */
const FIXED_OFFSETS: string[] = (() => {
  const out: string[] = [];
  for (let m = -12 * 60; m <= 14 * 60; m += 15) {
    const abs = Math.abs(m);
    out.push(`${m < 0 ? "-" : "+"}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`);
  }
  return out;
})();

/** "+05:30" → "+05:30", "-04:00" → "−04:00" (typographic minus for display). */
function offsetLabel(value: string): string {
  return value.replace(/^-/, "\u2212");
}

const SELECT_CLASS = cn(
  "block h-11 w-full min-w-0 rounded-md border border-border bg-bg px-3 text-base text-fg transition-[border-color,box-shadow] duration-[var(--motion-ui)] md:text-sm",
  "focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:opacity-50",
);

/** The form's time-zone select value for a stored choice. */
function tzSelectValue(tz: string | undefined): string {
  if (!tz || tz === "auto") return "auto";
  if (tz === "lmt") return "lmt";
  return FIXED_OFFSETS.includes(tz) ? tz : "auto";
}

const NEXT_FIELD: Record<string, string> = {
  "native-name": "birth-date",
  "birth-date": "birth-time",
  "birth-time": "birth-place",
};

/**
 * Place search through Ulune's server, so the geocoder never sees the
 * reader's address; the server keeps nothing (lib/chart/functions.ts).
 */
async function lookupPlaces(q: string, locale: "en" | "fr", signal?: AbortSignal): Promise<PlaceHit[]> {
  return await searchPlaces({ data: { q, locale }, signal });
}

function focusControl(id: string) {
  window.requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el instanceof HTMLElement) el.focus();
  });
}

function dateForField(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const euro = formatEuropeanDate(s);
    if (isCompleteBirthDate(euro)) return euro;
  }
  return raw;
}

type Props = {
  value: BirthInput;
  /**
   * The cast chart's moment (edit mode): how it read its birth time is shown
   * under the time zone choice while the form still holds that birth.
   */
  castMeta?: Pick<NatalChart["meta"], "date" | "time" | "latitude" | "longitude" | "birthTime"> | null;
  busy: boolean;
  submitLabel?: string;
  mode?: "new" | "edit" | "partner";
  onChange: (next: BirthInput) => void;
  onCast: (next: BirthInput, meta: { placeConfirmed: boolean }) => void;
  onBeginEdit?: () => void;
};

function stamp(v: BirthInput) {
  return `${v.name}|${v.date}|${v.time}|${v.placeLabel}|${v.latitude}|${v.longitude}|${v.houseSystem ?? "placidus"}|${v.tz ?? "auto"}|${v.fold ?? ""}`;
}

const FIELD_IDS = new Set(["native-name", "birth-date", "birth-time", "birth-place", "house-system", "birth-tz", "birth-fold"]);

export function BirthForm({ value, castMeta, busy, submitLabel, mode, onChange, onCast, onBeginEdit }: Props) {
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState(() => ({ ...value, date: dateForField(value.date) }));
  const [query, setQuery] = useState(value.placeLabel);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [active, setActive] = useState(0);
  const [noTime, setNoTime] = useState(() => Boolean(value.timeUnknown) || (!value.time.trim() && Boolean(value.placeLabel)));
  const [picked, setPicked] = useState(
    () => Number.isFinite(value.latitude) && Number.isFinite(value.longitude),
  );
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeList = useCallback(() => setOpen(false), []);
  const formRef = useRef<HTMLFormElement>(null);
  const beganRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const incoming = stamp(value);

  useEffect(() => {
    const active = document.activeElement;
    const focusedHere =
      (active instanceof HTMLElement && formRef.current?.contains(active)) ||
      (active instanceof HTMLElement && FIELD_IDS.has(active.id));
    if (beganRef.current || focusedHere) return;
    setDraft({ ...value, date: dateForField(value.date) });
    setQuery(value.placeLabel);
    setPicked(Number.isFinite(value.latitude) && Number.isFinite(value.longitude));
  }, [incoming, value]);

  function markEdit() {
    if (beganRef.current) return;
    beganRef.current = true;
    onBeginEdit?.();
  }

  function patch(partial: Partial<BirthInput>) {
    markEdit();
    setDraft((cur) => {
      const next = { ...cur, ...partial };
      draftRef.current = next;
      return next;
    });
  }

  function onDateTyped(raw: string) {
    const next = dateForField(raw);
    const prev = draftRef.current.date;
    // A repeated-hour choice belongs to the moment it was made for.
    patch({ date: next, fold: undefined });
    if (!isCompleteBirthDate(prev) && isCompleteBirthDate(next)) {
      focusControl("birth-time");
    }
  }

  const advanceTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  function onTimeTyped(next: string) {
    const prev = draftRef.current.time;
    patch({ time: next, fold: undefined });
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(next.trim()) && isValidBirthTime(next)) {
      focusControl("birth-place");
      return;
    }
    if (!isCompleteBirthTime(prev) && isCompleteBirthTime(next)) {
      // Seconds may follow (a rectified time): move on only once typing pauses.
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        if (document.activeElement?.id === "birth-time" && isCompleteBirthTime(draftRef.current.time)) {
          focusControl("birth-place");
        }
      }, TIME_ADVANCE_MS);
    }
  }

  useEffect(() => {
    if (picked) {
      setLooking(false);
      setHits([]);
      setOpen(false);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setLooking(false);
      setHits([]);
      setOpen(false);
      return;
    }
    if (parseCoords(q)) {
      setLooking(false);
      setHits([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    setLooking(true);
    const handle = window.setTimeout(() => {
      void lookupPlaces(q, locale, ac.signal)
        .then((rows) => {
          if (cancelled) return;
          const next = Array.isArray(rows) ? rows : [];
          setHits(next);
          setActive(0);
          setOpen(true);
          setLooking(false);
          setHint(next.length ? null : t("couldNotFind", { query: q }));
        })
        .catch((err) => {
          if (cancelled || isAbortError(err)) return;
          setLooking(false);
          setHits([]);
          setOpen(false);
          setHint(t("placeLookupFailed"));
        });
    }, PLACE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
      ac.abort();
    };
  }, [query, picked, locale, t]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t)) return;
      if (t instanceof Element && t.closest("#birth-place-list")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const pick = (hit: PlaceHit) => {
    markEdit();
    const current = draftRef.current;
    const next: BirthInput = {
      ...current,
      placeLabel: hit.label,
      latitude: hit.latitude,
      longitude: hit.longitude,
      zone: hit.timezone || undefined,
      fold: undefined,
    };
    setQuery(hit.label);
    setOpen(false);
    setPicked(true);
    setHint(null);
    setDraft(next);
    draftRef.current = next;
    onChange(next);
  };

  function commitDraft(next: BirthInput) {
    setDraft(next);
    draftRef.current = next;
    onChange(next);
  }

  function pushParent() {
    onChange(draftRef.current);
  }

  /**
   * One cast per intent: a second click (or Enter) while the first cast runs,
   * or right after it answered, sends nothing when the birth is the same.
   * The button greys out too, but only once the page has drawn it again.
   */
  const lastCast = useRef<{ at: number; key: string } | null>(null);
  function castOnce(next: BirthInput, opts: { placeConfirmed: boolean }) {
    const key = JSON.stringify([next.name, next.date, next.time, next.timeUnknown, next.latitude, next.longitude, next.tz, next.houseSystem]);
    const now = Date.now();
    const last = lastCast.current;
    if (last && last.key === key && (busy || now - last.at < 1500)) return;
    lastCast.current = { at: now, key };
    onCast(next, opts);
  }

  async function submit() {
    setHint(null);
    const next: BirthInput = { ...draft, placeLabel: query.trim() || draft.placeLabel };
    if (!next.date.trim()) {
      setHint(t("err_birth_date_missing"));
      focusControl("birth-date");
      return;
    }
    if (!isCompleteBirthDate(next.date)) {
      setHint(t("err_birth_date_format"));
      focusControl("birth-date");
      return;
    }
    if (!noTime && next.time.trim() && !isValidBirthTime(next.time)) {
      setHint(t("err_birth_time_format"));
      focusControl("birth-time");
      return;
    }
    if (!next.placeLabel.trim() && !Number.isFinite(next.latitude)) {
      setHint(t("addCity"));
      return;
    }
    const coords = parseCoords(next.placeLabel);
    if (coords) {
      next.latitude = coords.latitude;
      next.longitude = coords.longitude;
      commitDraft(next);
      castOnce(withTime(next), { placeConfirmed: true });
      return;
    }
    if (!picked || query.trim() !== next.placeLabel || !Number.isFinite(next.latitude)) {
      if (query.trim().length < 2) {
        setHint(t("addCity"));
        return;
      }
      // Never take the first result silently: show the list and ask.
      setStatus(t("lookingUpPlace"));
      try {
        const rows = await lookupPlaces(query.trim(), locale);
        setStatus(null);
        setHits(rows ?? []);
        setActive(0);
        setOpen(true);
        setHint(rows?.length ? t("placeChoose") : t("couldNotFind", { query: query.trim() }));
        inputRef.current?.focus();
      } catch {
        setHint(t("placeLookupFailed"));
        setStatus(null);
      }
      return;
    }
    castOnce(withTime(next), { placeConfirmed: true });
  }

  // A stored override the select has no entry for (an imported zone id, an
  // offset off the quarter-hour grid) is shown as itself, never as "Automatic".
  const tzExtra = draft.tz && draft.tz !== "auto" && tzSelectValue(draft.tz) === "auto" ? draft.tz : null;
  const tzValue = tzExtra ?? tzSelectValue(draft.tz);
  const tzLabelOf = (v: string) =>
    v === "lmt" ? t("tzLmtShort") : /^[+-]\d/.test(v) ? `UTC${offsetLabel(v)}` : v.replace(/_/g, " ");
  const tzSummary = tzValue === "auto" ? null : tzLabelOf(tzValue);
  // The cast chart's reading of its birth time applies while the form still
  // holds that chart's date, time, place and zone choice.
  const birthTime = castMeta?.birthTime ?? null;
  const isoDate = (d: string) => d.trim().replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
  const sameBirth = Boolean(
    castMeta &&
      birthTime &&
      isoDate(draft.date) === castMeta.date &&
      draft.time.trim() === castMeta.time &&
      draft.latitude === castMeta.latitude &&
      draft.longitude === castMeta.longitude &&
      (draft.tz && draft.tz !== "auto" ? draft.tz : "auto") === (birthTime.choice ?? "auto"),
  );
  const birthTimeClock = castMeta?.time ?? "";
  const timeNotice = sameBirth && birthTime && birthTime.local !== "normal" ? birthTime.local : null;
  const readAs =
    sameBirth && birthTime
      ? birthTime.basis === "offset"
        ? t("tzReadAsOffset", { offset: birthTime.offsetLabel })
        : birthTime.basis === "lmt"
          ? t("tzReadAsLmt", { offset: birthTime.offsetLabel })
          : t("tzReadAs", {
              zone: birthTime.zone.replace(/_/g, " "),
              offset: birthTime.offsetLabel,
              abbr: birthTime.dst ? `${birthTime.abbr}, ${t("tzSummerTime")}` : birthTime.abbr,
            })
      : null;
  // Options open by themselves when they hold something to read or a choice
  // away from the default; after that the reader opens and closes them.
  const wantOptions = tzValue !== "auto" || Boolean(timeNotice);
  const [optionsOpen, setOptionsOpen] = useState(wantOptions);
  useEffect(() => {
    if (wantOptions) setOptionsOpen(true);
  }, [wantOptions]);

  function withTime(next: BirthInput): BirthInput {
    return noTime ? { ...next, time: "", timeUnknown: true } : { ...next, timeUnknown: !next.time.trim() };
  }


  return (
    <form
      ref={formRef}
      data-mode={mode ?? "new"}
      className="grid grid-cols-2 items-end gap-[var(--space-3)]"
      autoComplete="off"
      noValidate
      action="#"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void submit();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const el = e.target as HTMLElement;
        if (el.id === "birth-place") return;
        if (el.id === "house-system") {
          e.preventDefault();
          return;
        }
        const next = NEXT_FIELD[el.id];
        if (next) {
          e.preventDefault();
          focusControl(next);
          return;
        }
        if (el.tagName === "INPUT" || el.tagName === "SELECT") {
          e.preventDefault();
        }
      }}
    >
      <div className="col-span-2 min-w-0">
        <Label htmlFor="native-name">{t("name")}</Label>
        <Input
          id="native-name"
          name="ulune-subject"
          value={draft.name}
          placeholder={t("optional")}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="next"
          onChange={(e) => patch({ name: e.target.value })}
          onBlur={pushParent}
        />
      </div>
      <div className="ulune-birth-when min-w-0">
        <Label htmlFor="birth-date">{t("date")}</Label>
        <BirthDateField
          id="birth-date"
          name="ulune-date"
          value={draft.date}
          placeholder={t("datePlaceholder")}
          calendarLabel={t("openCalendar")}
          locale={locale}
          onTyped={onDateTyped}
          onBlur={pushParent}
        />
      </div>
      <div className="ulune-birth-when min-w-0">
        <Label htmlFor="birth-time">{t("time")}</Label>
        <MaskedInput
          id="birth-time"
          name="ulune-time"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t("timePlaceholder")}
          enterKeyHint="next"
          value={noTime ? "" : draft.time}
          disabled={noTime}
          mask={maskBirthTime}
          onTyped={onTimeTyped}
          onBlur={pushParent}
        />
      </div>
      <label className="ob-check col-span-2" htmlFor="time-unknown">
        <input
          id="time-unknown"
          type="checkbox"
          data-testid="time-unknown"
          checked={noTime}
          onChange={(e) => {
            markEdit();
            setNoTime(e.target.checked);
            if (e.target.checked) patch({ time: "" });
            else focusControl("birth-time");
          }}
        />
        <span>
          {t("timeUnknownCheck")}
          <span className="ob-check-hint">{t("timeUnknownHint")}</span>
        </span>
      </label>
      <div className="relative z-20 col-span-2 min-w-0" ref={boxRef}>
        <Label htmlFor="birth-place">{t("place")}</Label>
        <Input
          ref={inputRef}
          id="birth-place"
          name="ulune-place"
          value={query}
          placeholder={t("placePlaceholder")}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !picked}
          aria-controls="birth-place-list"
          aria-activedescendant={open && !picked && hits[active] ? `birth-place-opt-${active}` : undefined}
          aria-describedby={hint ? "birth-form-hint" : undefined}
          onChange={(e) => {
            markEdit();
            const next: BirthInput = {
              ...draftRef.current,
              placeLabel: e.target.value,
              latitude: Number.NaN,
              longitude: Number.NaN,
              zone: undefined,
              fold: undefined,
            };
            draftRef.current = next;
            setQuery(e.target.value);
            setPicked(false);
            setHint(null);
            setDraft(next);
          }}
          onBlur={() =>
            onChange({
              ...draftRef.current,
              placeLabel: query,
              latitude: picked ? draftRef.current.latitude : Number.NaN,
              longitude: picked ? draftRef.current.longitude : Number.NaN,
            })
          }
          onFocus={() => {
            if (!picked && (hits.length > 0 || looking || hint)) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && hits.length && !picked) {
              e.preventDefault();
              setOpen(true);
              setActive((i) => (e.key === "ArrowDown" ? (i + 1) % hits.length : (i - 1 + hits.length) % hits.length));
              return;
            }
            if (e.key === "Enter" && open && hits[active] && !picked) {
              e.preventDefault();
              e.stopPropagation();
              pick(hits[active]);
            }
          }}
        />
        <AnchoredPopover
          open={open && !picked && (looking || hits.length > 0 || Boolean(hint))}
          anchorRef={inputRef}
          onClose={closeList}
          hideLabel={t("place")}
          backdrop={false}
        >
          <ul
            id="birth-place-list"
            role="listbox"
            className="max-h-56 overflow-auto rounded-md border border-border bg-bg-elevated py-1 shadow-lg"
          >
            {looking && hits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-fg-muted">{t("lookingUpPlace")}</li>
            ) : null}
            {hits.map((hit, i) => (
              <li
                key={`${hit.label}-${hit.latitude}-${hit.longitude}`}
                id={`birth-place-opt-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={cn(
                    "flex min-h-11 w-full flex-col items-start justify-center px-3 py-2 text-left text-sm text-fg hover:bg-bg-subtle",
                    i === active && "bg-bg-subtle",
                  )}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pick(hit);
                  }}
                >
                  <span>{hit.label}</span>
                  {hit.country || hit.timezone ? (
                    <span className="text-xs text-fg-subtle">
                      {[hit.country, hit.timezone].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {!looking && hits.length === 0 && hint ? (
              <li className="px-3 py-2 text-sm text-danger">{hint}</li>
            ) : null}
          </ul>
        </AnchoredPopover>
      </div>
      <details
        className="ob-birth-options col-span-2"
        data-testid="birth-options"
        open={optionsOpen}
        onToggle={(e) => setOptionsOpen(e.currentTarget.open)}
      >
        <summary>
          {t("birthOptions")}
          <span className="ob-birth-options-val">
            {[t(HOUSE_SYSTEM_LABEL[draft.houseSystem ?? "placidus"]), tzSummary].filter(Boolean).join(" · ")}
          </span>
        </summary>
        <div className="min-w-0">
        <Label htmlFor="house-system">{t("houseSystem")}</Label>
        <select
          id="house-system"
          data-testid="house-system"
          aria-label={t("houseSystem")}
          value={draft.houseSystem ?? "placidus"}
          onChange={(e) => {
            const houseSystem = e.target.value as HouseSystemId;
            patch({ houseSystem });
            onChange({ ...draftRef.current, houseSystem });
          }}
          className={SELECT_CLASS}
        >
          {HOUSE_SYSTEM_IDS.map((id) => (
            <option key={id} value={id}>
              {t(HOUSE_SYSTEM_LABEL[id])}
            </option>
          ))}
        </select>
          <p className="mt-1 text-xs text-fg-muted">{t(HOUSE_SYSTEM_NOTE[draft.houseSystem ?? "placidus"])}</p>
        </div>
        <div className="mt-3 min-w-0">
          <Label htmlFor="birth-tz">{t("timeZone")}</Label>
          <select
            id="birth-tz"
            data-testid="birth-tz"
            aria-label={t("timeZone")}
            value={tzValue}
            onChange={(e) => {
              const v = e.target.value;
              const tz = v === "auto" ? undefined : v;
              patch({ tz, fold: undefined });
              onChange({ ...draftRef.current, tz, fold: undefined });
            }}
            className={SELECT_CLASS}
          >
            <option value="auto">{t("tzAuto")}</option>
            <option value="lmt">{t("tzLmt")}</option>
            {tzExtra ? <option value={tzExtra}>{tzLabelOf(tzExtra)}</option> : null}
            <optgroup label={t("tzOffsetGroup")}>
              {FIXED_OFFSETS.map((o) => (
                <option key={o} value={o}>
                  {`UTC${offsetLabel(o)}`}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="mt-1 text-xs text-fg-muted">
            {t(tzValue === "auto" ? "tzNoteAuto" : tzValue === "lmt" ? "tzNoteLmt" : tzExtra && !/^[+-]\d/.test(tzExtra) ? "tzNoteAuto" : "tzNoteOffset")}
          </p>
          {readAs ? (
            <p className="mt-1 text-xs text-fg" data-testid="birth-tz-read">
              {readAs}
            </p>
          ) : null}
          {timeNotice === "ambiguous" && birthTime?.readings?.length === 2 ? (
            <div className="mt-2 min-w-0">
              <p className="ob-tz-note mb-2 text-xs" role="note">
                {t("tzAmbiguous", { time: draft.time || birthTimeClock })}
              </p>
              <Label htmlFor="birth-fold">{t("tzWhichOne", { time: draft.time || birthTimeClock })}</Label>
              <select
                id="birth-fold"
                data-testid="birth-fold"
                value={String(draft.fold ?? birthTime.fold ?? 1)}
                onChange={(e) => {
                  const fold = e.target.value === "0" ? 0 : 1;
                  patch({ fold });
                  onChange({ ...draftRef.current, fold });
                }}
                className={SELECT_CLASS}
              >
                <option value="0">
                  {t("tzFirstTime", {
                    abbr: birthTime.readings[0].abbr,
                    offset: birthTime.readings[0].offsetLabel,
                  })}
                </option>
                <option value="1">
                  {t("tzSecondTime", {
                    abbr: birthTime.readings[1].abbr,
                    offset: birthTime.readings[1].offsetLabel,
                  })}
                </option>
              </select>
            </div>
          ) : null}
          {timeNotice === "nonexistent" && birthTime ? (
            <p className="ob-tz-note mt-2 text-xs" data-testid="birth-tz-gap" role="note">
              {t("tzNonexistent", {
                time: draft.time || birthTimeClock,
                abbr: birthTime.abbr,
                offset: birthTime.offsetLabel,
              })}
            </p>
          ) : null}
          {birthTime?.calendar === "julian" && sameBirth ? (
            <p className="mt-2 text-xs text-fg-muted" role="note">
              {t("tzJulian")}
            </p>
          ) : null}
          {birthTime?.zoneSource === "approximate" && sameBirth && tzValue === "auto" ? (
            <p className="ob-tz-note mt-2 text-xs" role="note">
              {t("tzApproximate")}
            </p>
          ) : null}
        </div>
      </details>
      <Button
        type="submit"
        data-testid="cast-submit"
        disabled={busy}
        className="col-span-2 h-11 w-full max-md:sticky max-md:bottom-2 max-md:z-10"
      >
        {busy || status ? status ?? t("casting") : submitLabel ?? t("castChart")}
      </Button>
      <p id="birth-form-hint" className="col-span-2 text-sm text-danger empty:hidden" role="alert" aria-live="assertive">
        {hint ?? ""}
      </p>
    </form>
  );
}
