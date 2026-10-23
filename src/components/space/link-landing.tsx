import "@/components/share/share.css";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { syncWords } from "@/lib/i18n/catalog/sync-words";
import { bookT } from "@/lib/i18n/words-book";
import { loadSpaceRuntime } from "@/lib/space/load";
import { openSpaceSheet, useSpace } from "@/lib/space/state";

/*
 * The page a device link's QR code opens, /link (share and compare plan, feature 4;
 * docs/sync-protocol.md, section 8). The server sends the same page for every link: it never sees
 * the part after "#", which holds the link and the opening device's key. Here that part is read
 * and at once taken out of the address bar, then handed to the private space's sheet: on a device
 * whose space syncs (open, or opened first), as the device that gives the key; elsewhere, as the
 * new device that takes it (its own space, if it has one, joins the synced one). When the sheet
 * closes, the studio opens.
 */

let taken = "";

function takeFragment(): string {
  const hash = window.location.hash;
  if (hash) {
    taken = hash.slice(1);
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }
  return taken;
}

export function DeviceLinkLanding() {
  const { t: tc, locale } = useI18n();
  const t = bookT(syncWords, tc, locale);
  const router = useRouter();
  const status = useSpace((s) => s.status);
  const sync = useSpace((s) => s.sync);
  const sheet = useSpace((s) => s.sheet);
  const [state, setState] = useState<"reading" | "unlock" | "handed" | "broken">("reading");
  const handed = useRef(false);

  // The link, read once and handed to the sheet when this device's space is known (and open, if it has one).
  useEffect(() => {
    if (handed.current) return;
    const text = takeFragment();
    if (!text) {
      setState("broken");
      return;
    }
    if (status === "checking") return;
    if (status === "locked") {
      setState("unlock");
      if (!useSpace.getState().sheet) openSpaceSheet("unlock");
      return;
    }
    // A space open here whose sync may not have started yet: whether it syncs is read from the space.
    if (status === "open" && !sync) {
      let on = true;
      void loadSpaceRuntime()
        .then((m) => m.syncsHere())
        .then((syncs) => {
          if (!on || handed.current) return;
          handed.current = true;
          setState("handed");
          openSpaceSheet("link", `${syncs ? "giver" : "taker"}:${text}`);
        });
      return () => {
        on = false;
      };
    }
    handed.current = true;
    setState("handed");
    openSpaceSheet("link", `${status === "open" && sync ? "giver" : "taker"}:${text}`);
  }, [status, sync]);

  // The sheet done (or closed): the studio.
  const opened = useRef(false);
  useEffect(() => {
    if (sheet === "link") opened.current = true;
    else if (opened.current && sheet === null) void router.navigate({ to: "/", replace: true });
  }, [sheet, router]);

  return (
    <div className="min-h-dvh" data-testid="link-page" data-state={state}>
      <header className="flex h-[var(--ob-top-h)] items-center border-b border-border px-4">
        <Link to="/" className="font-display text-xl text-fg" data-testid="back-to-studio">
          ✦ Ulune
        </Link>
      </header>
      <main className="ob-share-landing">
        <h1 className="ob-share-landing-title font-display">{t("syncLinkPageTitle")}</h1>
        <p className="ob-share-landing-p" aria-live="polite">
          {state === "broken" ? t("syncLinkWrong") : state === "unlock" ? t("syncLinkPageUnlock") : t("syncLinkPageReading")}
        </p>
        <div className="ob-share-landing-actions">
          <Link to="/" className="ob-btn ob-btn--ghost" data-testid="link-back">
            <span>{t("syncLinkPageBack")}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
