import { Link } from "@tanstack/react-router";
import { Download, Lock, Send, Settings } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AnchoredPopover } from "@/components/anchored-popover";
import { useI18n } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { openSpaceSheet, useSpace } from "@/lib/space/state";
import { toast } from "@/lib/toast";
import { loadSpaceRuntime } from "@/lib/space/load";

const LOCK_LINE: Record<string, MessageKey> = {
  close: "spaceLockClose",
  idle: "spaceLockIdle",
  stay: "spaceLockStay",
};

/**
 * The top bar's way into the private space: "Sign in" with a small lock when
 * there is none, "Unlock" when it is locked, and while it is open "Private",
 * with a menu to lock it now or see what is kept.
 */
export function SpaceButton({ unkept = false }: { unkept?: boolean } = {}) {
  const { t } = useI18n();
  const status = useSpace((s) => s.status);
  const lock = useSpace((s) => s.lock);
  const backupAt = useSpace((s) => s.backupAt);
  const backupDue = useSpace((s) => s.backupDue);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setMenu(false), []);

  if (status === "unavailable") return null;

  if (status === "open") {
    return (
      <>
        <button
          ref={ref}
          type="button"
          className="ob-icon-btn ob-space-btn"
          data-testid="space-button"
          data-space="open"
          data-due={backupDue ? "" : undefined}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label={backupDue ? `${t("spacePrivateHere")} · ${t(backupAt === null ? "spaceBackupNone" : "spaceBackupDue")}` : t("spacePrivateHere")}
          title={t("spacePrivateHere")}
          onClick={() => setMenu((v) => !v)}
        >
          <Lock className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="ob-space-label">{t("spacePrivate")}</span>
        </button>
        <AnchoredPopover
          open={menu}
          anchorRef={ref}
          onClose={close}
          align="end"
          width={260}
          testId="space-menu"
          role="menu"
          aria-label={t("spacePrivateHere")}
          hideLabel={t("spaceClose")}
        >
          <div className="ob-pop ob-menu">
            <div className="ob-menu-who">
              <span className="ob-menu-who-name">{t("spacePrivateHere")}</span>
              <span className="ob-menu-who-sub">{t(LOCK_LINE[lock] ?? "spaceLockClose")}</span>
            </div>
            <div className="ob-menu-group ob-menu-group--last">
              <button
                type="button"
                role="menuitem"
                className="ob-menu-item"
                data-testid="space-lock-now"
                onClick={() => {
                  close();
                  void loadSpaceRuntime()
                    .then((m) => m.lockSpace())
                    .then(() => toast(t("spaceLocked")));
                }}
              >
                <Lock className="size-4" strokeWidth={1.75} aria-hidden />
                <span>{t("spaceLockNow")}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="ob-menu-item"
                data-testid="space-add-device-now"
                onClick={() => {
                  close();
                  openSpaceSheet("add-device");
                }}
              >
                <Send className="size-4" strokeWidth={1.75} aria-hidden />
                <span>{t("spaceAddDevice")}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="ob-menu-item"
                data-testid="space-backup-now"
                onClick={() => {
                  close();
                  void loadSpaceRuntime()
                    .then((m) => m.downloadBackup())
                    .then(
                      () => toast(t("spaceBackupSaved")),
                      () => toast(t("spaceFailed"), "error"),
                    );
                }}
              >
                <Download className="size-4" strokeWidth={1.75} aria-hidden />
                <span className="ob-menu-item-text">
                  {t("spaceBackupDownload")}
                  {backupDue ? (
                    <span className="ob-menu-item-sub" data-testid="space-backup-due">
                      {t(backupAt === null ? "spaceBackupNone" : "spaceBackupDue")}
                    </span>
                  ) : null}
                </span>
              </button>
              <Link to="/settings" hash="data" role="menuitem" className="ob-menu-item" data-testid="space-your-data" onClick={close}>
                <Settings className="size-4" strokeWidth={1.75} aria-hidden />
                <span>{t("dataTitle")}</span>
              </Link>
            </div>
          </div>
        </AnchoredPopover>
      </>
    );
  }

  const locked = status === "locked";
  return (
    <button
      type="button"
      className="ob-icon-btn ob-space-btn"
      data-testid="space-button"
      data-space={status}
      // The chart on screen isn't kept: a dot, the note under the chart having shown once (part 95).
      data-due={unkept ? "" : undefined}
      data-unkept={unkept ? "" : undefined}
      aria-label={unkept ? `${t(locked ? "spaceUnlock" : "spaceSignIn")} · ${t("keepNotKept")}` : t(locked ? "spaceUnlock" : "spaceSignIn")}
      title={t(locked ? "spaceUnlockTitle" : "spaceTitle")}
      disabled={status === "checking"}
      onClick={() => openSpaceSheet(locked ? "unlock" : "create")}
    >
      <Lock className="size-4" strokeWidth={1.75} aria-hidden />
      <span className="ob-space-label">{t(locked ? "spaceUnlock" : "spaceSignIn")}</span>
    </button>
  );
}
