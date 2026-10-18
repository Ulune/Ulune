import { Share2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { useI18n } from "@/lib/i18n/locale";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { bookT } from "@/lib/i18n/words-book";
import { hasOwnName, isPairPage, partnerRow, previewLine, sharedBirthOf } from "@/lib/share/compose";
import type { SharePayload } from "@/lib/share/format";
import { makeShareLink } from "@/lib/share/link";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";
import { LinkOut, Switch } from "./link-out";
import { trapTab } from "./trap-tab";
import { closeShareSheet, useShareUi } from "./share-state";
import "./share.css";

/*
 * The share sheet (share plan, feature 1; idea B1): a link to the chart on
 * screen, which opens the page it was shared from (from Feng Shui's Home,
 * Feng Shui's own page: a home never goes in a link). Before anything goes, it
 * shows what the link holds ("Camille · 15 June 1990, 12:00 · Paris"), with
 * a switch for the name and one for the place's name, both on (S1: the
 * coordinates always go, the chart needs them), and one line on privacy. On
 * a Relationship page it offers both charts in one link (S3). Then: the
 * system's share sheet where there is one (phones, Safari), Copy link, and
 * the link as a QR code for someone next to you. There is no password, ever
 * (S4). The link is made in the browser and never passes through Ulune's
 * server (lib/share/link.ts).
 *
 * Opened from "Send it back" (idea B4), it shares the chart just cast for
 * the person who asked for it, says so in a line, and starts with the name
 * in (as it always does): the asker receives an ordinary share link.
 */

type Which = "one" | "both";

export function ShareSheet() {
  const { t: tc, locale } = useI18n();
  const t = bookT(shareWords, tc, locale);
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const pair = useStudioStore((s) => s.pair);
  const shownPage = useStudioStore((s) => s.page);
  // Feng Shui's Home is a home on this device, which no link carries: its link opens Feng Shui's own page for the person.
  const page = shownPage === "fengshui-home" ? "fengshui" : shownPage;
  const rowA = rows.find((r) => r.id === activeId) ?? null;
  const rowB = useMemo(() => partnerRow({ rows, activeId, pair }, page), [rows, activeId, pair, page]);
  const canBoth = Boolean(rowA && rowB && isPairPage(page));
  const [which, setWhich] = useState<Which>("one");
  const [keepName, setKeepName] = useState(true);
  const [keepPlace, setKeepPlace] = useState(true);
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Sending a chart back to the person who asked for it (idea B4).
  const reply = useShareUi((s) => s.reply);
  const base = useId();
  const titleId = `${base}-title`;
  const bodyId = `${base}-body`;
  const cardRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const both = canBoth && which === "both";
  const shown = useMemo(() => (rowA ? (both && rowB ? [rowA, rowB] : [rowA]) : []), [rowA, rowB, both]);
  const charts = useMemo(() => shown.map((row) => sharedBirthOf(row, { name: keepName, place: keepPlace })), [shown, keepName, keepPlace]);
  // A switch only when it has something to leave out.
  const hasName = shown.some((row) => hasOwnName(row) || Boolean(row.input.birthName?.trim() || row.input.currentName?.trim()));
  const hasPlace = shown.some((row) => Boolean(row.input.placeLabel.trim()));

  // A new link (a new key) whenever what it holds changes.
  useEffect(() => {
    // No chart kept on screen (one still being made): nothing to share.
    if (!charts.length) {
      setFailed(true);
      return;
    }
    let on = true;
    setLink(null);
    setFailed(false);
    makeShareLink(window.location.origin, { page, charts: charts as SharePayload["charts"] }).then(
      (made) => {
        if (on) setLink(made);
      },
      () => {
        if (on) setFailed(true);
      },
    );
    return () => {
      on = false;
    };
  }, [charts, page]);

  // The focus goes to Copy link once the first link is made, and back where it was when the sheet closes.
  useEffect(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const back = returnTo.current;
      if (back && back.isConnected) back.focus();
    };
  }, []);
  const focused = useRef(false);
  useEffect(() => {
    if (!link || focused.current) return;
    focused.current = true;
    copyRef.current?.focus();
  }, [link]);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeShareSheet();
      return;
    }
    // The focus stays inside the sheet.
    trapTab(e, cardRef.current);
  }

  if (typeof document === "undefined") return null;
  const timeUnknown = tc("timeUnknown");
  return createPortal(
    <div
      className="ob-space-scrim ob-share-scrim"
      data-testid="share-sheet"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closeShareSheet();
      }}
    >
      <div ref={cardRef} className="ob-space ob-share" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} onKeyDown={onKey}>
        <div className="ob-space-head">
          <Share2 className="size-4 ob-space-mark" strokeWidth={1.75} aria-hidden />
          <h2 id={titleId} className="ob-space-title">
            {tc("shareLink")}
          </h2>
          <button type="button" className="ob-icon-btn ob-icon-btn--quiet" aria-label={t("shareClose")} data-testid="share-close" onClick={closeShareSheet}>
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {reply ? (
          <p className="ob-share-reply" data-testid="share-reply">
            {reply.asker ? t("shareReplyTo", { name: reply.asker }) : t("shareReplyToAnon")}
          </p>
        ) : null}

        {canBoth ? (
          <div className="ob-share-which">
            <SegmentedToggle<Which>
              ariaLabel={t("shareWhich")}
              value={which}
              onChange={setWhich}
              options={[
                { value: "one", testId: "share-one", label: t("shareOne") },
                { value: "both", testId: "share-both", label: t("shareBoth") },
              ]}
            />
          </div>
        ) : null}

        <section className="ob-share-holds" aria-labelledby={`${base}-holds`}>
          <h3 id={`${base}-holds`} className="ob-share-h">
            {t("shareContains")}
          </h3>
          <ul className="ob-share-lines" data-testid="share-preview">
            {charts.map((birth, i) => (
              <li key={i} className="ob-share-line" data-testid={`share-preview-${i}`}>
                {previewLine(birth, locale, timeUnknown)}
              </li>
            ))}
          </ul>
          <p className="ob-share-opens" data-testid="share-opens">
            {t("shareOpensOn", { page: tc(PAGE_LABEL[page]) })}
          </p>
        </section>

        {hasName || hasPlace ? (
          <div className="ob-share-switches">
            {hasName ? <Switch id={`${base}-name`} on={keepName} onChange={setKeepName} label={t("shareName")} hint={t("shareNameHint")} testId="share-keep-name" /> : null}
            {hasPlace ? (
              <Switch id={`${base}-place`} on={keepPlace} onChange={setKeepPlace} label={t("sharePlace")} hint={t("sharePlaceHint")} testId="share-keep-place" />
            ) : null}
          </div>
        ) : null}

        <p id={bodyId} className="ob-space-note ob-share-privacy" data-testid="share-privacy">
          {t(both ? "sharePrivacyBoth" : "sharePrivacy")}
        </p>

        {failed ? (
          <p className="ob-space-err" role="alert">
            {t("shareFailed")}
          </p>
        ) : null}

        <LinkOut link={link} prefix="share" qrHint={t("shareQrHint")} copyRef={copyRef} />
      </div>
    </div>,
    document.body,
  );
}
