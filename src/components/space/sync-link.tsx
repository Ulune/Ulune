import "@/components/share/share.css";
import "./sync.css";
import { Camera, Copy } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { syncWords } from "@/lib/i18n/catalog/sync-words";
import { bookT } from "@/lib/i18n/words-book";
import { importWithRetry } from "@/lib/lazy-retry";
import { encodeQr, qrPath } from "@/lib/share/qr";
import type { WayIn } from "@/lib/space/vault";
import type { Joined, LinkSide } from "@/lib/account/client/setup";
import { accountAvailable } from "@/lib/account/client/available";

/*
 * A device added by QR code (share and compare plan, feature 4; docs/sync-protocol.md, section 8),
 * as the space's sheet shows it on either device. The side that opens the link shows a QR code of
 * Ulune's /link address with the link and its key after "#" (the server never sees that part), and
 * the link itself to copy; the other side scans it (its camera app, or this device's camera where
 * the browser reads QR codes), or the reader pastes the link. Both screens then show the same six
 * digits, each only if no one is in between; each reader says Yes on their own screen. Then the
 * signed-in device seals the data key for the new one, which makes its space from the account.
 *
 * The camera, where offered, is used only after the reader taps Scan, only while scanning, and its
 * pictures never leave this page: the browser's own QR reader (BarcodeDetector) reads them here.
 * While Ulune's server keeps no accounts yet, a link fails with "not available yet", plainly (the
 * 2.0 fixes, item 4).
 */

const loadAccount = () => importWithRetry(() => import("@/lib/account/client/setup"));
type AccountModule = Awaited<ReturnType<typeof loadAccount>>;

type Phase = "opening" | "waiting" | "code" | "confirmed" | "working" | "failed";

type Barcodes = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type BarcodeCtor = new (options: { formats: string[] }) => Barcodes;

/** Whether this browser can read a QR code with this device's camera here (BarcodeDetector, the camera allowed to the page). */
function canScan(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) return false;
  const doc = document as Document & { permissionsPolicy?: { allowsFeature?: (f: string) => boolean }; featurePolicy?: { allowsFeature?: (f: string) => boolean } };
  const policy = doc.permissionsPolicy ?? doc.featurePolicy;
  return !(policy?.allowsFeature && !policy.allowsFeature("camera"));
}

/** What went wrong with a link, for the reader. */
function trouble(err: unknown, t: ReturnType<typeof bookT<typeof syncWords>>): string {
  const code = (err as { code?: string } | null)?.code;
  const message = err instanceof Error ? err.message : "";
  if (message === "link-mismatch") return t("syncLinkMismatch");
  if (message === "not-ready") return t("syncNotReady");
  if (code === "gone") return t("syncLinkWrong");
  if (code === "conflict" || code === "denied") return t("syncLinkSameKind");
  if (code === "slow-down") return t("syncSlowDown");
  return t("syncOffline");
}

