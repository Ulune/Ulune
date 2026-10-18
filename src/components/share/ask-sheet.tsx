import { Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/locale";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { bookT } from "@/lib/i18n/words-book";
import { cleanText } from "@/lib/share/format";
import { makeRequestLink } from "@/lib/share/link";
import { ASKER_MAX, requestPage } from "@/lib/share/request";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";
import { LinkOut, Switch } from "./link-out";
import { trapTab } from "./trap-tab";
import { closeAskSheet } from "./share-state";
import "./share.css";

/*
 * Ask someone for their chart (share and compare plan, idea B4): a link that
 * opens Ulune's birth form for them (lib/share/request.ts). It holds no birth,
 * only the request: the asker's interface language, the page their chart
 * will open on (the page on screen, or its language's birth chart when that
 * page needs two people or a place), and the asker's first name only if the
 * asker chooses to say it is them (off by default). The sheet shows what the
 * recipient will read at the top of the form, then the link's ways out, as
 * the share sheet does: the system's share sheet, Copy link, the link, and
 * its QR code for someone next to you. Nothing is stored, here or on any
 * server; the name typed goes only into the link.
 */
export function AskSheet() {
  const { t: tc, locale } = useI18n();
  const t = bookT(shareWords, tc, locale);
  const page = useStudioStore((s) => s.page);
  const opens = requestPage(page);
  const [sayName, setSayName] = useState(false);
  const [name, setName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const asker = sayName ? cleanText(name, ASKER_MAX) : "";
  const base = useId();
  const titleId = `${base}-title`;
  const bodyId = `${base}-body`;
  const nameId = `${base}-name`;
  const cardRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // A new link (a new key) whenever what it holds changes.
  useEffect(() => {
    let on = true;
    setLink(null);
    setFailed(false);
    makeRequestLink(window.location.origin, { asker: asker || undefined, lang: locale === "fr" ? "fr" : "en", page: opens }).then(
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
  }, [asker, locale, opens]);

  // The focus goes to Copy link once the first link is made, and back where it was when the sheet closes.
  useEffect(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const back = returnTo.current;
      if (back && back.isConnected && back.offsetParent) back.focus();
    };
  }, []);
  const focused = useRef(false);
  useEffect(() => {
    if (!link || focused.current) return;
    focused.current = true;
    copyRef.current?.focus();
  }, [link]);
  // A menu or the palette that opened the sheet gives the focus back to its own button as it closes, a frame or two later: into the sheet again.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const card = cardRef.current;
      if (card && !card.contains(document.activeElement)) card.querySelector<HTMLElement>("[data-testid=ask-copy]:not(:disabled), button")?.focus();
    }, 250);
    return () => window.clearTimeout(id);
  }, []);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAskSheet();
      return;
    }
    trapTab(e, cardRef.current);
  }

  if (typeof document === "undefined") return null;
  const [open, close] = locale === "fr" ? ["«\u202f", "\u202f»"] : ["“", "”"];
  return createPortal(
    <div
      className="ob-space-scrim ob-share-scrim"
      data-testid="ask-sheet"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closeAskSheet();
      }}
    >
      <div ref={cardRef} className="ob-space ob-share" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} onKeyDown={onKey}>
        <div className="ob-space-head">
          <Send className="size-4 ob-space-mark" strokeWidth={1.75} aria-hidden />
          <h2 id={titleId} className="ob-space-title">
            {t("askTitle")}
          </h2>
          <button type="button" className="ob-icon-btn ob-icon-btn--quiet" aria-label={t("shareClose")} data-testid="ask-close" onClick={closeAskSheet}>
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <p className="ob-share-intro">{t("askIntro")}</p>

        <div className="ob-share-switches">
          <Switch
            id={`${base}-say`}
            on={sayName}
            onChange={(next) => {
              setSayName(next);
              if (next) window.requestAnimationFrame(() => nameRef.current?.focus());
            }}
            label={t("askSayName")}
            hint={t("askSayNameHint")}
            testId="ask-say-name"
          />
          {sayName ? (
            <div className="ob-share-name">
              <label htmlFor={nameId} className="ob-share-h">
                {t("askNameLabel")}
              </label>
              <input
                ref={nameRef}
                id={nameId}
                className="ob-space-input"
                data-testid="ask-name"
                value={name}
                maxLength={ASKER_MAX}
                autoComplete="given-name"
                spellCheck={false}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <section className="ob-share-holds" aria-labelledby={`${base}-see`}>
          <h3 id={`${base}-see`} className="ob-share-h">
            {t("askTheySee")}
          </h3>
          <p className="ob-share-line ob-share-quote" data-testid="ask-preview">
            {open}
            {asker ? t("requestHead", { name: asker }) : t("requestHeadAnon")}
            {close}
          </p>
          <p className="ob-share-opens" data-testid="ask-opens">
            {t("askOpensOn", { page: tc(PAGE_LABEL[opens]) })}
          </p>
        </section>

        <p id={bodyId} className="ob-space-note ob-share-privacy" data-testid="ask-privacy">
          {t("askPrivacy")}
        </p>

        {failed ? (
          <p className="ob-space-err" role="alert">
            {t("shareFailed")}
          </p>
        ) : null}

        <LinkOut link={link} prefix="ask" qrHint={t("askQrHint")} copyRef={copyRef} />
      </div>
    </div>,
    document.body,
  );
}
