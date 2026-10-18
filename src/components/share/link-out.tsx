import { Check, Copy, Share2 } from "lucide-react";
import { useId, useMemo, useRef, useState, type RefObject } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { bookT } from "@/lib/i18n/words-book";
import { encodeQr, qrPath } from "@/lib/share/qr";
import { cn } from "@/lib/utils";

/*
 * A link's ways out, under a sheet that made it (share plan, feature 1;
 * idea B1; idea B4): the system's share sheet where there is one (phones,
 * Safari), Copy link with its "Copied", the link itself to select by hand,
 * and the link as a QR code for someone next to you. The share sheet and
 * the request sheet both end with it; `prefix` names their test ids
 * ("share-copy", "ask-copy"…). The message the system sheet sends is only
 * "Ulune" and the link: no name or birth in its text.
 */
export function LinkOut({
  link,
  prefix,
  qrHint,
  copyRef,
}: {
  link: string | null;
  prefix: "share" | "ask";
  qrHint: string;
  /** The Copy button, for the sheet to give it the focus once the first link is made. */
  copyRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { t: tc, locale } = useI18n();
  const t = bookT(shareWords, tc, locale);
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");
  const [shownFor, setShownFor] = useState(link);
  const linkRef = useRef<HTMLInputElement>(null);
  const linkId = `${useId()}-link`;
  // A new link (a switch changed what it holds): no "Copied" left from the last one.
  if (shownFor !== link) {
    setShownFor(link);
    setCopied("no");
  }
  const qr = useMemo(() => (link ? encodeQr(link) : null), [link]);
  const canSend = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function send() {
    if (!link) return;
    const data = { title: "Ulune", url: link };
    if (navigator.canShare && !navigator.canShare(data)) return void copy();
    try {
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

  return (
    <>
      <div className="ob-share-actions">
        {canSend ? (
          <button type="button" className="ob-btn ob-btn--primary" data-testid={`${prefix}-send`} disabled={!link} onClick={() => void send()}>
            <Share2 className="size-4" strokeWidth={1.75} aria-hidden />
            <span>{t("shareSend")}</span>
          </button>
        ) : null}
        <button
          ref={copyRef}
          type="button"
          className={cn("ob-btn", canSend ? "ob-btn--ghost" : "ob-btn--primary")}
          data-testid={`${prefix}-copy`}
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
        <p className="ob-space-err" data-testid={`${prefix}-copy-failed`}>
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
          data-testid={`${prefix}-link`}
          readOnly
          value={link ?? t("shareMaking")}
          aria-busy={!link}
          spellCheck={false}
          autoComplete="off"
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <figure className="ob-share-qr" data-testid={`${prefix}-qr-box`}>
        {qr ? (
          <svg
            className="ob-share-qr-svg"
            viewBox={`0 0 ${qr.size + 8} ${qr.size + 8}`}
            role="img"
            aria-label={t("shareQrLabel")}
            data-testid={`${prefix}-qr`}
            data-version={qr.version}
            shapeRendering="crispEdges"
          >
            <rect className="ob-share-qr-paper" width={qr.size + 8} height={qr.size + 8} />
            <path className="ob-share-qr-ink" d={qrPath(qr, 4)} />
          </svg>
        ) : (
          <span className="ob-share-qr-svg ob-share-qr-wait" aria-hidden />
        )}
        <figcaption className="ob-space-note">{qrHint}</figcaption>
      </figure>
    </>
  );
}

/** One switch: its name and what it means, the track showing on or off (aria-checked says it too). */
export function Switch({ id, on, onChange, label, hint, testId }: { id: string; on: boolean; onChange: (next: boolean) => void; label: string; hint: string; testId: string }) {
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
