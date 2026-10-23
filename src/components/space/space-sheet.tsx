import { Eye, EyeOff, Lock, QrCode, Send, X } from "lucide-react";
import {
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { spaceWords } from "@/lib/i18n/catalog/space-words";
import { syncWords } from "@/lib/i18n/catalog/sync-words";
/** The sheet's own words: the private space's book and the synced account's (feature 4). */
const WORDS = { ...spaceWords, ...syncWords };
/** A key of the app's catalog or of this component's own books. */
type MessageKey = CatalogKey | keyof typeof WORDS;
import type { MessageKey as CatalogKey } from "@/lib/i18n/messages";
import { devicesText, type DevicesKey } from "@/lib/i18n/space-devices";
import { dateFormat } from "@/lib/intl-cache";
import { lazyNamed } from "@/lib/lazy-component";
import { importWithRetry } from "@/lib/lazy-retry";
import { MIN_PASSPHRASE, formatRecoveryCode, newRecoveryCode, newSpaceSeed, normalizePassphrase } from "@/lib/space/crypto";
import { eraseLegacyData, legacyChartCount } from "@/lib/space/legacy";
import { loadSpaceRuntime } from "@/lib/space/load";
import {
  forgetUnusedPasskey,
  makePasskey,
  readPasskey,
  type PasskeyRef,
  type PasskeySecretRead,
} from "@/lib/space/passkey";
import { inSafariTab } from "@/lib/space/home-screen";
import { passkeyPrfLikely, passkeysPossible } from "@/lib/space/passkey-support";
import { closeSpaceSheet, useSpace, type SpaceSheet as SheetKind } from "@/lib/space/state";
import type { SpaceBackup, WayIn } from "@/lib/space/vault";
import { toast } from "@/lib/toast";
import type { AccountWay, Begun, Joined } from "@/lib/account/client/setup";

/*
 * The private space's sheet: signing in for the first time (a passkey or a
 * passphrase, then the recovery code, shown once), unlocking (a passkey, the
 * passphrase, or the recovery code and then a new passphrase), changing what
 * opens the space (each change asks for one of its ways in first), and the one
 * question about charts kept in the clear before private spaces. Its own
 * download (space-gate.tsx).
 *
 * The synced account (share and compare plan, feature 4), whose code loads
 * only when one of its steps is used (lib/account/client): the choice when the
 * space is made, this device only (the default, decision A4) or this device
 * and the reader's other devices; a new device signing in (a passkey, a QR
 * code, the account id and the passphrase, the recovery code, or a file as
 * before); sync turned on or off; the account deleted; a device removed; this
 * device signed in again. While the space syncs, a change to its ways in is
 * made on the account too, after a fresh sign-in with the way given.
 *
 * A passkey's window is asked for straight from the click that wants it, with
 * nothing awaited before, as some browsers only allow it then: the account's
 * challenge is fetched as the step that may need it shows.
 */

/**
 * The synced account's code, fetched when a step needs it. Every step that shows an account id comes
 * after it loaded, so the id's spelling (account-id.ts) is kept from it rather than imported here: its
 * file would join the list of those "/" names for this sheet.
 */
let shownId: ((account: string) => string) | null = null;
const loadAccount = () =>
  importWithRetry(() => import("@/lib/account/client/setup")).then((m) => {
    shownId = m.formatAccountId;
    return m;
  });
const loadPasskeys = () => importWithRetry(() => import("@/lib/account/client/passkeys"));
type PasskeysModule = Awaited<ReturnType<typeof loadPasskeys>>;
const LinkPanel = lazyNamed(() => import("./sync-link"), "LinkPanel");

/** The sheets that change the open space's ways in. */
type Manage = "passphrase" | "remove-passphrase" | "add-passkey" | "remove-passkey" | "new-code";

function isManage(sheet: SheetKind): sheet is Manage {
  return (
    sheet === "passphrase" ||
    sheet === "remove-passphrase" ||
    sheet === "add-passkey" ||
    sheet === "remove-passkey" ||
    sheet === "new-code"
  );
}

/** What changes the account itself: a fresh sign-in with the way given, while the space syncs. */
function accountFresh(sheet: SheetKind): boolean {
  return isManage(sheet) || sheet === "sync-off" || sheet === "delete-account" || sheet === "remove-device";
}

/** The sheets that need the space open: if it locks meanwhile, the sheet goes. */
function needsOpen(sheet: SheetKind): boolean {
  return (
    isManage(sheet) ||
    sheet === "import" ||
    sheet === "add-device" ||
    sheet === "sync-on" ||
    sheet === "sync-off" ||
    sheet === "delete-account" ||
    sheet === "remove-device" ||
    sheet === "sign-in-again"
  );
}

type Step =
  | { kind: "choose" }
  | { kind: "passphrase" }
  | { kind: "busy"; label: MessageKey }
  /** A recovery code, shown once: a new space's (`fresh`), or a new one for the space; with the account's id once it syncs. */
  | { kind: "code"; code: string; fresh: boolean; synced?: boolean; account?: string | null }
  | { kind: "unlock" }
  | { kind: "recovery" }
  /** Before a change to the ways in: one of them, given again. */
  | { kind: "confirm" }
  | { kind: "confirm-code" }
  /** A passphrase to set: after unlocking with the recovery code, or changed, or added, or for turning sync on. */
  | { kind: "newpass"; after: "recovery" | "change" | "add" | "sync" }
  /** A backup file to choose: made this browser's space, or its charts added to the open one. */
  | { kind: "file"; purpose: BackupUse }
  /** The chosen backup, opened with one of its own ways in. */
  | { kind: "backup"; purpose: BackupUse; backup: SpaceBackup }
  | { kind: "backup-code"; purpose: BackupUse; backup: SpaceBackup }
  /** The space for another device: the sealed copy being made, then sent (or saved). */
  | { kind: "send"; files: SpaceCopy | null; done: "sent" | "saved" | null }
  | { kind: "legacy" }
  /** The synced account: the ways in on a new device; the account id and passphrase; the recovery code. */
  | { kind: "join" }
  | { kind: "join-pass" }
  | { kind: "join-code" }
  /** A device link by QR code: this device gives (signed in) or takes (new); `text`, a link read already. */
  | { kind: "link"; role: "giver" | "taker"; text: string | null }
  /** Turning sync on: what it means; the passphrase for the account; how the other devices sign in. */
  | { kind: "sync-intro" }
  | { kind: "sync-pass" }
  | { kind: "sync-key" }
  /** Stopping sync, or deleting the account: what goes. */
  | { kind: "off-intro" }
  /** Another device, once the space syncs: by QR code, or the sealed copy as before. */
  | { kind: "add-choose" };

/** The sealed copy for another device, as JSON and as plain text (lib/space/runtime.ts). */
type SpaceCopy = { json: File; text: File };

/** The copy the system's share sheet takes here, or null (then it is saved as a file). */
function shareable(files: SpaceCopy): File | null {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return null;
  for (const file of [files.json, files.text]) {
    try {
      if (navigator.canShare({ files: [file] })) return file;
    } catch {
      /* not this kind */
    }
  }
  return null;
}

type BackupUse = "restore" | "import";

/** Ways in to offer: the open space's, or a backup's. */
type WaysSource = { hasPassphrase: boolean; passkeys: readonly PasskeyRef[] };

type WaysUse = {
  source: WaysSource;
  ids: { key: string; pass: string; go: string; code: string; out: string };
  keyLabel: MessageKey;
  goLabel: MessageKey;
  outLabel: MessageKey;
  onKey: () => Promise<void>;
  onPass: (e: FormEvent) => Promise<void>;
  codeStep: Step;
  /** One more way out, under the others (signing in again: stop syncing here). */
  extra?: ReactNode;
};

type CodeUse = {
  source: WaysSource;
  ids: { input: string; go: string };
  goLabel: MessageKey;
  outLabel: MessageKey;
  onCode: (e: FormEvent) => Promise<void>;
  waysStep: Step;
};

/** A backup's ways in, from its description (its keys stay wrapped). */
function backupWays(backup: SpaceBackup): WaysSource {
  return {
    hasPassphrase: backup.meta.wraps.some((w) => w.kind === "passphrase"),
    passkeys: backup.meta.wraps.flatMap((w) => (w.kind === "passkey" ? [{ credId: w.credId, prfSalt: w.prfSalt }] : [])),
  };
}

/** A device link handed over by the /link page: "giver:<text>" or "taker:<text>". */
function linkFor(sheetFor: string | null): { role: "giver" | "taker"; text: string | null } {
  const at = sheetFor?.indexOf(":") ?? -1;
  const role = sheetFor?.slice(0, at) === "giver" ? "giver" : "taker";
  return { role, text: at >= 0 ? sheetFor!.slice(at + 1) || null : null };
}

/** A device to remove, as Settings hands it over: "<id>:<its name, opened there>". */
function deviceFor(sheetFor: string | null): { id: string; name: string } {
  const at = sheetFor?.indexOf(":") ?? -1;
  return at < 0 ? { id: sheetFor ?? "", name: "" } : { id: sheetFor!.slice(0, at), name: sheetFor!.slice(at + 1) };
}

/**
 * The account id beside the recovery code, in the code's box (shell.css), on one line even on a phone.
 * Styled here rather than in sync.css: the sheet opens on "/" for a reader with charts from before
 * private spaces, and a style sheet of its own would join "/"'s (budgets.mjs).
 */
const ID_LABEL = { margin: 0, fontSize: 13, color: "var(--color-fg-muted)" } as const;
const ID_BOX = { borderStyle: "solid", fontSize: "clamp(13px, 3.6vw, 15px)", letterSpacing: "0.02em" } as const;

function firstStep(sheet: SheetKind, synced: boolean, sheetFor: string | null): Step {
  if (sheet === "unlock") return { kind: "unlock" };
  if (sheet === "legacy") return { kind: "legacy" };
  if (sheet === "restore" || sheet === "import") return { kind: "file", purpose: sheet };
  if (sheet === "add-device") return synced ? { kind: "add-choose" } : { kind: "send", files: null, done: null };
  if (isManage(sheet) || sheet === "remove-device" || sheet === "sign-in-again") return { kind: "confirm" };
  if (sheet === "join") return { kind: "join" };
  if (sheet === "sync-on") return { kind: "sync-intro" };
  if (sheet === "sync-off" || sheet === "delete-account") return { kind: "off-intro" };
  if (sheet === "link") {
    const link = linkFor(sheetFor);
    return link.role === "giver" ? { kind: "confirm" } : { kind: "link", role: "taker", text: link.text };
  }
  return { kind: "choose" };
}

function named(err: unknown, name: string): boolean {
  return err instanceof Error && err.name === name;
}

/** The space locked (or went) while the sheet was up. */
function gone(err: unknown): boolean {
  return named(err, "SpaceLocked") || (err instanceof Error && err.message === "space-locked");
}

type Translate = ReturnType<typeof bookT<typeof WORDS>>;

/** Which way in failed, for the account's one answer to every failed sign-in ("denied"). */
type Via = "join-pass" | "join-code" | "join-passkey" | "account-passkey" | null;

/** What went wrong, for the reader. `making`: a passkey was being made. */
function problem(err: unknown, t: Translate, making: boolean, via: Via = null): string {
  // By name: the account's passkeys (lib/account/client/passkeys.ts) refuse with the same names.
  if (named(err, "PasskeyCancelled")) return t("spacePasskeyCancelled");
  if (named(err, "PasskeyExists")) return t("spacePasskeyExists");
  if (named(err, "PasskeyNoPrf")) return t(making ? "spacePasskeyNoPrf" : "spacePasskeyNoPrfUnlock");
  if (named(err, "WrongSecret")) return t("spaceWrong");
  const message = err instanceof Error ? err.message : "";
  if (message === "no-way-in") return t("spaceLastWay");
  if (message === "paused" || message === "not-syncing") return t("syncPausedFirst");
  if (message === "not-ready") return t("syncNotReady");
  if (message === "space-exists") return t("syncUnlockFirst");
  // The account's failures carry the protocol's code (lib/account/client/api.ts, AccountFailure).
  const code = (err as { code?: unknown } | null)?.code;
  if (code === "network" || code === "unavailable" || message === "offline") return t("syncOffline");
  if (code === "slow-down") return t("syncSlowDown");
  if (code === "denied") {
    if (via === "join-pass") return t("syncWrongPass");
    if (via === "join-code") return t("syncWrongCode");
    if (via === "join-passkey") return t("syncWrongPasskey");
    if (via === "account-passkey") return t("syncNotAccountPasskey");
    return t("spaceWrong");
  }
  return t("spaceFailed");
}

/** Forget a way in held for a change; a passkey's secret is wiped. */
function dropHeld(held: RefObject<WayIn | null>): void {
  const way = held.current;
  if (way && "passkey" in way) way.passkey.prf.fill(0);
  held.current = null;
}

function PassField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  shown,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  shown: boolean;
  onToggle?: () => void;
}) {
  const { t: tc, locale } = useI18n();
  const t = bookT(WORDS, tc, locale);
  return (
    <div className="ob-space-field">
      <label htmlFor={id}>{label}</label>
      <div className="ob-space-pass">
        <input
          id={id}
          data-testid={id}
          className="ob-space-input"
          type={shown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
        {onToggle ? (
          <button
            type="button"
            className="ob-icon-btn ob-icon-btn--quiet ob-space-eye"
            aria-label={shown ? t("spaceHide") : t("spaceShow")}
            aria-pressed={shown}
            onClick={onToggle}
          >
            {shown ? <EyeOff className="size-4" strokeWidth={1.75} aria-hidden /> : <Eye className="size-4" strokeWidth={1.75} aria-hidden />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** For password managers: what the passphrase is for. */
function ManagerHint() {
  return <input className="sr-only" type="text" autoComplete="username" value="Ulune" readOnly tabIndex={-1} aria-hidden />;
}

/** How long a challenge fetched ahead may wait: a sign-in's lasts five minutes, an account's fifteen. */
const BEGUN_FOR = { create: 13 * 60_000, signin: 4 * 60_000 } as const;

export function SpaceSheet() {
  const { t: tc, locale } = useI18n();
  const t = bookT(WORDS, tc, locale);
  const d = (key: DevicesKey) => devicesText(locale, key);
  const sheet = useSpace((s) => s.sheet);
  const sheetFor = useSpace((s) => s.sheetFor);
  const status = useSpace((s) => s.status);
  const hasPassphrase = useSpace((s) => s.hasPassphrase);
  const passkeys = useSpace((s) => s.passkeys);
  const sync = useSpace((s) => s.sync);
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(() => firstStep(sheet, Boolean(useSpace.getState().sync), sheetFor));
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [code, setCode] = useState("");
  const [accountIn, setAccountIn] = useState("");
  const [shown, setShown] = useState(false);
  const [kept, setKept] = useState(false);
  // "This is a shared computer": the new (or restored) space locks when Ulune closes instead of staying signed in.
  const [shared, setShared] = useState(false);
  // Where the new space is kept: this device only (decision A4's default), or this device and the reader's others.
  const [where, setWhere] = useState<"here" | "sync">("here");
  // Deleting the account: this device's space kept (the default) or erased too.
  const [erase, setErase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether a new passkey would open the space in this browser (known a moment after the sheet mounts).
  const [canMake, setCanMake] = useState<boolean | null>(null);
  // The way in given for a change, held until the change is made (and wiped with the sheet).
  const held = useRef<WayIn | null>(null);
  // The account's challenge, fetched ahead of a passkey's window, and the passkeys' code with it.
  const begun = useRef<{ kind: "create" | "signin"; at: number; value: Begun } | null>(null);
  const keys = useRef<PasskeysModule | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const manage = isManage(sheet) ? sheet : null;
  const legacyCount = step.kind === "legacy" ? legacyChartCount() : 0;
  // The first step waits for the answer about passkeys, so its buttons don't move.
  const waiting = step.kind === "choose" && canMake === null;

  useEffect(() => {
    let on = true;
    void passkeyPrfLikely().then((ok) => {
      if (on) setCanMake(ok);
    });
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => () => dropHeld(held), []);

  // A change to the ways in, charts added from a backup, a copy for another device or the account's settings need the space open: if it locks meanwhile, the sheet goes.
  useEffect(() => {
    if (needsOpen(sheet) && status !== "open") closeSpaceSheet();
  }, [sheet, status]);

  // The account's challenge, fetched as a step that may open a passkey's window shows (and again before it ends).
  const wantBegun: "create" | "signin" | null =
    ((step.kind === "choose" && where === "sync") || step.kind === "sync-key") && canMake
      ? "create"
      : (step.kind === "join" && passkeysPossible()) || (step.kind === "confirm" && Boolean(sync) && passkeys.length > 0 && passkeysPossible())
        ? "signin"
        : null;
  useEffect(() => {
    if (!wantBegun) return;
    let on = true;
    const fetchIt = () => {
      void Promise.all([loadAccount(), loadPasskeys()])
        .then(async ([acct, pk]) => {
          keys.current = pk;
          const value = wantBegun === "create" ? await acct.beginAccount() : await acct.beginPasskeySignIn();
          if (on) begun.current = { kind: wantBegun, at: Date.now(), value };
        })
        .catch(() => {
          /* offline: asked again when used */
        });
    };
    const ready = begun.current;
    if (!ready || ready.kind !== wantBegun || Date.now() - ready.at > BEGUN_FOR[wantBegun]) fetchIt();
    const timer = window.setInterval(fetchIt, BEGUN_FOR[wantBegun]);
    return () => {
      on = false;
      window.clearInterval(timer);
    };
  }, [wantBegun]);

  /** The challenge fetched ahead (used once), or one fetched now when there was none. */
  async function begunFor(kind: "create" | "signin"): Promise<{ value: Begun; pk: PasskeysModule } | null> {
    const ready = begun.current;
    begun.current = null;
    if (ready && ready.kind === kind && Date.now() - ready.at < BEGUN_FOR[kind] && keys.current) return { value: ready.value, pk: keys.current };
    try {
      const [acct, pk] = await Promise.all([loadAccount(), loadPasskeys()]);
      keys.current = pk;
      return { value: kind === "create" ? await acct.beginAccount() : await acct.beginPasskeySignIn(), pk };
    } catch {
      return null;
    }
  }

  // The copy for another device is made as the sheet opens, so the share sheet can open straight from the click.
  const preparing = step.kind === "send" && step.files === null;
  useEffect(() => {
    if (!preparing) return;
    let on = true;
    void loadSpaceRuntime()
      .then((m) => m.spaceCopyFiles())
      .then(
        (files) => {
          if (on) setStep({ kind: "send", files, done: null });
        },
        () => {
          if (on) {
            toast(t("spaceFailed"), "error");
            closeSpaceSheet();
          }
        },
      );
    return () => {
      on = false;
    };
  }, [preparing, t]);

  // A new step: its first field or button has the focus.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const target = card.querySelector<HTMLElement>("input:not([type=hidden]):not([aria-hidden]):not([readonly]):not([type=radio]), [data-autofocus]");
    window.requestAnimationFrame(() => target?.focus());
  }, [step.kind, waiting]);

  /** Move to another step by the reader's choice: the last error goes. */
  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  /** Back to a step, saying what went wrong. */
  function fail(back: Step, message: string) {
    setStep(back);
    setError(message);
  }

  function keep(way: WayIn) {
    dropHeld(held);
    held.current = way;
  }

  const busy = step.kind === "busy";
  // A recovery code must be acknowledged; nothing else holds the reader.
  const canLeave = !busy && step.kind !== "code";

  function leave() {
    if (canLeave) closeSpaceSheet();
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      leave();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep the focus inside the sheet.
    const items = Array.from(
      cardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href]") ?? [],
    ).filter((el) => el.offsetParent !== null);
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

  /** Another tab made a space meanwhile: this one opens it instead. */
  async function spaceMadeElsewhere() {
    const runtime = await loadSpaceRuntime();
    await runtime.recheckSpace();
    go({ kind: "unlock" });
  }

  function passphraseProblem(): string | null {
    if (normalizePassphrase(pass).length < MIN_PASSPHRASE) return t("spacePassphraseShort");
    if (normalizePassphrase(pass) !== normalizePassphrase(again)) return t("spacePassphraseMismatch");
    return null;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const wrong = passphraseProblem();
    if (wrong) {
      setError(wrong);
      return;
    }
    setStep({ kind: "busy", label: where === "sync" ? "syncTurningOn" : "spaceCreating" });
    try {
      if (where === "sync") {
        const acct = await loadAccount();
        const out = await acct.createSyncedSpace({ passphrase: pass, shared });
        setPass("");
        setAgain("");
        setStep({ kind: "code", code: out.code, fresh: true, synced: true, account: out.account });
        return;
      }
      const runtime = await loadSpaceRuntime();
      const recovery = await runtime.createSpace({ passphrase: pass }, undefined, shared);
      setPass("");
      setAgain("");
      setStep({ kind: "code", code: recovery, fresh: true });
    } catch (err) {
      if (err instanceof Error && err.message === "space-exists") {
        await spaceMadeElsewhere();
        return;
      }
      fail({ kind: "passphrase" }, t("spaceFailed"));
    }
  }

  async function createWithPasskey() {
    setError(null);
    if (where === "sync") {
      // The account's passkey: made with its challenge, for its id; the same passkey opens the space here.
      setStep({ kind: "busy", label: "spaceWaitingPasskey" });
      const got = await begunFor("create");
      if (!got) {
        fail({ kind: "choose" }, t("syncOffline"));
        return;
      }
      let made: Awaited<ReturnType<PasskeysModule["makeAccountPasskey"]>>;
      try {
        made = await got.pk.makeAccountPasskey(got.value, got.value.account!);
      } catch (err) {
        fail({ kind: "choose" }, problem(err, t, true));
        return;
      }
      setStep({ kind: "busy", label: "syncTurningOn" });
      try {
        const acct = await loadAccount();
        const out = await acct.createSyncedSpace({ passkey: made, begun: got.value as Begun & { account: string }, shared });
        setStep({ kind: "code", code: out.code, fresh: true, synced: true, account: out.account });
      } catch (err) {
        forgetUnusedPasskey(made.credId);
        if (err instanceof Error && err.message === "space-exists") {
          await spaceMadeElsewhere();
          return;
        }
        fail({ kind: "choose" }, t("spaceFailed"));
      } finally {
        made.prf.fill(0);
      }
      return;
    }
    const seed = newSpaceSeed();
    setStep({ kind: "busy", label: "spaceWaitingPasskey" });
    let made: PasskeySecretRead & { prfSalt: string };
    try {
      made = await makePasskey(seed.passkeyUser);
    } catch (err) {
      fail({ kind: "choose" }, problem(err, t, true));
      return;
    }
    setStep({ kind: "busy", label: "spaceCreating" });
    try {
      const runtime = await loadSpaceRuntime();
      const recovery = await runtime.createSpace({ passkey: made }, seed, shared);
      setStep({ kind: "code", code: recovery, fresh: true });
    } catch (err) {
      forgetUnusedPasskey(made.credId);
      if (err instanceof Error && err.message === "space-exists") {
        await spaceMadeElsewhere();
        return;
      }
      fail({ kind: "choose" }, t("spaceFailed"));
    } finally {
      made.prf.fill(0);
    }
  }

  async function unlock(e: FormEvent, way: "passphrase" | "recovery") {
    e.preventDefault();
    setError(null);
    const secret = way === "passphrase" ? pass : code;
    if (!secret.trim()) return;
    setStep({ kind: "busy", label: "spaceUnlocking" });
    try {
      const runtime = await loadSpaceRuntime();
      await runtime.unlockSpace(way === "passphrase" ? { passphrase: secret } : { recovery: secret });
      setPass("");
      setCode("");
      if (way === "recovery") {
        // Opened with the code: a new passphrase is offered, with the code as the way in.
        keep({ recovery: secret });
        go({ kind: "newpass", after: "recovery" });
        return;
      }
      closeSpaceSheet();
    } catch (err) {
      fail({ kind: way === "passphrase" ? "unlock" : "recovery" }, problem(err, t, false));
    }
  }

  async function unlockWithPasskey() {
    setError(null);
    setStep({ kind: "busy", label: "spaceWaitingPasskey" });
    let read: PasskeySecretRead | null = null;
    try {
      read = await readPasskey(passkeys);
      setStep({ kind: "busy", label: "spaceUnlocking" });
      const runtime = await loadSpaceRuntime();
      await runtime.unlockSpace({ passkey: read });
      closeSpaceSheet();
    } catch (err) {
      fail({ kind: "unlock" }, problem(err, t, false));
    } finally {
      read?.prf.fill(0);
    }
  }

  /* ------------------------------------------------------------ a new device: the synced account */

  async function joinWith(kind: "passkey" | "pass" | "code", e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const back: Step = kind === "pass" ? { kind: "join-pass" } : kind === "code" ? { kind: "join-code" } : { kind: "join" };
    const via: Via = kind === "pass" ? "join-pass" : kind === "code" ? "join-code" : "join-passkey";
    let account: string | null = null;
    if (kind === "pass") {
      if (!accountIn.trim() || !pass.trim()) return;
      const acct = await loadAccount().catch(() => null);
      account = acct?.readAccountId(accountIn) ?? null;
      if (!account) {
        setError(t("syncBadId"));
        return;
      }
    }
    if (kind === "code" && !code.trim()) return;
    let read: Awaited<ReturnType<PasskeysModule["getAccountPasskey"]>> | null = null;
    try {
      if (kind === "passkey") {
        setStep({ kind: "busy", label: "spaceWaitingPasskey" });
        const got = await begunFor("signin");
        if (!got) throw new Error("offline");
        read = await got.pk.getAccountPasskey(got.value.challenge, got.value.rpId);
      }
      setStep({ kind: "busy", label: "syncJoining" });
      const acct = await loadAccount();
      const out: Joined =
        kind === "passkey" ? await acct.joinWithPasskey(read!, shared) : kind === "pass" ? await acct.joinWithPassphrase(account!, pass, shared) : await acct.joinWithRecovery(code, shared);
      setPass("");
      setCode("");
      toast(t(out.charts ? "syncJoinedMerged" : "syncJoined"), "ok", 6000);
      closeSpaceSheet();
    } catch (err) {
      fail(back, problem(err, t, false, via));
    } finally {
      read?.prf.fill(0);
    }
  }

  /** A device link done: given (the other device signs in), or taken (this device's space is here). */
  function linkDone(joined: Joined | null) {
    if (joined) toast(t(joined.charts ? "syncJoinedMerged" : "syncJoined"), "ok", 6000);
    else toast(t("syncLinkGiven"), "ok", 6000);
    closeSpaceSheet();
  }

  /* ------------------------------------------------------------ changes to the open space */

  /** The way in is given: the change the sheet was opened for, or the next step of it. */
  async function change(way: WayIn, accountWay: AccountWay): Promise<void> {
    const runtime = await loadSpaceRuntime();
    const vault = runtime.currentVault();
    if (!vault) throw new Error("space-locked");
    const syncing = Boolean(useSpace.getState().sync);
    if (sheet === "sign-in-again") {
      const acct = await loadAccount();
      await acct.signInAgain(accountWay);
      toast(t("syncSignedInAgain"));
      closeSpaceSheet();
      return;
    }
    await vault.confirm(way);
    const acct = syncing || sheet === "sync-on" ? await loadAccount() : null;
    if (syncing && accountFresh(sheet)) {
      if (useSpace.getState().sync?.state === "paused") throw new Error("paused");
      await acct!.signInFresh(accountWay);
    }
    if (manage === "passphrase") {
      keep(way);
      setPass("");
      setAgain("");
      go({ kind: "newpass", after: hasPassphrase ? "change" : "add" });
      return;
    }
    if (manage === "add-passkey") {
      if (syncing) {
        // A passkey for the account: it signs a new device in, and opens the space here.
        const begunAdd = await acct!.beginAddPasskey();
        const pk = keys.current ?? (await loadPasskeys());
        setStep({ kind: "busy", label: "spaceWaitingPasskey" });
        const made = await pk.makeAccountPasskey(begunAdd, begunAdd.account, begunAdd.exclude ?? []);
        try {
          setStep({ kind: "busy", label: "spaceSaving" });
          await acct!.accountAddPasskey(way, made, begunAdd);
          await vault.addPasskey(way, { credId: made.credId, prf: made.prf, prfSalt: pk.ACCOUNT_PRF_SALT });
        } catch (err) {
          forgetUnusedPasskey(made.credId);
          throw err;
        } finally {
          made.prf.fill(0);
        }
      } else {
        setStep({ kind: "busy", label: "spaceWaitingPasskey" });
        const made = await makePasskey(
          vault.meta.passkeyUser,
          passkeys.map((p) => p.credId),
        );
        try {
          setStep({ kind: "busy", label: "spaceSaving" });
          await vault.addPasskey(way, made);
        } catch (err) {
          forgetUnusedPasskey(made.credId);
          throw err;
        } finally {
          made.prf.fill(0);
        }
      }
      runtime.spaceChanged();
      toast(t("spacePasskeyAddedToast"));
      closeSpaceSheet();
      return;
    }
    if (manage === "remove-passkey") {
      if (!sheetFor) throw new Error("no-passkey");
      if (syncing) await acct!.accountRemovePasskey(sheetFor);
      await vault.removePasskey(way, sheetFor);
      runtime.spaceChanged();
      toast(t("spacePasskeyRemoved"));
      closeSpaceSheet();
      return;
    }
    if (manage === "remove-passphrase") {
      if (syncing) await acct!.accountRemovePassphrase();
      await vault.removePassphrase(way);
      runtime.spaceChanged();
      toast(t("spacePassphraseRemoved"));
      closeSpaceSheet();
      return;
    }
    if (manage === "new-code") {
      // While it syncs, the account takes the same new code first.
      const next = newRecoveryCode();
      if (syncing) await acct!.accountSetCode(way, next);
      const fresh = await vault.newRecoveryCode(way, next);
      runtime.spaceChanged();
      go({ kind: "code", code: fresh, fresh: false, synced: syncing, account: useSpace.getState().sync?.account ?? null });
      return;
    }
    if (sheet === "sync-on") {
      if ("passphrase" in way) {
        setStep({ kind: "busy", label: "syncTurningOn" });
        const out = await acct!.turnOnSync(way, { passphrase: way.passphrase });
        go({ kind: "code", code: out.code, fresh: false, synced: true, account: out.account });
        return;
      }
      keep(way);
      go({ kind: hasPassphrase ? "sync-pass" : "sync-key" });
      return;
    }
    if (sheet === "sync-off" || sheet === "delete-account") {
      setStep({ kind: "busy", label: "syncDeleting" });
      const erasing = sheet === "delete-account" && erase;
      await acct!.deleteAccount(erasing);
      toast(t(sheet === "sync-off" ? "syncOffDone" : erasing ? "syncDeletedErased" : "syncDeleted"), "ok", 6000);
      closeSpaceSheet();
      return;
    }
    if (sheet === "remove-device") {
      const device = deviceFor(sheetFor).id;
      if (!device) throw new Error("no-device");
      await acct!.removeDevice(device);
      toast(t("syncDeviceRemoved"));
      closeSpaceSheet();
      return;
    }
    if (sheet === "add-device" || sheet === "link") {
      // The data key goes to the new device sealed: it is opened with this way in, at the end.
      keep(way);
      go({ kind: "link", role: "giver", text: sheet === "link" ? linkFor(sheetFor).text : null });
    }
  }

  /** One of the ways in, given before a change. */
  async function confirmWith(kind: "passphrase" | "recovery" | "passkey", e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const back: Step = kind === "recovery" ? { kind: "confirm-code" } : { kind: "confirm" };
    // While the space syncs, a passkey answers the account's challenge in the same touch (a fresh sign-in).
    const viaAccount = Boolean(sync) && (accountFresh(sheet) || sheet === "sign-in-again");
    let way: WayIn;
    let accountWay: AccountWay;
    let read: PasskeySecretRead | null = null;
    if (kind === "passkey") {
      setStep({ kind: "busy", label: "spaceWaitingPasskey" });
      try {
        if (viaAccount) {
          const got = await begunFor("signin");
          if (!got) throw new Error("offline");
          const salts = Object.fromEntries(passkeys.map((p) => [p.credId, p.prfSalt]));
          const answer = await got.pk.getAccountPasskey(got.value.challenge, got.value.rpId, passkeys.map((p) => p.credId), salts);
          read = { credId: answer.credId, prf: answer.prf };
          accountWay = { read: answer };
        } else {
          read = await readPasskey(passkeys);
          accountWay = { passkey: read };
        }
      } catch (err) {
        fail(back, problem(err, t, false));
        return;
      }
      way = { passkey: read };
    } else {
      const secret = kind === "passphrase" ? pass : code;
      if (!secret.trim()) return;
      way = kind === "passphrase" ? { passphrase: secret } : { recovery: secret };
      accountWay = way;
    }
    setStep({ kind: "busy", label: "spaceChecking" });
    try {
      await change(way, accountWay);
      setPass("");
      setCode("");
    } catch (err) {
      if (gone(err)) {
        closeSpaceSheet();
        return;
      }
      fail(back, problem(err, t, manage === "add-passkey" && !named(err, "WrongSecret"), kind === "passkey" && viaAccount ? "account-passkey" : null));
    } finally {
      // Kept for the next step only when the change goes on (a new passphrase, sync, a device link).
      if (read && held.current !== way) read.prf.fill(0);
    }
  }

  async function newPassphrase(e: FormEvent, after: "recovery" | "change" | "add" | "sync") {
    e.preventDefault();
    setError(null);
    const wrong = passphraseProblem();
    if (wrong) {
      setError(wrong);
      return;
    }
    const way = held.current;
    if (!way) {
      setError(t("spaceFailed"));
      return;
    }
    setStep({ kind: "busy", label: after === "sync" ? "syncTurningOn" : "spaceSaving" });
    try {
      const runtime = await loadSpaceRuntime();
      const vault = runtime.currentVault();
      if (!vault) throw new Error("space-locked");
      if (after === "sync") {
        const acct = await loadAccount();
        const out = await acct.turnOnSync(way, { passphrase: pass });
        setPass("");
        setAgain("");
        go({ kind: "code", code: out.code, fresh: false, synced: true, account: out.account });
        return;
      }
      if (useSpace.getState().sync) {
        // The account's passphrase changes with the space's (after a fresh sign-in; the code's, when it opened the space).
        const acct = await loadAccount();
        if (after === "recovery") await acct.signInFresh(way);
        await acct.accountSetPassphrase(way, pass);
      }
      await vault.setPassphrase(way, pass);
      runtime.spaceChanged();
      setPass("");
      setAgain("");
      toast(
        t(after === "recovery" ? "spaceNewPassSaved" : after === "change" ? "spacePassphraseChanged" : "spacePassphraseAdded"),
      );
      closeSpaceSheet();
    } catch (err) {
      if (gone(err)) {
        closeSpaceSheet();
        return;
      }
      fail({ kind: "newpass", after }, problem(err, t, false));
    }
  }

  /** Turning sync on with the space's passphrase, typed (the space was confirmed another way). */
  async function syncWithPass(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const way = held.current;
    if (!pass.trim() || !way) return;
    setStep({ kind: "busy", label: "spaceChecking" });
    try {
      const runtime = await loadSpaceRuntime();
      const vault = runtime.currentVault();
      if (!vault) throw new Error("space-locked");
      await vault.confirm({ passphrase: pass });
      setStep({ kind: "busy", label: "syncTurningOn" });
      const acct = await loadAccount();
      const out = await acct.turnOnSync(way, { passphrase: pass });
      setPass("");
      go({ kind: "code", code: out.code, fresh: false, synced: true, account: out.account });
    } catch (err) {
      if (gone(err)) {
        closeSpaceSheet();
        return;
      }
      fail({ kind: "sync-pass" }, problem(err, t, false));
    }
  }

  /** Turning sync on with a new passkey for the account (a space without a passphrase). */
  async function syncWithPasskey() {
    setError(null);
    const way = held.current;
    if (!way) return;
    setStep({ kind: "busy", label: "spaceWaitingPasskey" });
    const got = await begunFor("create");
    if (!got) {
      fail({ kind: "sync-key" }, t("syncOffline"));
      return;
    }
    let made: Awaited<ReturnType<PasskeysModule["makeAccountPasskey"]>>;
    try {
      made = await got.pk.makeAccountPasskey(got.value, got.value.account!);
    } catch (err) {
      fail({ kind: "sync-key" }, problem(err, t, true));
      return;
    }
    setStep({ kind: "busy", label: "syncTurningOn" });
    try {
      const acct = await loadAccount();
      const out = await acct.turnOnSync(way, { passkey: made, begun: got.value as Begun & { account: string } });
      go({ kind: "code", code: out.code, fresh: false, synced: true, account: out.account });
    } catch (err) {
      forgetUnusedPasskey(made.credId);
      if (gone(err)) {
        closeSpaceSheet();
        return;
      }
      fail({ kind: "sync-key" }, problem(err, t, false));
    } finally {
      made.prf.fill(0);
    }
  }

  async function pickBackup(e: ChangeEvent<HTMLInputElement>, purpose: BackupUse) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const runtime = await loadSpaceRuntime();
    const backup = await runtime.readBackupFile(file);
    if (!backup) {
      setError(t("spaceNotBackup"));
      return;
    }
    go({ kind: "backup", purpose, backup });
  }

  /** A backup opened with one of its ways in: restored as this browser's space, or its charts added. */
  async function backupWith(kind: "passphrase" | "recovery" | "passkey", backup: SpaceBackup, purpose: BackupUse, e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const back: Step = kind === "recovery" ? { kind: "backup-code", purpose, backup } : { kind: "backup", purpose, backup };
    let way: WayIn;
    let read: PasskeySecretRead | null = null;
    if (kind === "passkey") {
      setStep({ kind: "busy", label: "spaceWaitingPasskey" });
      try {
        read = await readPasskey(backupWays(backup).passkeys);
      } catch (err) {
        fail(back, problem(err, t, false));
        return;
      }
      way = { passkey: read };
    } else {
      const secret = kind === "passphrase" ? pass : code;
      if (!secret.trim()) return;
      way = kind === "passphrase" ? { passphrase: secret } : { recovery: secret };
    }
    setStep({ kind: "busy", label: "spaceOpening" });
    try {
      const runtime = await loadSpaceRuntime();
      if (purpose === "restore") {
        await runtime.restoreSpace(backup, way, shared);
        toast(t("spaceRestored"));
      } else {
        const n = await runtime.importBackup(backup, way);
        toast(n === 0 ? t("spaceImportedNone") : n === 1 ? t("spaceImportedOne") : t("spaceImported", { n }));
      }
      setPass("");
      setCode("");
      closeSpaceSheet();
    } catch (err) {
      if (err instanceof Error && err.message === "space-exists") {
        await spaceMadeElsewhere();
        return;
      }
      if (gone(err)) {
        closeSpaceSheet();
        return;
      }
      fail(back, problem(err, t, false));
    } finally {
      read?.prf.fill(0);
    }
  }

  const errorLine = error ? (
    <p className="ob-space-err" role="alert">
      {error}
    </p>
  ) : null;

  /** What a set of ways in offers here: the open space's, or a backup's. */
  function offered(source: WaysSource): { withKey: boolean; withPass: boolean; keysElsewhere: boolean } {
    const possible = passkeysPossible();
    return {
      withKey: source.passkeys.length > 0 && possible,
      withPass: source.hasPassphrase,
      keysElsewhere: source.passkeys.length > 0 && !possible,
    };
  }

  /** A passkey button, the passphrase, the recovery code: to unlock, to confirm a change, or to open a backup. */
  function ways(use: WaysUse, intro: ReactNode) {
    const { withKey, withPass, keysElsewhere } = offered(use.source);
    return (
      <form className="ob-space-form" onSubmit={(e) => void use.onPass(e)} noValidate>
        {intro}
        {withKey ? (
          <button
            type="button"
            className="ob-btn ob-btn--primary"
            data-testid={use.ids.key}
            data-autofocus
            onClick={() => void use.onKey()}
          >
            {t(use.keyLabel)}
          </button>
        ) : null}
        {keysElsewhere ? <p className="ob-space-note">{t("spacePasskeysUnavailable")}</p> : null}
        {withKey && withPass ? (
          <p className="ob-space-or">
            <span>{t("spaceOr")}</span>
          </p>
        ) : null}
        {withPass ? (
          <>
            <ManagerHint />
            <PassField
              id={use.ids.pass}
              label={t("spacePassphrase")}
              value={pass}
              onChange={setPass}
              autoComplete="current-password"
              shown={shown}
              onToggle={() => setShown((v) => !v)}
            />
          </>
        ) : null}
        {errorLine}
        <div className="ob-space-actions">
          {withPass ? (
            <button type="submit" className={withKey ? "ob-btn ob-btn--ghost" : "ob-btn ob-btn--primary"} data-testid={use.ids.go}>
              {t(use.goLabel)}
            </button>
          ) : null}
          <button type="button" className="ob-space-link" data-testid={use.ids.code} onClick={() => go(use.codeStep)}>
            {t("spaceUseCode")}
          </button>
          {use.extra}
          <button type="button" className="ob-space-link" data-testid={use.ids.out} onClick={leave}>
            {t(use.outLabel)}
          </button>
        </div>
      </form>
    );
  }

  /** The recovery code typed in: to unlock, to confirm a change, or to open a backup. */
  function codeForm(use: CodeUse, intro: ReactNode) {
    const { withKey, withPass } = offered(use.source);
    const back: MessageKey | null =
      withPass && withKey ? "spaceBack" : withPass ? "spaceUsePassphraseInstead" : withKey ? "spaceUsePasskey" : null;
    return (
      <form className="ob-space-form" onSubmit={(e) => void use.onCode(e)} noValidate>
        {intro}
        <div className="ob-space-field">
          <label htmlFor={use.ids.input}>{t("spaceCode")}</label>
          <input
            id={use.ids.input}
            data-testid={use.ids.input}
            className="ob-space-input ob-space-input--code"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        {errorLine}
        <div className="ob-space-actions">
          <button type="submit" className="ob-btn ob-btn--primary" data-testid={use.ids.go}>
            {t(use.goLabel)}
          </button>
          {back ? (
            <button type="button" className="ob-space-link" onClick={() => go(use.waysStep)}>
              {t(back)}
            </button>
          ) : null}
          <button type="button" className="ob-space-link" onClick={leave}>
            {t(use.outLabel)}
          </button>
        </div>
      </form>
    );
  }

  const spaceWays: WaysSource = { hasPassphrase, passkeys };

  /** What the change asks, for the confirm steps. */
  function manageText(): { title: MessageKey; warn: string | null; ask: MessageKey } {
    if (manage === "remove-passkey") {
      const target = passkeys.find((p) => p.credId === sheetFor);
      const date = target
        ? dateFormat(locale === "en" ? "en-GB" : locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(target.added))
        : "";
      return { title: "spaceRemovePasskeyTitle", warn: t("spaceRemovePasskeyBody", { date }), ask: "spaceConfirmBody" };
    }
    if (manage === "remove-passphrase") return { title: "spaceRemovePassphraseTitle", warn: t("spaceRemovePassphraseBody"), ask: "spaceConfirmBody" };
    if (manage === "new-code") return { title: "spaceNewCodeTitle", warn: t("spaceNewCodeWarn"), ask: "spaceConfirmBody" };
    if (manage === "add-passkey") return { title: "spaceAddPasskey", warn: null, ask: "spaceConfirmBody" };
    if (manage === "passphrase") return { title: hasPassphrase ? "spaceChangePassphraseTitle" : "spaceAddPassphraseTitle", warn: null, ask: "spaceConfirmBody" };
    if (sheet === "sync-on") return { title: "syncOnTitle", warn: null, ask: "syncConfirmBody" };
    if (sheet === "sync-off") return { title: "syncOffTitle", warn: null, ask: "syncConfirmBody" };
    if (sheet === "delete-account") return { title: "syncDeleteTitle", warn: null, ask: "syncConfirmBody" };
    if (sheet === "remove-device") return { title: "syncRemoveDeviceTitle", warn: t("syncRemoveDeviceBody", { name: deviceFor(sheetFor).name || t("syncDeviceUnnamed") }), ask: "syncConfirmBody" };
    if (sheet === "sign-in-again") return { title: "syncSignInAgain", warn: t("syncSignInAgainBody"), ask: "syncConfirmBody" };
    return { title: "spaceAddDevice", warn: null, ask: "syncConfirmBody" };
  }

  /** "This is a shared computer": unticked, the space stays signed in on this device. */
  const sharedBox = (
    <label className="ob-check ob-space-check ob-space-shared" htmlFor="space-shared">
      <input id="space-shared" type="checkbox" data-testid="space-shared" checked={shared} onChange={(e) => setShared(e.target.checked)} />
      <span>
        {d("shared")}
        <span className="ob-check-hint"> — {d("sharedHint")}</span>
      </span>
    </label>
  );

  /** The hidden file input a file from another device is chosen with (the join step and the file step). */
  const filePicker = (purpose: BackupUse) => (
    <input
      ref={fileRef}
      type="file"
      accept=".json,.txt,application/json,text/plain"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      data-testid="space-backup-file"
      onChange={(e) => void pickBackup(e, purpose)}
    />
  );

  let title: MessageKey = "spaceTitle";
  let body: ReactNode = null;
  if (step.kind === "choose") {
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t("spaceBody")}
        </p>
        <fieldset className="ob-space-locks" data-testid="space-where">
          <legend className="ob-menu-label">{t("syncWhere")}</legend>
          {(["here", "sync"] as const).map((option) => (
            <label key={option} className="ob-check" htmlFor={`space-where-${option}`}>
              <input
                id={`space-where-${option}`}
                type="radio"
                name="space-where"
                data-testid={`space-where-${option}`}
                checked={where === option}
                onChange={() => setWhere(option)}
              />
              <span>
                {t(option === "here" ? "syncHereOnly" : "syncEverywhere")}
                <span className="ob-check-hint" style={{ display: "block", marginTop: 2 }}>
                  {t(option === "here" ? "syncHereOnlyBody" : "syncEverywhereBody")}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {errorLine}
        <div className="ob-space-actions">
          {canMake ? (
            <button
              type="button"
              className="ob-btn ob-btn--primary"
              data-testid="space-use-passkey"
              data-autofocus
              onClick={() => void createWithPasskey()}
            >
              {t("spaceUsePasskey")}
            </button>
          ) : null}
          <button
            type="button"
            className={canMake ? "ob-btn ob-btn--ghost" : "ob-btn ob-btn--primary"}
            data-testid="space-use-passphrase"
            data-autofocus={canMake ? undefined : true}
            onClick={() => go({ kind: "passphrase" })}
          >
            {t("spaceUsePassphrase")}
          </button>
          {canMake ? <p className="ob-space-note">{t("spacePasskeyHint")}</p> : null}
          {sharedBox}
          <button type="button" className="ob-space-link" data-testid="space-not-now" onClick={leave}>
            {t("spaceNotNow")}
          </button>
          <button type="button" className="ob-space-link" data-testid="space-restore" onClick={() => go({ kind: "join" })}>
            {t("spaceRestoreHave")}
          </button>
        </div>
      </>
    );
  } else if (step.kind === "passphrase") {
    title = "spacePassphraseTitle";
    body = (
      <form className="ob-space-form" onSubmit={(e) => void create(e)} noValidate>
        <p id={bodyId} className="ob-space-p">
          {t("spacePassphraseHint")}
        </p>
        <ManagerHint />
        <PassField
          id="space-pass"
          label={t("spacePassphrase")}
          value={pass}
          onChange={setPass}
          autoComplete="new-password"
          shown={shown}
          onToggle={() => setShown((v) => !v)}
        />
        <PassField
          id="space-pass-again"
          label={t("spacePassphraseAgain")}
          value={again}
          onChange={setAgain}
          autoComplete="new-password"
          shown={shown}
        />
        {errorLine}
        <div className="ob-space-actions">
          <button type="submit" className="ob-btn ob-btn--primary" data-testid="space-create">
            {t("spaceCreate")}
          </button>
          <button type="button" className="ob-space-link" onClick={() => go({ kind: "choose" })}>
            {t("spaceBack")}
          </button>
        </div>
      </form>
    );
  } else if (step.kind === "busy") {
    body = (
      <p className="ob-space-p ob-space-busy" aria-live="polite" data-testid="space-busy">
        <span className="ob-space-spin" aria-hidden />
        {t(step.label)}
      </p>
    );
  } else if (step.kind === "code") {
    const fresh = step.fresh;
    title = fresh ? "spaceCodeTitle" : "spaceNewCodeHead";
    const shownCode = formatRecoveryCode(step.code);
    const account = step.account ? (shownId?.(step.account) ?? step.account) : null;
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t(step.synced ? "syncCodeBody" : fresh ? (hasPassphrase ? "spaceCodeBody" : "spaceCodeBodyKey") : "spaceNewCodeBody")}
        </p>
        <p className="ob-space-code" data-testid="space-code">
          {shownCode}
        </p>
        <button
          type="button"
          className="ob-btn ob-btn--ghost"
          data-testid="space-code-copy"
          onClick={() => {
            void navigator.clipboard?.writeText(shownCode).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? t("spaceCodeCopied") : t("spaceCodeCopy")}
        </button>
        {account ? (
          <div className="ob-space-field" data-testid="sync-account-id" role="group" aria-labelledby="sync-account-id-h">
            <p id="sync-account-id-h" style={ID_LABEL}>
              {t("syncAccountId")}
            </p>
            <p className="ob-space-code" style={ID_BOX} data-testid="sync-account-id-text">
              {account}
            </p>
            <p className="ob-space-note">{t("syncAccountIdHint")}</p>
            <button
              type="button"
              className="ob-btn ob-btn--ghost"
              data-testid="sync-account-id-copy"
              onClick={() => {
                void navigator.clipboard?.writeText(account).then(
                  () => setIdCopied(true),
                  () => setIdCopied(false),
                );
              }}
            >
              {idCopied ? t("spaceCodeCopied") : t("syncCopyId")}
            </button>
          </div>
        ) : step.synced && fresh ? (
          <p className="ob-space-note" data-testid="sync-not-started">
            {t("syncNotStarted")}
          </p>
        ) : null}
        <label className="ob-check ob-space-check" htmlFor="space-kept">
          <input
            id="space-kept"
            type="checkbox"
            data-testid="space-code-kept"
            checked={kept}
            onChange={(e) => setKept(e.target.checked)}
          />
          <span>{t("spaceCodeKept")}</span>
        </label>
        {fresh ? (
          <p className="ob-space-note" data-testid="space-lock-note">
            {shared ? t("spaceLocksWhen") : d("staysSignedIn")}
            {!shared && inSafariTab() ? ` ${d("homeScreen")}` : ""}
          </p>
        ) : null}
        <div className="ob-space-actions">
          <button
            type="button"
            className="ob-btn ob-btn--primary"
            data-testid="space-done"
            disabled={!kept}
            onClick={() => {
              toast(t(fresh ? "spaceCreated" : step.synced && sheet === "sync-on" ? "syncOnDone" : "spaceNewCodeDone"));
              closeSpaceSheet();
            }}
          >
            {t("spaceDone")}
          </button>
        </div>
      </>
    );
  } else if (step.kind === "unlock" || step.kind === "recovery") {
    title = "spaceUnlockTitle";
    const intro =
      step.kind === "unlock" ? (
        <p id={bodyId} className="ob-space-p">
          {t(
            passkeys.length && hasPassphrase
              ? "spaceUnlockBodyBoth"
              : passkeys.length
                ? "spaceUnlockBodyKey"
                : "spaceUnlockBody",
          )}
        </p>
      ) : null;
    body =
      step.kind === "unlock"
        ? ways(
            {
              source: spaceWays,
              ids: { key: "space-unlock-passkey", pass: "space-unlock-pass", go: "space-unlock", code: "space-use-code", out: "space-just-look" },
              keyLabel: "spaceUnlockPasskey",
              goLabel: "spaceUnlock",
              outLabel: "spaceJustLook",
              onKey: unlockWithPasskey,
              onPass: (e) => unlock(e, "passphrase"),
              codeStep: { kind: "recovery" },
            },
            intro,
          )
        : codeForm(
            {
              source: spaceWays,
              ids: { input: "space-code-input", go: "space-unlock-code" },
              goLabel: "spaceUnlock",
              outLabel: "spaceJustLook",
              onCode: (e) => unlock(e, "recovery"),
              waysStep: { kind: "unlock" },
            },
            intro,
          );
  } else if (step.kind === "confirm" || step.kind === "confirm-code") {
    const asked = manageText();
    title = asked.title;
    const intro = (
      <>
        {asked.warn ? (
          <p id={bodyId} className="ob-space-p">
            {asked.warn}
          </p>
        ) : null}
        <p id={asked.warn ? undefined : bodyId} className="ob-space-p">
          {t(asked.ask)}
        </p>
      </>
    );
    body =
      step.kind === "confirm"
        ? ways(
            {
              source: spaceWays,
              ids: { key: "space-confirm-passkey", pass: "space-confirm-pass", go: "space-confirm", code: "space-confirm-use-code", out: "space-cancel" },
              keyLabel: "spaceConfirmPasskey",
              goLabel: "spaceConfirm",
              outLabel: "spaceCancel",
              onKey: () => confirmWith("passkey"),
              onPass: (e) => confirmWith("passphrase", e),
              codeStep: { kind: "confirm-code" },
              extra:
                sheet === "sign-in-again" ? (
                  <button
                    type="button"
                    className="ob-space-link"
                    data-testid="sync-leave"
                    onClick={() => {
                      setStep({ kind: "busy", label: "spaceSaving" });
                      void loadAccount()
                        .then((acct) => acct.leaveAccount())
                        .then(
                          () => {
                            toast(t("syncLeft"));
                            closeSpaceSheet();
                          },
                          () => fail({ kind: "confirm" }, t("spaceFailed")),
                        );
                    }}
                  >
                    {t("syncLeave")}
                  </button>
                ) : null,
            },
            intro,
          )
        : codeForm(
            {
              source: spaceWays,
              ids: { input: "space-confirm-code-input", go: "space-confirm-code" },
              goLabel: "spaceConfirm",
              outLabel: "spaceCancel",
              onCode: (e) => confirmWith("recovery", e),
              waysStep: { kind: "confirm" },
            },
            intro,
          );
  } else if (step.kind === "file") {
    const purpose = step.purpose;
    title = purpose === "restore" ? "spaceRestore" : "spaceImport";
    // From the first sign-in step, "Back" returns to it; opened on its own, the sheet just closes.
    const fromChoose = purpose === "restore" && sheet === "create";
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t(purpose === "restore" ? "spaceRestoreBody" : "spaceImportBody")}
        </p>
        {filePicker(purpose)}
        {purpose === "restore" ? sharedBox : null}
        {errorLine}
        <div className="ob-space-actions">
          <button
            type="button"
            className="ob-btn ob-btn--primary"
            data-testid="space-backup-choose"
            data-autofocus
            onClick={() => fileRef.current?.click()}
          >
            {t("spaceChooseFile")}
          </button>
          <button type="button" className="ob-space-link" onClick={fromChoose ? () => go({ kind: "join" }) : leave}>
            {t(fromChoose ? "spaceBack" : "spaceCancel")}
          </button>
        </div>
      </>
    );
  } else if (step.kind === "backup" || step.kind === "backup-code") {
    const { purpose, backup } = step;
    title = purpose === "restore" ? "spaceRestore" : "spaceImport";
    const source = backupWays(backup);
    const intro =
      step.kind === "backup" ? (
        <p id={bodyId} className="ob-space-p">
          {t("spaceBackupWays")}
        </p>
      ) : null;
    body =
      step.kind === "backup"
        ? ways(
            {
              source,
              ids: { key: "space-backup-passkey", pass: "space-backup-pass", go: "space-backup-open", code: "space-backup-use-code", out: "space-cancel" },
              keyLabel: "spaceOpenPasskey",
              goLabel: "spaceOpenBackup",
              outLabel: "spaceCancel",
              onKey: () => backupWith("passkey", backup, purpose),
              onPass: (e) => backupWith("passphrase", backup, purpose, e),
              codeStep: { kind: "backup-code", purpose, backup },
            },
            intro,
          )
        : codeForm(
            {
              source,
              ids: { input: "space-backup-code-input", go: "space-backup-code" },
              goLabel: "spaceOpenBackup",
              outLabel: "spaceCancel",
              onCode: (e) => backupWith("recovery", backup, purpose, e),
              waysStep: { kind: "backup", purpose, backup },
            },
            intro,
          );
  } else if (step.kind === "send") {
    title = "spaceAddDevice";
    const files = step.files;
    const viaShare = files ? shareable(files) : null;
    body = files ? (
      <>
        <p id={bodyId} className="ob-space-p">
          {d("addDeviceBody")}
        </p>
        <ol className="ob-space-steps" data-testid="space-add-device-steps">
          <li>{d(viaShare ? "addDeviceStep1Share" : "addDeviceStep1Save")}</li>
          <li>{d("addDeviceStep2")}</li>
          <li>{d("addDeviceStep3")}</li>
        </ol>
        {step.done ? (
          <p className="ob-space-note" role="status" data-testid="space-add-device-done">
            {d(step.done === "sent" ? "addDeviceSent" : "addDeviceSaved")}
          </p>
        ) : null}
        <div className="ob-space-actions">
          <button
            type="button"
            className={step.done ? "ob-btn ob-btn--ghost" : "ob-btn ob-btn--primary"}
            data-testid="space-add-device-send"
            data-via={viaShare ? "share" : "file"}
            data-autofocus
            onClick={() => {
              if (viaShare) {
                // Straight from the click: the share sheet opens only then.
                navigator.share({ files: [viaShare], title: "Ulune" }).then(
                  () => setStep({ kind: "send", files, done: "sent" }),
                  (err: unknown) => {
                    if (err instanceof Error && err.name === "AbortError") return;
                    void loadSpaceRuntime().then((m) => {
                      m.saveSpaceCopy(files.json);
                      setStep({ kind: "send", files, done: "saved" });
                    });
                  },
                );
                return;
              }
              void loadSpaceRuntime().then((m) => {
                m.saveSpaceCopy(files.json);
                setStep({ kind: "send", files, done: "saved" });
              });
            }}
          >
            <Send className="size-4" strokeWidth={1.75} aria-hidden />
            {d(viaShare ? "addDeviceShare" : "addDeviceSave")}
          </button>
          <p className="ob-space-note">{d("addDeviceNote")}</p>
          <button type="button" className="ob-space-link" data-testid="space-add-device-close" onClick={leave}>
            {t(step.done ? "spaceDone" : "spaceCancel")}
          </button>
        </div>
      </>
    ) : (
      <p className="ob-space-p ob-space-busy" aria-live="polite" data-testid="space-busy">
        <span className="ob-space-spin" aria-hidden />
        {d("addDevicePreparing")}
      </p>
    );
  } else if (step.kind === "newpass") {
    const after = step.after;
    title = after === "add" ? "spaceAddPassphraseTitle" : after === "change" ? "spaceChangePassphraseTitle" : after === "sync" ? "syncPassTitle" : "spaceNewPassTitle";
    body = (
      <form className="ob-space-form" onSubmit={(e) => void newPassphrase(e, after)} noValidate>
        <p id={bodyId} className="ob-space-p">
          {t(after === "recovery" ? "spaceNewPassBody" : after === "change" ? "spaceChangePassphraseBody" : after === "sync" ? "syncPassBody" : "spaceAddPassphraseBody")}
        </p>
        <ManagerHint />
        <PassField
          id="space-newpass"
          label={t("spacePassphrase")}
          value={pass}
          onChange={setPass}
          autoComplete="new-password"
          shown={shown}
          onToggle={() => setShown((v) => !v)}
        />
        <PassField
          id="space-newpass-again"
          label={t("spacePassphraseAgain")}
          value={again}
          onChange={setAgain}
          autoComplete="new-password"
          shown={shown}
        />
        {errorLine}
        <div className="ob-space-actions">
          <button type="submit" className="ob-btn ob-btn--primary" data-testid="space-newpass-save">
            {t(after === "sync" ? "syncOnStart" : "spaceSave")}
          </button>
          <button type="button" className="ob-space-link" onClick={leave}>
            {t(after === "recovery" ? "spaceLater" : "spaceCancel")}
          </button>
        </div>
      </form>
    );
  } else if (step.kind === "join") {
    title = "syncJoinTitle";
    const possible = passkeysPossible();
    // A space open here (Settings, Join my other devices' space) joins the synced one; a file only makes a new space.
    const here = status === "open";
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t("syncJoinBody")}
        </p>
        {here ? <p className="ob-space-note">{t("syncJoinMerge")}</p> : null}
        {here ? null : filePicker("restore")}
        {errorLine}
        <div className="ob-space-actions">
          {possible ? (
            <button type="button" className="ob-btn ob-btn--primary" data-testid="join-passkey" data-autofocus onClick={() => void joinWith("passkey")}>
              {t("syncJoinPasskey")}
            </button>
          ) : null}
          <button
            type="button"
            className={possible ? "ob-btn ob-btn--ghost" : "ob-btn ob-btn--primary"}
            data-testid="join-qr"
            data-autofocus={possible ? undefined : true}
            onClick={() => go({ kind: "link", role: "taker", text: null })}
          >
            <QrCode className="size-4" strokeWidth={1.75} aria-hidden />
            {t("syncJoinQr")}
          </button>
          <button type="button" className="ob-btn ob-btn--ghost" data-testid="join-pass-open" onClick={() => go({ kind: "join-pass" })}>
            {t("syncJoinPass")}
          </button>
          <button type="button" className="ob-btn ob-btn--ghost" data-testid="join-code-open" onClick={() => go({ kind: "join-code" })}>
            {t("syncJoinCode")}
          </button>
          {here ? null : (
            <button type="button" className="ob-btn ob-btn--ghost" data-testid="space-backup-choose" onClick={() => fileRef.current?.click()}>
              {t("syncJoinFile")}
            </button>
          )}
          {here ? null : sharedBox}
          <button type="button" className="ob-space-link" data-testid="join-back" onClick={sheet === "create" ? () => go({ kind: "choose" }) : leave}>
            {t(sheet === "create" ? "spaceBack" : "spaceCancel")}
          </button>
        </div>
      </>
    );
  } else if (step.kind === "join-pass") {
    title = "syncJoinTitle";
    body = (
      <form className="ob-space-form" onSubmit={(e) => void joinWith("pass", e)} noValidate>
        <p id={bodyId} className="ob-space-p">
          {t("syncJoinPassBody")}
        </p>
        <div className="ob-space-field">
          <label htmlFor="join-account">{t("syncAccountId")}</label>
          <input
            id="join-account"
            data-testid="join-account"
            className="ob-space-input ob-space-input--code"
            value={accountIn}
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setAccountIn(e.target.value)}
          />
        </div>
        <PassField
          id="join-pass"
          label={t("spacePassphrase")}
          value={pass}
          onChange={setPass}
          autoComplete="current-password"
          shown={shown}
          onToggle={() => setShown((v) => !v)}
        />
        {errorLine}
        <div className="ob-space-actions">
          <button type="submit" className="ob-btn ob-btn--primary" data-testid="join-pass-go">
            {t("spaceSignIn")}
          </button>
          <button type="button" className="ob-space-link" onClick={() => go({ kind: "join" })}>
            {t("spaceBack")}
          </button>
        </div>
      </form>
    );
  } else if (step.kind === "join-code") {
    title = "syncJoinTitle";
    body = (
      <form className="ob-space-form" onSubmit={(e) => void joinWith("code", e)} noValidate>
        <p id={bodyId} className="ob-space-p">
          {t("syncJoinCodeBody")}
        </p>
        <div className="ob-space-field">
          <label htmlFor="join-code-input">{t("spaceCode")}</label>
          <input
            id="join-code-input"
            data-testid="join-code-input"
            className="ob-space-input ob-space-input--code"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        {errorLine}
        <div className="ob-space-actions">
          <button type="submit" className="ob-btn ob-btn--primary" data-testid="join-code-go">
            {t("spaceSignIn")}
          </button>
          <button type="button" className="ob-space-link" onClick={() => go({ kind: "join" })}>
            {t("spaceBack")}
          </button>
        </div>
      </form>
    );
  } else if (step.kind === "link") {
    title = step.role === "giver" ? "spaceAddDevice" : "syncJoinTitle";
    const pending = (
      <p className="ob-space-p ob-space-busy" aria-live="polite">
        <span className="ob-space-spin" aria-hidden />
        {t("syncLinkWaiting")}
      </p>
    );
    body = (
      <>
        {step.role === "taker" && status === "open" && !sync ? <p className="ob-space-note">{t("syncJoinMerge")}</p> : null}
        <Suspense fallback={pending}>
          <LinkPanel
            role={step.role}
            text={step.text}
            way={held.current}
            shared={shared}
            extra={step.role === "taker" && status !== "open" ? sharedBox : null}
            onDone={linkDone}
            onCancel={() => (sheet === "create" || sheet === "join" ? go({ kind: "join" }) : closeSpaceSheet())}
          />
        </Suspense>
      </>
    );
  } else if (step.kind === "sync-intro") {
    title = "syncOnTitle";
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t("syncEverywhereBody")}
        </p>
        <p className="ob-space-note">{t("syncOnCode")}</p>
        {errorLine}
        <div className="ob-space-actions">
          <button type="button" className="ob-btn ob-btn--primary" data-testid="sync-on-start" data-autofocus onClick={() => go({ kind: "confirm" })}>
            {t("syncOnStart")}
          </button>
          <button type="button" className="ob-btn ob-btn--ghost" data-testid="sync-join-other" onClick={() => go({ kind: "join" })}>
            {t("syncJoinOther")}
          </button>
          <button type="button" className="ob-space-link" onClick={leave}>
            {t("spaceCancel")}
          </button>
        </div>
      </>
    );
  } else if (step.kind === "sync-pass") {
    title = "syncPassTitle";
    body = (
      <form className="ob-space-form" onSubmit={(e) => void syncWithPass(e)} noValidate>
        <p id={bodyId} className="ob-space-p">
          {t("syncPassBody")}
        </p>
        <ManagerHint />
        <PassField
          id="sync-pass"
          label={t("spacePassphrase")}
          value={pass}
          onChange={setPass}
          autoComplete="current-password"
          shown={shown}
          onToggle={() => setShown((v) => !v)}
        />
        {errorLine}
        <div className="ob-space-actions">
          <button type="submit" className="ob-btn ob-btn--primary" data-testid="sync-pass-go">
            {t("syncOnStart")}
          </button>
          <button type="button" className="ob-space-link" onClick={leave}>
            {t("spaceCancel")}
          </button>
        </div>
      </form>
    );
  } else if (step.kind === "sync-key") {
    title = "syncKeyTitle";
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t("syncKeyBody")}
        </p>
        {errorLine}
        <div className="ob-space-actions">
          {canMake ? (
            <button type="button" className="ob-btn ob-btn--primary" data-testid="sync-key-passkey" data-autofocus onClick={() => void syncWithPasskey()}>
              {t("spaceUsePasskey")}
            </button>
          ) : null}
          <button
            type="button"
            className={canMake ? "ob-btn ob-btn--ghost" : "ob-btn ob-btn--primary"}
            data-testid="sync-key-passphrase"
            onClick={() => {
              setPass("");
              setAgain("");
              go({ kind: "newpass", after: "sync" });
            }}
          >
            {t("spaceUsePassphrase")}
          </button>
          <button type="button" className="ob-space-link" onClick={leave}>
            {t("spaceCancel")}
          </button>
        </div>
      </>
    );
  } else if (step.kind === "off-intro") {
    const deleting = sheet === "delete-account";
    title = deleting ? "syncDeleteTitle" : "syncOffTitle";
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t(deleting ? "syncDeleteBody" : "syncOffBody")}
        </p>
        {deleting ? (
          <fieldset className="ob-space-locks" data-testid="sync-delete-local">
            <legend className="sr-only">{t("syncDeleteTitle")}</legend>
            {([false, true] as const).map((wipe) => (
              <label key={String(wipe)} className="ob-check" htmlFor={`sync-delete-${wipe ? "erase" : "keep"}`}>
                <input
                  id={`sync-delete-${wipe ? "erase" : "keep"}`}
                  type="radio"
                  name="sync-delete-local"
                  data-testid={`sync-delete-${wipe ? "erase" : "keep"}`}
                  checked={erase === wipe}
                  onChange={() => setErase(wipe)}
                />
                <span>{t(wipe ? "syncDeleteErase" : "syncDeleteKeep")}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {errorLine}
        <div className="ob-space-actions">
          <button type="button" className="ob-btn ob-btn--danger" data-testid="sync-off-go" data-autofocus onClick={() => go({ kind: "confirm" })}>
            {t(title)}
          </button>
          <button type="button" className="ob-space-link" onClick={leave}>
            {t("spaceCancel")}
          </button>
        </div>
      </>
    );
  } else if (step.kind === "add-choose") {
    title = "spaceAddDevice";
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t("syncAddBody")}
        </p>
        <div className="ob-space-actions">
          <button type="button" className="ob-btn ob-btn--primary" data-testid="sync-add-qr" data-autofocus onClick={() => go({ kind: "confirm" })}>
            <QrCode className="size-4" strokeWidth={1.75} aria-hidden />
            {t("syncAddQr")}
          </button>
          <button type="button" className="ob-btn ob-btn--ghost" data-testid="sync-add-file" onClick={() => go({ kind: "send", files: null, done: null })}>
            <Send className="size-4" strokeWidth={1.75} aria-hidden />
            {t("syncAddFile")}
          </button>
          <p className="ob-space-note">{t("syncAddFileHint")}</p>
          <button type="button" className="ob-space-link" onClick={leave}>
            {t("spaceCancel")}
          </button>
        </div>
      </>
    );
  } else {
    title = "spaceLegacyTitle";
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {legacyCount === 1 ? t("spaceLegacyBodyOne") : t("spaceLegacyBody", { n: legacyCount })}
        </p>
        <div className="ob-space-actions">
          <button
            type="button"
            className="ob-btn ob-btn--primary"
            data-testid="space-legacy-keep"
            data-autofocus
            onClick={() => go({ kind: canMake ? "choose" : "passphrase" })}
          >
            {t("spaceLegacyKeep")}
          </button>
          <button
            type="button"
            className="ob-btn ob-btn--ghost"
            data-testid="space-legacy-erase"
            onClick={() => {
              eraseLegacyData();
              toast(t("spaceLegacyErased"));
              closeSpaceSheet();
            }}
          >
            {t("spaceLegacyErase")}
          </button>
          <button type="button" className="ob-space-link" data-testid="space-legacy-later" onClick={leave}>
            {t("spaceLegacyLater")}
          </button>
        </div>
      </>
    );
  }

  if (typeof document === "undefined" || waiting) return null;
  return createPortal(
    <div
      className="ob-space-scrim"
      data-testid="space-sheet"
      data-step={step.kind}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) leave();
      }}
    >
      <div
        ref={cardRef}
        className="ob-space"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        aria-busy={busy}
        onKeyDown={onKey}
      >
        <div className="ob-space-head">
          <Lock className="size-4 ob-space-mark" strokeWidth={1.75} aria-hidden />
          <h2 id={titleId} className="ob-space-title">
            {t(title)}
          </h2>
          {canLeave ? (
            <button type="button" className="ob-icon-btn ob-icon-btn--quiet" aria-label={t("spaceClose")} onClick={leave}>
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
        {body}
      </div>
    </div>,
    document.body,
  );
}