/** The camera's picture, read for a QR code of Ulune's until one is found. */
function Scanner({ onText, onClose }: { onText: (text: string) => void; onClose: () => void }) {
  const { t: tc, locale } = useI18n();
  const t = bookT(syncWords, tc, locale);
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let on = true;
    (async () => {
      try {
        const Detector = (window as unknown as { BarcodeDetector: BarcodeCtor }).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!on || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play().catch(() => {});
        const look = async () => {
          if (!on || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            const hit = found.map((f) => f.rawValue).find(Boolean);
            if (hit) {
              onText(hit);
              return;
            }
          } catch {
            /* not ready yet */
          }
          timer = window.setTimeout(() => void look(), 300);
        };
        void look();
      } catch {
        if (on) setFailed(true);
      }
    })();
    return () => {
      on = false;
      window.clearTimeout(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, [onText]);
  return (
    <div className="ob-sync-scan" data-testid="sync-scan">
      {failed ? (
        <p className="ob-space-err" role="alert">
          {t("syncLinkNoCamera")}
        </p>
      ) : (
        <video ref={video} className="ob-sync-video" muted playsInline aria-label={t("syncLinkScan")} />
      )}
      <p className="ob-space-note">{t("syncLinkCameraHint")}</p>
      <button type="button" className="ob-space-link" onClick={onClose}>
        {t("syncLinkScanStop")}
      </button>
    </div>
  );
}

/**
 * One side of a device link. `role`: "giver" on the signed-in device (with `way`, given again, to
 * open the data key), "taker" on the new one (`shared`: a shared computer's space locks). `text`:
 * a link read already (the /link page, a scan), joined at once; otherwise this side opens one.
 * `extra`: shown under the panel's own choices until the space is made (the new device's "shared
 * computer" box, still read when the other side says yes).
 */
export function LinkPanel({
  role,
  text,
  way,
  shared,
  extra = null,
  onDone,
  onCancel,
}: {
  role: "giver" | "taker";
  text: string | null;
  way: WayIn | null;
  shared: boolean;
  extra?: ReactNode;
  onDone: (joined: Joined | null) => void;
  onCancel: () => void;
}) {
  const { t: tc, locale } = useI18n();
  const t = bookT(syncWords, tc, locale);
  const [phase, setPhase] = useState<Phase>("opening");
  const [side, setSide] = useState<LinkSide | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // No accounts on Ulune's server yet: a fact, said calmly, not an error.
  const [notYet, setNotYet] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [paste, setPaste] = useState("");
  const [copied, setCopied] = useState(false);
  const acct = useRef<AccountModule | null>(null);
  const current = useRef<LinkSide | null>(null);
  /** Given: the mailbox must stay until the new device takes it. */
  const keep = useRef(false);
  const pasteId = useId();
  const linkId = useId();

  const fail = useCallback(
    (err: unknown) => {
      // The server said "unavailable": no accounts there yet (asked once a visit), or a passing trouble.
      if ((err as { code?: string } | null)?.code === "unavailable") {
        void accountAvailable().then((ok) => {
          setNotYet(!ok);
          setProblem(t(ok ? "syncOffline" : "syncNotYet"));
          setPhase("failed");
        });
        return;
      }
      setProblem(trouble(err, t));
      setPhase("failed");
    },
    [t],
  );

  const show = useCallback((next: LinkSide) => {
    current.current = next;
    setSide(next);
    setPhase(next.code ? "code" : "waiting");
  }, []);

  /** Join a link read here (scanned, pasted, or the /link page's): this side's own goes. */
  const join = useCallback(
    async (read: string) => {
      const a = acct.current ?? (await loadAccount());
      acct.current = a;
      const linkText = a.linkText(read);
      if (!linkText) {
        setProblem(t("syncLinkWrong"));
        return;
      }
      setScanning(false);
      setProblem(null);
      setPhase("opening");
      const mine = current.current;
      current.current = null;
      if (mine) void a.closeLink(mine);
      try {
        show(await a.joinLink(linkText, role));
      } catch (err) {
        fail(err);
      }
    },
    [fail, role, show, t],
  );

  // Open (or join) once, as the panel opens; the link goes when it closes. A development build mounts a
  // component twice at first: the second mounting finds the link under way and keeps it.
  const started = useRef(false);
  const mounted = useRef(true);
  const closing = useRef(0);
  useEffect(() => {
    window.clearTimeout(closing.current);
    mounted.current = true;
    if (!started.current) {
      started.current = true;
      (async () => {
        try {
          const a = await loadAccount();
          acct.current = a;
          if (text) {
            await join(text);
            return;
          }
          const opened = role === "giver" ? await a.openLinkAsGiver() : await a.openLinkAsTaker();
          if (!mounted.current) {
            void a.closeLink(opened);
            return;
          }
          show(opened);
        } catch (err) {
          if (mounted.current) fail(err);
        }
      })();
    }
    return () => {
      closing.current = window.setTimeout(() => {
        mounted.current = false;
        if (!keep.current) void acct.current?.closeLink(current.current);
      }, 0);
    };
    // The link is made once, as the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The opener waits for the other side (its key gives the code); the new device, after its Yes, for the sealed key.
  useEffect(() => {
    if (phase !== "waiting" && !(phase === "confirmed" && role === "taker")) return;
    let on = true;
    let busy = false;
    const timer = window.setInterval(async () => {
      const s = current.current;
      const a = acct.current;
      if (!on || busy || !s || !a) return;
      if (Date.now() > s.ends) {
        setProblem(t("syncLinkExpired"));
        setPhase("failed");
        return;
      }
      busy = true;
      try {
        const { state, side: next } = await a.linkProgress(s);
        if (!on) return;
        if (phase === "waiting" && next.code) {
          show(next);
        } else if (phase === "confirmed" && state === "given") {
          on = false;
          setPhase("working");
          try {
            onDone(await a.takeLink(next, shared));
          } catch (err) {
            fail(err);
          }
        }
      } catch (err) {
        // A link gone (closed by the other side, expired): said; a network hiccup: tried again.
        if ((err as { code?: string }).code === "gone") {
          on = false;
          setProblem(t("syncLinkExpired"));
          setPhase("failed");
        }
      } finally {
        busy = false;
      }
    }, 1500);
    return () => {
      on = false;
      window.clearInterval(timer);
    };
  }, [phase, role, shared, onDone, fail, show, t]);

  async function yes() {
    const s = current.current;
    const a = acct.current;
    if (!s || !a) return;
    if (role === "taker") {
      setPhase("confirmed");
      return;
    }
    if (!way) return;
    setPhase("working");
    try {
      await a.giveLink(s, way);
      keep.current = true;
      onDone(null);
    } catch (err) {
      fail(err);
    }
  }

  function no() {
    void acct.current?.closeLink(current.current);
    current.current = null;
    setProblem(t("syncLinkStopped"));
    setPhase("failed");
  }

  // A new phase: when the focus went with what the last one showed (it is on the page's body now), its
  // first choice takes it (Yes, Close, Copy the link), so the keyboard stays in the sheet, Escape and Tab with it.
  const panel = useRef<HTMLElement | null>(null);
  const setPanel = useCallback((el: HTMLElement | null) => {
    panel.current = el;
  }, []);
  useEffect(() => {
    const here = panel.current;
    const card = here?.closest<HTMLElement>("[role=dialog]");
    if (!here || !card || card.contains(document.activeElement)) return;
    (here.querySelector<HTMLElement>("[data-autofocus]") ?? here.querySelector<HTMLElement>("button:not([disabled])"))?.focus();
  }, [phase]);

  const address = side?.text && acct.current ? acct.current.linkAddress(side.text) : null;
  const qr = useMemo(() => (address ? encodeQr(address) : null), [address]);
  const scan = canScan();

  if (phase === "failed") {
    return (
      <div ref={setPanel} className="ob-sync-link" data-testid="sync-link" data-phase="failed">
        <p className={notYet ? "ob-space-p" : "ob-space-err"} role={notYet ? "status" : "alert"} data-testid="sync-link-problem">
          {problem}
        </p>
        <div className="ob-space-actions">
          <button type="button" className="ob-btn ob-btn--ghost" data-autofocus onClick={onCancel}>
            {tc("spaceClose")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "code" || phase === "confirmed") {
    return (
      <div ref={setPanel} className="ob-sync-link" data-testid="sync-link" data-phase={phase}>
        <p className="ob-space-p">{t("syncLinkCodeBody")}</p>
        <p className="ob-sync-digits" data-testid="sync-link-code" aria-live="polite">
          {side?.code}
        </p>
        {phase === "code" ? (
          <>
            <p className="ob-space-p ob-sync-ask">{t("syncLinkCode")}</p>
            <div className="ob-space-actions">
              <button type="button" className="ob-btn ob-btn--primary" data-testid="sync-link-yes" data-autofocus onClick={() => void yes()}>
                {t("syncLinkYes")}
              </button>
              <button type="button" className="ob-btn ob-btn--ghost" data-testid="sync-link-no" onClick={no}>
                {t("syncLinkNo")}
              </button>
            </div>
          </>
        ) : (
          <p className="ob-space-p ob-space-busy" aria-live="polite" data-testid="sync-link-wait-other">
            <span className="ob-space-spin" aria-hidden />
            {t("syncLinkWaitOther")}
          </p>
        )}
        {extra}
      </div>
    );
  }

  if (phase === "working" || phase === "opening") {
    return (
      <p ref={setPanel} className="ob-space-p ob-space-busy" aria-live="polite" data-testid="sync-link" data-phase={phase}>
        <span className="ob-space-spin" aria-hidden />
        {phase === "opening" ? t(text ? "syncLinkPageReading" : "syncLinkOpening") : t(role === "giver" ? "syncLinkGiving" : "syncJoining")}
      </p>
    );
  }

  // Waiting: this side's code to scan, its link to copy, and the other ways to read the other's.
  return (
    <div ref={setPanel} className="ob-sync-link" data-testid="sync-link" data-phase="waiting" data-role={role}>
      <p className="ob-space-p ob-sync-ask">{t(role === "giver" ? "syncLinkGiverTitle" : "syncLinkTakerTitle")}</p>
      <p className="ob-space-p">{t(role === "giver" ? "syncLinkGiverBody" : "syncLinkTakerBody")}</p>
      <figure className="ob-share-qr ob-sync-qr" data-testid="sync-link-qr-box">
        {qr ? (
          <svg className="ob-share-qr-svg" viewBox={`0 0 ${qr.size + 8} ${qr.size + 8}`} role="img" aria-label={t("syncLinkQrLabel")} data-testid="sync-link-qr" shapeRendering="crispEdges">
            <rect className="ob-share-qr-paper" width={qr.size + 8} height={qr.size + 8} />
            <path className="ob-share-qr-ink" d={qrPath(qr, 4)} />
          </svg>
        ) : (
          <span className="ob-share-qr-svg ob-share-qr-wait" aria-hidden />
        )}
      </figure>
      <div className="ob-share-link">
        <label htmlFor={linkId} className="ob-share-h">
          {t("syncLinkAddress")}
        </label>
        <div className="ob-sync-row">
          <input id={linkId} className="ob-space-input ob-share-link-input" data-testid="sync-link-address" readOnly value={address ?? ""} spellCheck={false} autoComplete="off" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="ob-btn ob-btn--ghost"
            data-testid="sync-link-copy"
            onClick={() => {
              if (!address) return;
              void navigator.clipboard?.writeText(address).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            <Copy className="size-4" strokeWidth={1.75} aria-hidden />
            <span>{copied ? t("syncCopied") : t("syncCopyLink")}</span>
          </button>
        </div>
      </div>
      <p className="ob-space-p ob-space-busy ob-sync-waiting" aria-live="polite">
        <span className="ob-space-spin" aria-hidden />
        {t("syncLinkWaiting")}
      </p>
      {scanning ? <Scanner onText={(read) => void join(read)} onClose={() => setScanning(false)} /> : null}
      {scan && !scanning ? (
        <button type="button" className="ob-btn ob-btn--ghost" data-testid="sync-link-scan" onClick={() => setScanning(true)}>
          <Camera className="size-4" strokeWidth={1.75} aria-hidden />
          {t("syncLinkScan")}
        </button>
      ) : null}
      <form
        className="ob-space-field"
        onSubmit={(e) => {
          e.preventDefault();
          void join(paste);
        }}
      >
        <label htmlFor={pasteId}>{t("syncLinkPaste")}</label>
        <div className="ob-sync-row">
          <input id={pasteId} className="ob-space-input" data-testid="sync-link-paste" value={paste} autoComplete="off" spellCheck={false} onChange={(e) => setPaste(e.target.value)} />
          <button type="submit" className="ob-btn ob-btn--ghost" data-testid="sync-link-paste-go" disabled={!paste.trim()}>
            {t("syncLinkPasteGo")}
          </button>
        </div>
        {problem ? (
          <p className="ob-space-err" role="alert">
            {problem}
          </p>
        ) : null}
      </form>
      {extra}
      <div className="ob-space-actions">
        <button type="button" className="ob-space-link" data-testid="sync-link-cancel" onClick={onCancel}>
          {tc("spaceCancel")}
        </button>
      </div>
    </div>
  );
}
