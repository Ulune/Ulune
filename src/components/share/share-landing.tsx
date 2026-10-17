import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { importWithRetry } from "@/lib/lazy-retry";
import { ShareLinkError } from "@/lib/share/bytes";
import type { SharePayload } from "@/lib/share/format";
import { readShareFragment } from "@/lib/share/link";
import "./share.css";

/*
 * The page a share link opens, /s (share plan, feature 1). The server sends
 * the same page for every link: it never sees the part after "#", which
 * holds the chart. Here, in the browser, that part is read and at once taken
 * out of the address bar (so it stays in no history and is never copied by
 * accident), checked, and the charts opened in the studio on the page the
 * link names (lib/share/arrive.ts). A link that does not read says so, in
 * the reader's language, with a way into Ulune; a cast that fails (offline)
 * can be tried again with what was read.
 */

type Shown = "opening" | "broken" | "newer" | "failed";

/**
 * The part after "#", taken out of the address bar (the page's history
 * entry keeps its state). Held here once taken: React runs a page's effect
 * twice in development, and the second run must find the same link.
 */
let taken = "";

function takeFragment(): string {
  const hash = window.location.hash;
  if (hash) {
    taken = hash;
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }
  return taken;
}

export function ShareLanding() {
  const { t: tc, locale } = useI18n();
  const t = bookT(shareWords, tc, locale);
  const router = useRouter();
  const [shown, setShown] = useState<Shown>("opening");
  const payload = useRef<SharePayload | null>(null);
  const busy = useRef(false);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const open = useCallback(
    async (read: SharePayload) => {
      if (busy.current) return;
      busy.current = true;
      setShown("opening");
      try {
        const { receiveShared } = await importWithRetry(() => import("@/lib/share/arrive"));
        const ok = await receiveShared(read, (href) => router.navigate({ href, replace: true }), localeRef.current);
        if (ok) taken = "";
        else setShown("failed");
      } catch {
        setShown("failed");
      } finally {
        busy.current = false;
      }
    },
    [router],
  );

  useEffect(() => {
    const arrive = async () => {
      const fragment = takeFragment();
      try {
        payload.current = await readShareFragment(fragment);
      } catch (err) {
        setShown(err instanceof ShareLinkError && err.reason === "newer" ? "newer" : "broken");
        return;
      }
      await open(payload.current);
    };
    void arrive();
    // Another link pasted while this page is open changes only the part after "#".
    const again = () => {
      if (window.location.hash) void arrive();
    };
    window.addEventListener("hashchange", again);
    return () => window.removeEventListener("hashchange", again);
  }, [open]);

  return (
    <div className="min-h-dvh" data-testid="share-page" data-state={shown}>
      <header className="flex h-[var(--ob-top-h)] items-center border-b border-border px-4">
        <Link to="/" className="font-display text-xl text-fg" data-testid="back-to-studio">
          ✦ Ulune
        </Link>
      </header>
      <main className="ob-share-landing">
        {shown === "opening" ? (
          <>
            <h1 className="ob-share-landing-title font-display">{t("sharePageTitle")}</h1>
            <p className="ob-share-landing-p">{t("shareOpening")}</p>
            <LoadingLines />
          </>
        ) : (
          <>
            <h1 className="ob-share-landing-title font-display" data-testid="share-problem">
              {t(shown === "failed" ? "shareFailedTitle" : "shareBrokenTitle")}
            </h1>
            <p className="ob-share-landing-p">
              {t(shown === "failed" ? "shareFailedBody" : shown === "newer" ? "shareNewerBody" : "shareBrokenBody")}
            </p>
            <div className="ob-share-landing-actions">
              {shown === "failed" && payload.current ? (
                <button
                  type="button"
                  className="ob-btn ob-btn--primary"
                  data-testid="share-retry"
                  onClick={() => payload.current && void open(payload.current)}
                >
                  <span>{t("shareRetry")}</span>
                </button>
              ) : null}
              <Link to="/" className={shown === "failed" ? "ob-btn ob-btn--ghost" : "ob-btn ob-btn--primary"} data-testid="share-open-ulune">
                <span>{t("shareOpenUlune")}</span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
