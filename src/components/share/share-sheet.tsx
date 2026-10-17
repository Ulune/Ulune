import { Check, Copy, Share2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { useI18n } from "@/lib/i18n/locale";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { bookT } from "@/lib/i18n/words-book";
import { hasOwnName, isPairPage, partnerRow, previewLine, sharedBirthOf } from "@/lib/share/compose";
import type { SharePayload } from "@/lib/share/format";
import { makeShareLink } from "@/lib/share/link";
import { encodeQr, qrPath } from "@/lib/share/qr";
import { cn } from "@/lib/utils";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";
import { closeShareSheet } from "./share-state";
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
 */

type Which = "one" | "both";

/** One switch: its name and what it means, the track showing on or off (aria-checked says it too). */
function Switch({ id, on, onChange, label, hint, testId }: { id: string; on: boolean; onChange: (next: boolean) => void; label: string; hint: string; testId: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-hint`}
      data-testid={testId}
      className={cn("ob-share-switch", on && "is-on")}
      onClick={() => onChange(!on)}
    >
      <span className="ob-share-switch-words">
        <span id={`${id}-label`} className="ob-share-switch-name">
          {label}
        </span>
        <span id={`${id}-hint`} className="ob-share-switch-hint">
          {hint}
        </span>
      </span>
      <span className="ob-share-switch-track" aria-hidden>
        <span className="ob-share-switch-thumb" />
      </span>
    </button>
  );
}

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
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");
  const base = useId();
  const titleId = `${base}-title`;
  const bodyId = `${base}-body`;
  const linkId = `${base}-link`;
  const cardRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
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
    setCopied("no");
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

  const qr = useMemo(() => (link ? encodeQr(link) : null), [link]);

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
    if (e.key !== "Tab") return;
    // The focus stays inside the sheet.
    const items = Array.from(cardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href]") ?? []).filter(
      (el) => el.offsetParent !== null,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const canSend = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function send() {
    if (!link) return;
    const data = { title: "Ulune", url: link };
    if (navigator.canShare && !navigator.canShare(data)) return void copy();
    try {
      // Only the link: no name or birth in the message's text.
      await navigator.share(data);
    } catch {
      /* closed without sharing */
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied("yes");
      window.setTimeout(() => setCopied((now) => (now === "yes" ? "no" : now)), 2400);
    } catch {
      // Copied by hand, then: the link is selected for it.
      setCopied("failed");
      linkRef.current?.focus();
      linkRef.current?.select();
    }
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

        <div className="ob-share-actions">
          {canSend ? (
            <button type="button" className="ob-btn ob-btn--primary" data-testid="share-send" disabled={!link} onClick={() => void send()}>
              <Share2 className="size-4" strokeWidth={1.75} aria-hidden />
              <span>{t("shareSend")}</span>
            </button>
          ) : null}
          <button
            ref={copyRef}
            type="button"
            className={cn("ob-btn", canSend ? "ob-btn--ghost" : "ob-btn--primary")}
            data-testid="share-copy"
            data-copied={copied === "yes" ? "" : undefined}
            disabled={!link}
            onClick={() => void copy()}
          >
            {copied === "yes" ? <Check className="size-4" strokeWidth={2} aria-hidden /> : <Copy className="size-4" strokeWidth={1.75} aria-hidden />}
            <span>{copied === "yes" ? t("shareCopied") : t("shareCopy")}</span>
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {copied === "yes" ? t("shareCopied") : copied === "failed" ? t("shareCopyFailed") : ""}
        </p>
        {copied === "failed" ? (
          <p className="ob-space-err" data-testid="share-copy-failed">
            {t("shareCopyFailed")}
          </p>
        ) : null}

        <div className="ob-share-link">
          <label htmlFor={linkId} className="ob-share-h">
            {t("shareLinkLabel")}
          </label>
          <input
            ref={linkRef}
            id={linkId}
            className="ob-space-input ob-share-link-input"
            data-testid="share-link"
            readOnly
            value={link ?? t("shareMaking")}
            aria-busy={!link}
            spellCheck={false}
            autoComplete="off"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>

        <figure className="ob-share-qr" data-testid="share-qr-box">
          {qr ? (
            <svg
              className="ob-share-qr-svg"
              viewBox={`0 0 ${qr.size + 8} ${qr.size + 8}`}
              role="img"
              aria-label={t("shareQrLabel")}
              data-testid="share-qr"
              data-version={qr.version}
              shapeRendering="crispEdges"
            >
              <rect className="ob-share-qr-paper" width={qr.size + 8} height={qr.size + 8} />
              <path className="ob-share-qr-ink" d={qrPath(qr, 4)} />
            </svg>
          ) : (
            <span className="ob-share-qr-svg ob-share-qr-wait" aria-hidden />
          )}
          <figcaption className="ob-space-note">{t("shareQrHint")}</figcaption>
        </figure>
      </div>
    </div>,
    document.body,
  );
}
