import { Eye, EyeOff, Lock, X } from "lucide-react";
import {
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
import type { MessageKey } from "@/lib/i18n/messages";
import { dateFormat } from "@/lib/intl-cache";
import { MIN_PASSPHRASE, formatRecoveryCode, newSpaceSeed, normalizePassphrase } from "@/lib/space/crypto";
import { eraseLegacyData, legacyChartCount } from "@/lib/space/legacy";
import { loadSpaceRuntime } from "@/lib/space/load";
import {
  PasskeyCancelled,
  PasskeyExists,
  PasskeyNoPrf,
  forgetUnusedPasskey,
  makePasskey,
  readPasskey,
  type PasskeyRef,
  type PasskeySecretRead,
} from "@/lib/space/passkey";
import { passkeyPrfLikely, passkeysPossible } from "@/lib/space/passkey-support";
import { closeSpaceSheet, useSpace, type SpaceSheet as SheetKind } from "@/lib/space/state";
import type { SpaceBackup, WayIn } from "@/lib/space/vault";
import { toast } from "@/lib/toast";

/*
 * The private space's sheet: signing in for the first time (a passkey or a
 * passphrase, then the recovery code, shown once), unlocking (a passkey, the
 * passphrase, or the recovery code and then a new passphrase), changing what
 * opens the space (each change asks for one of its ways in first), and the one
 * question about charts kept in the clear before private spaces. Its own
 * download (space-gate.tsx).
 *
 * A passkey's window is asked for straight from the click that wants it, with
 * nothing awaited before, as some browsers only allow it then.
 */

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

type Step =
  | { kind: "choose" }
  | { kind: "passphrase" }
  | { kind: "busy"; label: MessageKey }
  /** A recovery code, shown once: a new space's (`fresh`), or a new one for the space. */
  | { kind: "code"; code: string; fresh: boolean }
  | { kind: "unlock" }
  | { kind: "recovery" }
  /** Before a change to the ways in: one of them, given again. */
  | { kind: "confirm" }
  | { kind: "confirm-code" }
  /** A passphrase to set: after unlocking with the recovery code, or changed, or added. */
  | { kind: "newpass"; after: "recovery" | "change" | "add" }
  /** A backup file to choose: made this browser's space, or its charts added to the open one. */
  | { kind: "file"; purpose: BackupUse }
  /** The chosen backup, opened with one of its own ways in. */
  | { kind: "backup"; purpose: BackupUse; backup: SpaceBackup }
  | { kind: "backup-code"; purpose: BackupUse; backup: SpaceBackup }
  | { kind: "legacy" };

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

function firstStep(sheet: SheetKind): Step {
  if (sheet === "unlock") return { kind: "unlock" };
  if (sheet === "legacy") return { kind: "legacy" };
  if (sheet === "restore" || sheet === "import") return { kind: "file", purpose: sheet };
  if (isManage(sheet)) return { kind: "confirm" };
  return { kind: "choose" };
}

function named(err: unknown, name: string): boolean {
  return err instanceof Error && err.name === name;
}

/** The space locked (or went) while the sheet was up. */
function gone(err: unknown): boolean {
  return named(err, "SpaceLocked") || (err instanceof Error && err.message === "space-locked");
}

type Translate = ReturnType<typeof useI18n>["t"];

/** What went wrong, for the reader. `making`: a passkey was being made. */
function problem(err: unknown, t: Translate, making: boolean): string {
  if (err instanceof PasskeyCancelled) return t("spacePasskeyCancelled");
  if (err instanceof PasskeyExists) return t("spacePasskeyExists");
  if (err instanceof PasskeyNoPrf) return t(making ? "spacePasskeyNoPrf" : "spacePasskeyNoPrfUnlock");
  if (named(err, "WrongSecret")) return t("spaceWrong");
  if (err instanceof Error && err.message === "no-way-in") return t("spaceLastWay");
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
  const { t } = useI18n();
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

export function SpaceSheet() {
  const { t, locale } = useI18n();
  const sheet = useSpace((s) => s.sheet);
  const sheetFor = useSpace((s) => s.sheetFor);
  const status = useSpace((s) => s.status);
  const hasPassphrase = useSpace((s) => s.hasPassphrase);
  const passkeys = useSpace((s) => s.passkeys);
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(() => firstStep(sheet));
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [code, setCode] = useState("");
  const [shown, setShown] = useState(false);
  const [kept, setKept] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether a new passkey would open the space in this browser (known a moment after the sheet mounts).
  const [canMake, setCanMake] = useState<boolean | null>(null);
  // The way in given for a change, held until the change is made (and wiped with the sheet).
  const held = useRef<WayIn | null>(null);
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

  // A change to the ways in, or charts added from a backup, needs the space open: if it locks meanwhile, the sheet goes.
  useEffect(() => {
    if ((manage || sheet === "import") && status !== "open") closeSpaceSheet();
  }, [manage, sheet, status]);

  // A new step: its first field or button has the focus.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const target = card.querySelector<HTMLElement>("input:not([type=hidden]):not([aria-hidden]), [data-autofocus]");
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
    setStep({ kind: "busy", label: "spaceCreating" });
    try {
      const runtime = await loadSpaceRuntime();
      const recovery = await runtime.createSpace({ passphrase: pass });
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
      const recovery = await runtime.createSpace({ passkey: made }, seed);
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

  /** The way in is given: the change the sheet was opened for, or the next step of it. */
  async function change(way: WayIn): Promise<void> {
    const runtime = await loadSpaceRuntime();
    const vault = runtime.currentVault();
    if (!vault) throw new Error("space-locked");
    if (manage === "passphrase") {
      await vault.confirm(way);
      keep(way);
      setPass("");
      setAgain("");
      go({ kind: "newpass", after: hasPassphrase ? "change" : "add" });
      return;
    }
    if (manage === "add-passkey") {
      await vault.confirm(way);
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
      runtime.spaceChanged();
      toast(t("spacePasskeyAddedToast"));
      closeSpaceSheet();
      return;
    }
    if (manage === "remove-passkey") {
      if (!sheetFor) throw new Error("no-passkey");
      await vault.removePasskey(way, sheetFor);
      runtime.spaceChanged();
      toast(t("spacePasskeyRemoved"));
      closeSpaceSheet();
      return;
    }
    if (manage === "remove-passphrase") {
      await vault.removePassphrase(way);
      runtime.spaceChanged();
      toast(t("spacePassphraseRemoved"));
      closeSpaceSheet();
      return;
    }
    if (manage === "new-code") {
      const fresh = await vault.newRecoveryCode(way);
      runtime.spaceChanged();
      go({ kind: "code", code: fresh, fresh: false });
    }
  }

  /** One of the ways in, given before a change. */
  async function confirmWith(kind: "passphrase" | "recovery" | "passkey", e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const back: Step = kind === "recovery" ? { kind: "confirm-code" } : { kind: "confirm" };
    let way: WayIn;
    let read: PasskeySecretRead | null = null;
    if (kind === "passkey") {
      setStep({ kind: "busy", label: "spaceWaitingPasskey" });
      try {
        read = await readPasskey(passkeys);
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
    setStep({ kind: "busy", label: "spaceChecking" });
    try {
      await change(way);
      setPass("");
      setCode("");
    } catch (err) {
      if (gone(err)) {
        closeSpaceSheet();
        return;
      }
      fail(back, problem(err, t, manage === "add-passkey" && !named(err, "WrongSecret")));
    } finally {
      // Kept for the next step only when the change goes on (a new passphrase).
      if (read && held.current !== way) read.prf.fill(0);
    }
  }

  async function newPassphrase(e: FormEvent, after: "recovery" | "change" | "add") {
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
    setStep({ kind: "busy", label: "spaceSaving" });
    try {
      const runtime = await loadSpaceRuntime();
      const vault = runtime.currentVault();
      if (!vault) throw new Error("space-locked");
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
      fail({ kind: "newpass", after }, t("spaceFailed"));
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
        await runtime.restoreSpace(backup, way);
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
  function manageText(): { title: MessageKey; warn: string | null } {
    if (manage === "remove-passkey") {
      const target = passkeys.find((p) => p.credId === sheetFor);
      const date = target
        ? dateFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(target.added))
        : "";
      return { title: "spaceRemovePasskeyTitle", warn: t("spaceRemovePasskeyBody", { date }) };
    }
    if (manage === "remove-passphrase") return { title: "spaceRemovePassphraseTitle", warn: t("spaceRemovePassphraseBody") };
    if (manage === "new-code") return { title: "spaceNewCodeTitle", warn: t("spaceNewCodeWarn") };
    if (manage === "add-passkey") return { title: "spaceAddPasskey", warn: null };
    return { title: hasPassphrase ? "spaceChangePassphraseTitle" : "spaceAddPassphraseTitle", warn: null };
  }

  let title: MessageKey = "spaceTitle";
  let body: ReactNode = null;
  if (step.kind === "choose") {
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t("spaceBody")}
        </p>
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
          <button type="button" className="ob-space-link" data-testid="space-not-now" onClick={leave}>
            {t("spaceNotNow")}
          </button>
          <button
            type="button"
            className="ob-space-link ob-space-link--small"
            data-testid="space-restore"
            onClick={() => go({ kind: "file", purpose: "restore" })}
          >
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
    body = (
      <>
        <p id={bodyId} className="ob-space-p">
          {t(fresh ? (hasPassphrase ? "spaceCodeBody" : "spaceCodeBodyKey") : "spaceNewCodeBody")}
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
        {fresh ? <p className="ob-space-note">{t("spaceLocksWhen")}</p> : null}
        <div className="ob-space-actions">
          <button
            type="button"
            className="ob-btn ob-btn--primary"
            data-testid="space-done"
            disabled={!kept}
            onClick={() => {
              toast(t(fresh ? "spaceCreated" : "spaceNewCodeDone"));
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
          {t("spaceConfirmBody")}
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
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          data-testid="space-backup-file"
          onChange={(e) => void pickBackup(e, purpose)}
        />
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
          <button type="button" className="ob-space-link" onClick={fromChoose ? () => go({ kind: "choose" }) : leave}>
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
  } else if (step.kind === "newpass") {
    const after = step.after;
    title = after === "add" ? "spaceAddPassphraseTitle" : after === "change" ? "spaceChangePassphraseTitle" : "spaceNewPassTitle";
    body = (
      <form className="ob-space-form" onSubmit={(e) => void newPassphrase(e, after)} noValidate>
        <p id={bodyId} className="ob-space-p">
          {t(after === "recovery" ? "spaceNewPassBody" : after === "change" ? "spaceChangePassphraseBody" : "spaceAddPassphraseBody")}
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
            {t("spaceSave")}
          </button>
          <button type="button" className="ob-space-link" onClick={leave}>
            {t(after === "recovery" ? "spaceLater" : "spaceCancel")}
          </button>
        </div>
      </form>
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
