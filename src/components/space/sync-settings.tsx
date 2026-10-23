import "./sync.css";
import { Copy, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { syncWords } from "@/lib/i18n/catalog/sync-words";
import { bookT } from "@/lib/i18n/words-book";
import { dateFormat } from "@/lib/intl-cache";
import { importWithRetry } from "@/lib/lazy-retry";
import { openSpaceSheet, useSpace, type SyncView } from "@/lib/space/state";
import type { DeviceRow } from "@/lib/account/client/setup";
import { formatAccountId } from "@/lib/account/client/account-id";

/*
 * Settings › Private space, its sync part (share and compare plan, feature 4): while the space is
 * on this device only, what sync would do and the way to turn it on; once it syncs, how it is
 * going ("Synced · just now", "Waiting for the network", "Sync paused: sign in again"), the
 * account's id to copy (a new device asks for it with the passphrase), the signed-in devices with
 * their names (sealed on the server, opened here) and the days they joined and were last seen,
 * each one but this removable, the two-year rule said plainly, the recovery code's reminder, and
 * the two ways out: stop syncing (the server's copy deleted), or delete the account.
 */

const loadAccount = () => importWithRetry(() => import("@/lib/account/client/setup"));

type Translate = ReturnType<typeof bookT<typeof syncWords>>;

/** "just now", "5 min ago", "3 h ago", or the day. */
function ago(at: number, t: Translate, locale: string): string {
  const min = Math.floor((Date.now() - at) / 60_000);
  if (min < 1) return t("syncJustNow");
  if (min < 60) return t("syncMinutesAgo", { n: min });
  if (min < 24 * 60) return t("syncHoursAgo", { n: Math.floor(min / 60) });
  return dateFormat(locale === "en" ? "en-GB" : locale, { dateStyle: "medium" }).format(new Date(at));
}

/** The sync's state in a few words. */
function syncLine(sync: SyncView, t: Translate, locale: string): string {
  if (sync.state === "offline") return t("syncStateOffline");
  if (sync.state === "paused") return t("syncStatePaused");
  if (sync.state === "full") return t("syncStateFull");
  if (sync.state === "error") return t("syncStateError");
  if (sync.state === "busy" && !sync.at) return t("syncStateBusy");
  return t("syncStateOk", { when: sync.at ? ago(sync.at, t, locale) : t("syncJustNow") });
}

/** The devices signed in to the account, read when the part shows (and again on asking). */
function Devices() {
  const { t: tc, locale } = useI18n();
  const t = bookT(syncWords, tc, locale);
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Read again once a sheet closes (a device removed, another added).
  const sheet = useSpace((s) => s.sheet);
  const read = useCallback(() => {
    setFailed(false);
    void loadAccount()
      .then((m) => m.listDevices())
      .then(setDevices, () => setFailed(true));
  }, []);
  useEffect(() => {
    if (sheet === null) read();
  }, [sheet, read]);
  // The days are whole days in UTC, as the server keeps them.
  const day = (n: number) => dateFormat(locale === "en" ? "en-GB" : locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(n * 86_400_000));
  return (
    <div className="ob-space-ways" data-testid="sync-devices">
      <h4 className="ob-menu-label ob-space-ways-h">{t("syncDevices")}</h4>
      {failed ? (
        <p className="ob-space-note" data-testid="sync-devices-failed">
          {t("syncOffline")}{" "}
          <button type="button" className="ob-space-link ob-sync-inline" onClick={read}>
            <RefreshCw className="size-3.5" strokeWidth={1.75} aria-hidden />
            {t("syncStateBusy")}
          </button>
        </p>
      ) : null}
      {devices ? (
        <ul className="ob-space-way-list">
          {devices.map((device) => (
            <li key={device.id} className="ob-space-way" data-testid="sync-device" data-device={device.id} data-current={device.current ? "" : undefined}>
              <span className="ob-space-way-name">
                <span data-testid="sync-device-name">{device.name ?? t("syncDeviceUnnamed")}</span>
                {device.current ? <span className="ob-sync-tag">{t("syncThisDevice")}</span> : null}
                <span className="ob-space-way-sub">{t("syncDeviceDays", { added: day(device.created), seen: day(device.seen) })}</span>
              </span>
              {device.current ? null : (
                <span className="ob-space-way-acts">
                  <button
                    type="button"
                    className="ob-btn ob-btn--ghost"
                    data-testid="sync-device-remove"
                    aria-label={t("syncRemoveNamed", { name: device.name ?? t("syncDeviceUnnamed") })}
                    onClick={() => openSpaceSheet("remove-device", `${device.id}:${device.name ?? ""}`)}
                  >
                    {t("syncRemove")}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : failed ? null : (
        <p className="ob-space-p ob-space-busy" aria-live="polite">
          <span className="ob-space-spin" aria-hidden />
          {t("syncStateBusy")}
        </p>
      )}
    </div>
  );
}

/** Settings › Private space: the sync part, while the space is open. */
export function SyncSettings() {
  const { t: tc, locale } = useI18n();
  const t = bookT(syncWords, tc, locale);
  const sync = useSpace((s) => s.sync);
  const [copied, setCopied] = useState(false);
  const [, tick] = useState(0);
  // "Synced · 3 min ago" stays true as the minutes pass.
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!sync) {
    return (
      <div className="ob-space-ways" data-testid="sync-settings" data-sync="off">
        <h3 className="ob-menu-label ob-space-ways-h">{t("syncTitle")}</h3>
        <p className="ob-data-body">{t("syncOffLine")}</p>
        <p className="ob-space-note">{t("syncOffHint")}</p>
        <div className="ob-data-actions">
          <button type="button" className="ob-btn ob-btn--ghost" data-testid="settings-sync-on" onClick={() => openSpaceSheet("sync-on")}>
            {t("syncTurnOn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-space-ways" data-testid="sync-settings" data-sync={sync.state}>
      <h3 className="ob-menu-label ob-space-ways-h">{t("syncTitle")}</h3>
      <p className="ob-data-body ob-sync-status" data-testid="sync-status" data-state={sync.state} role="status">
        <span className="ob-sync-dot" data-state={sync.state} aria-hidden />
        {syncLine(sync, t, locale)}
      </p>
      {sync.state === "paused" ? (
        <div className="ob-sync-paused" data-testid="sync-paused">
          <p className="ob-space-note">{t("syncSignInAgainBody")}</p>
          <div className="ob-data-actions">
            <button type="button" className="ob-btn ob-btn--primary" data-testid="sync-sign-in-again" onClick={() => openSpaceSheet("sign-in-again")}>
              {t("syncSignInAgain")}
            </button>
          </div>
        </div>
      ) : null}
      <div className="ob-space-field ob-sync-id" role="group" aria-labelledby="sync-account-h">
        <p id="sync-account-h" className="ob-sync-id-h">
          {t("syncAccountId")}
        </p>
        <div className="ob-sync-row">
          <p className="ob-space-code ob-sync-account" data-testid="sync-account">
            {formatAccountId(sync.account)}
          </p>
          <button
            type="button"
            className="ob-btn ob-btn--ghost"
            data-testid="sync-account-copy"
            onClick={() => {
              void navigator.clipboard?.writeText(formatAccountId(sync.account)).then(
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2400);
                },
                () => setCopied(false),
              );
            }}
          >
            <Copy className="size-4" strokeWidth={1.75} aria-hidden />
            {copied ? t("syncCopied") : t("syncCopyId")}
          </button>
        </div>
        <p className="ob-space-note">{t("syncCodeReminder")}</p>
      </div>
      {sync.state === "paused" ? null : <Devices />}
      <p className="ob-space-note" data-testid="sync-rule">
        {t("syncRule")}
      </p>
      <div className="ob-data-actions ob-sync-actions">
        <button type="button" className="ob-btn ob-btn--ghost" data-testid="sync-off" onClick={() => openSpaceSheet("sync-off")}>
          {t("syncOffTitle")}
        </button>
        <button type="button" className="ob-btn ob-btn--ghost ob-sync-danger" data-testid="sync-delete" onClick={() => openSpaceSheet("delete-account")}>
          {t("syncDeleteTitle")}
        </button>
      </div>
    </div>
  );
}
