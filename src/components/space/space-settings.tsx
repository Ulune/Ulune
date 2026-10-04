import { Download, KeyRound, Lock, Send, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import type { AppLocale, MessageKey } from "@/lib/i18n/messages";
import { devicesText, type DevicesKey } from "@/lib/i18n/space-devices";
import { dateFormat } from "@/lib/intl-cache";
import { inSafariTab } from "@/lib/space/home-screen";
import { passkeyPrfLikely } from "@/lib/space/passkey-support";
import { openSpaceSheet, useSpace } from "@/lib/space/state";
import type { LockMode } from "@/lib/space/store";
import { toast } from "@/lib/toast";
import { loadSpaceRuntime } from "@/lib/space/load";

const LOCKS: { id: LockMode; label: MessageKey; hint?: (t: Translate, locale: AppLocale) => string }[] = [
  { id: "stay", label: "spaceLockStay", hint: (t) => t("spaceLockStayWarn") },
  { id: "idle", label: "spaceLockIdle" },
  { id: "close", label: "spaceLockClose", hint: (_t, locale) => devicesText(locale, "lockCloseHint") },
];

type Translate = ReturnType<typeof useI18n>["t"];

/** Your other devices: the space sent to one of them, sealed, through the share sheet (nothing goes through Ulune). */
function OtherDevices() {
  const { t, locale } = useI18n();
  const d = (key: DevicesKey) => devicesText(locale, key);
  return (
    <div className="ob-space-ways" data-testid="space-devices">
      <h3 className="ob-menu-label ob-space-ways-h">{d("devicesTitle")}</h3>
      <p className="ob-data-body">{d("devicesBody")}</p>
      <div className="ob-data-actions">
        <button type="button" className="ob-btn ob-btn--ghost" data-testid="space-add-device" onClick={() => openSpaceSheet("add-device")}>
          <Send className="size-4" strokeWidth={1.75} aria-hidden />
          {t("spaceAddDevice")}
        </button>
        <button type="button" className="ob-btn ob-btn--ghost" data-testid="space-backup-import" onClick={() => openSpaceSheet("import")}>
          <Upload className="size-4" strokeWidth={1.75} aria-hidden />
          {t("spaceImport")}
        </button>
      </div>
    </div>
  );
}

/**
 * What opens the open space: its passphrase, its passkeys, its recovery code.
 * Each change goes through the sheet, which asks for one of them first; the
 * last passphrase or passkey can't be removed (the space must still open
 * without the recovery code).
 */
function WaysIn() {
  const { t, locale } = useI18n();
  const hasPassphrase = useSpace((s) => s.hasPassphrase);
  const passkeys = useSpace((s) => s.passkeys);
  const [canAdd, setCanAdd] = useState<boolean | null>(null);
  const ways = (hasPassphrase ? 1 : 0) + passkeys.length;

  useEffect(() => {
    let on = true;
    void passkeyPrfLikely().then((ok) => {
      if (on) setCanAdd(ok);
    });
    return () => {
      on = false;
    };
  }, []);

  const added = (ms: number) => dateFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));

  return (
    <div className="ob-space-ways" data-testid="space-ways">
      <h3 className="ob-menu-label ob-space-ways-h">{t("spaceWays")}</h3>
      <ul className="ob-space-way-list">
        <li className="ob-space-way" data-testid="space-way-passphrase">
          <span className="ob-space-way-name">{t(hasPassphrase ? "spacePassphrase" : "spaceNoPassphrase")}</span>
          <span className="ob-space-way-acts">
            <button
              type="button"
              className="ob-btn ob-btn--ghost"
              data-testid="space-passphrase-set"
              onClick={() => openSpaceSheet("passphrase")}
            >
              {t(hasPassphrase ? "spaceChange" : "spaceAdd")}
            </button>
            {hasPassphrase && ways > 1 ? (
              <button
                type="button"
                className="ob-btn ob-btn--ghost"
                data-testid="space-passphrase-remove"
                onClick={() => openSpaceSheet("remove-passphrase")}
              >
                {t("spaceRemove")}
              </button>
            ) : null}
          </span>
        </li>
        {passkeys.map((p) => (
          <li key={p.credId} className="ob-space-way" data-testid="space-way-passkey">
            <span className="ob-space-way-name">
              {t("spacePasskey")}
              <span className="ob-space-way-sub">{t("spaceAddedOn", { date: added(p.added) })}</span>
            </span>
            {ways > 1 ? (
              <span className="ob-space-way-acts">
                <button
                  type="button"
                  className="ob-btn ob-btn--ghost"
                  data-testid="space-passkey-remove"
                  onClick={() => openSpaceSheet("remove-passkey", p.credId)}
                >
                  {t("spaceRemove")}
                </button>
              </span>
            ) : null}
          </li>
        ))}
        <li className="ob-space-way" data-testid="space-way-code">
          <span className="ob-space-way-name">{t("spaceCode")}</span>
          <span className="ob-space-way-acts">
            <button type="button" className="ob-btn ob-btn--ghost" data-testid="space-new-code" onClick={() => openSpaceSheet("new-code")}>
              {t("spaceNewCode")}
            </button>
          </span>
        </li>
      </ul>
      {canAdd ? (
        <div className="ob-data-actions">
          <button type="button" className="ob-btn ob-btn--ghost" data-testid="space-add-passkey" onClick={() => openSpaceSheet("add-passkey")}>
            <KeyRound className="size-4" strokeWidth={1.75} aria-hidden />
            {t("spaceAddPasskey")}
          </button>
        </div>
      ) : canAdd === false ? (
        <p className="ob-space-note" data-testid="space-passkeys-unavailable">
          {t("spacePasskeysUnavailable")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The space as one encrypted file: when the last was made, whether the charts
 * changed since, a download, charts added from another backup, and whether
 * this browser promises to keep the space.
 */
function Backup() {
  const { t, locale } = useI18n();
  const backupAt = useSpace((s) => s.backupAt);
  const backupDue = useSpace((s) => s.backupDue);
  const [kept, setKept] = useState<boolean | null>(null);
  const [safari, setSafari] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let on = true;
    setSafari(inSafariTab());
    const persisted = navigator.storage?.persisted?.() ?? Promise.resolve(false);
    void persisted.then(
      (yes) => {
        if (on) setKept(yes);
      },
      () => {
        if (on) setKept(false);
      },
    );
    return () => {
      on = false;
    };
  }, []);

  const last =
    backupAt === null
      ? t("spaceBackupNever")
      : t("spaceBackupLast", { date: dateFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(backupAt)) });

  return (
    <div className="ob-space-ways" data-testid="space-backup" data-due={backupDue ? "" : undefined}>
      <h3 className="ob-menu-label ob-space-ways-h">{t("spaceBackupTitle")}</h3>
      <p className="ob-data-body" data-testid="space-backup-line">
        {last}
        {backupDue && backupAt !== null ? ` ${t("spaceBackupChanged")}` : ""}
      </p>
      <div className="ob-data-actions">
        <button
          type="button"
          className="ob-btn ob-btn--ghost"
          data-testid="space-backup-download"
          disabled={saving}
          onClick={() => {
            setSaving(true);
            void loadSpaceRuntime()
              .then((m) => m.downloadBackup())
              .then(
                () => toast(t("spaceBackupSaved")),
                () => toast(t("spaceFailed"), "error"),
              )
              .finally(() => setSaving(false));
          }}
        >
          <Download className="size-4" strokeWidth={1.75} aria-hidden />
          {t("spaceBackupDownload")}
        </button>
      </div>
      <p className="ob-space-note">{t("spaceBackupHint")}</p>
      {kept === null ? null : (
        <p className="ob-space-note" data-testid="space-storage">
          {t(kept ? "spaceStorageKept" : "spaceStorageMay")}
        </p>
      )}
      {safari ? (
        <p className="ob-space-note" data-testid="space-safari-hint">
          {t("spaceSafariHint")}
        </p>
      ) : null}
    </div>
  );
}

/** Settings → the private space: what it is now, when it locks, its backup, and what opens it. */
export function SpaceSettings() {
  const { t, locale } = useI18n();
  const status = useSpace((s) => s.status);
  const lock = useSpace((s) => s.lock);
  // The choice shows at once; the space takes it a moment later.
  const [choosing, setChoosing] = useState<LockMode | null>(null);
  const shownLock = choosing ?? lock;

  const line: MessageKey =
    status === "open"
      ? "spaceStatusOpen"
      : status === "locked"
        ? "spaceStatusLocked"
        : status === "unavailable"
          ? "spaceUnavailable"
          : "spaceStatusNone";

  return (
    <section className="ulune-panel ob-settings-card" id="space" data-testid="settings-space" data-space={status}>
      <h2 className="ob-settings-h">{t("spaceSection")}</h2>
      <p className="ob-data-body">{status === "checking" ? "" : t(line)}</p>
      {status === "none" || status === "locked" ? (
        <div className="ob-data-actions">
          <button
            type="button"
            className="ob-btn ob-btn--primary"
            data-testid="settings-space-open"
            onClick={() => openSpaceSheet(status === "locked" ? "unlock" : "create")}
          >
            <Lock className="size-4" strokeWidth={1.75} aria-hidden />
            {t(status === "locked" ? "spaceUnlock" : "spaceSignIn")}
          </button>
          {status === "none" ? (
            <button
              type="button"
              className="ob-btn ob-btn--ghost"
              data-testid="settings-space-restore"
              onClick={() => openSpaceSheet("restore")}
            >
              <Upload className="size-4" strokeWidth={1.75} aria-hidden />
              {t("spaceRestore")}
            </button>
          ) : null}
        </div>
      ) : null}
      {status === "open" ? (
        <>
          <fieldset className="ob-space-locks" data-testid="space-locks">
            <legend className="ob-menu-label">{t("spaceLockTitle")}</legend>
            {LOCKS.map((option) => (
              <label key={option.id} className="ob-check" htmlFor={`space-lock-${option.id}`}>
                <input
                  id={`space-lock-${option.id}`}
                  type="radio"
                  name="space-lock"
                  data-testid={`space-lock-${option.id}`}
                  checked={shownLock === option.id}
                  onChange={() => {
                    setChoosing(option.id);
                    void loadSpaceRuntime()
                      .then((m) => m.setSpaceLock(option.id))
                      .then(
                        () => toast(t("spaceLockSaved")),
                        () => toast(t("spaceFailed"), "error"),
                      )
                      .finally(() => setChoosing(null));
                  }}
                />
                <span>
                  {t(option.label)}
                  {option.hint ? <span className="ob-check-hint"> — {option.hint(t, locale)}</span> : null}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="ob-data-actions">
            <button
              type="button"
              className="ob-btn ob-btn--ghost"
              data-testid="settings-space-lock"
              onClick={() => {
                void loadSpaceRuntime()
                  .then((m) => m.lockSpace())
                  .then(() => toast(t("spaceLocked")));
              }}
            >
              <Lock className="size-4" strokeWidth={1.75} aria-hidden />
              {t("spaceLockNow")}
            </button>
          </div>
          <OtherDevices />
          <Backup />
          <WaysIn />
        </>
      ) : null}
    </section>
  );
}
