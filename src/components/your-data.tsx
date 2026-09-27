import { Link } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AI_ENABLED } from "@/lib/features";
import { useI18n } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { offlineChoice, offlineSupported, turnOfflineOff, turnOfflineOn } from "@/lib/offline";
import { reportsOn, setReportsOn } from "@/lib/error-report";
import { toast } from "@/lib/toast";
import { spaceSupported } from "@/lib/space/store";
import { SPACE_FLAG } from "@/lib/space/flag";
import { ERASED_NOTE, LEGACY_PREFIX, LEGACY_SPACE_DB, OLD_SIGN_IN_PREFIX } from "@/lib/space/legacy";
import { loadSpaceRuntime } from "@/lib/space/load";
import { useSpace, type SpaceStatus } from "@/lib/space/state";

const PREFIX = "ulune.";
const SPACE_DB = "ulune-space";

/** Every key Ulune left in this browser's localStorage, with what the prototype left (its charts, its sign-in). */
function storedKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith(PREFIX) || k.startsWith(LEGACY_PREFIX) || k.startsWith(OLD_SIGN_IN_PREFIX))) out.push(k);
    }
  } catch {
    /* ignore */
  }
  return out.sort();
}

/** The display settings kept in the clear (the private space's flag is not one). */
function settingKeys(): string[] {
  return storedKeys().filter((k) => k.startsWith(PREFIX) && k !== SPACE_FLAG);
}

const SPACE_LINE: Record<SpaceStatus, MessageKey> = {
  checking: "dataSpaceNone",
  none: "dataSpaceNone",
  locked: "dataSpaceLocked",
  open: "dataSpaceOpen",
  unavailable: "dataSpaceUnavailable",
};

function saveFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Settings → Your data: everything Ulune keeps on this device and everything
 * that leaves it, a readable copy to download, and erasing all of it.
 */
export function YourData() {
  const { t } = useI18n();
  const status = useSpace((s) => s.status);
  const [count, setCount] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [offline, setOffline] = useState<boolean | null>(null);
  const [reports, setReports] = useState(true);

  useEffect(() => {
    setCount(settingKeys().length);
    setOffline(offlineSupported() ? offlineChoice() === "on" : null);
    setReports(reportsOn());
  }, []);

  async function exportAll() {
    const settings: Record<string, unknown> = {};
    for (const k of settingKeys()) {
      const raw = window.localStorage.getItem(k);
      try {
        settings[k] = raw == null ? null : JSON.parse(raw);
      } catch {
        settings[k] = raw;
      }
    }
    // The charts and partners too while the space is open; AI keys never.
    const space = useSpace.getState().status === "open" ? await (await loadSpaceRuntime()).readableCopy() : null;
    const copy = {
      app: "ulune",
      type: "readable-copy",
      exported: new Date().toISOString(),
      settings,
      ...(space ? { charts: space.charts, partners: space.partners } : {}),
    };
    saveFile(`ulune-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(copy, null, 2));
    toast(t("dataExported"));
  }

  /**
   * Everything Ulune keeps on this device: the private space (its records,
   * its key, its flag), the settings, the offline copy of the app, and what
   * the prototype's sign-in left. Then the page starts again and says so.
   */
  async function wipe() {
    setErasing(true);
    if (spaceSupported()) {
      try {
        await (await loadSpaceRuntime()).eraseSpace();
      } catch {
        /* nothing there */
      }
      try {
        // A database left without its flag goes too, and one from before the name Ulune.
        indexedDB.deleteDatabase(SPACE_DB);
        indexedDB.deleteDatabase(LEGACY_SPACE_DB);
      } catch {
        /* none */
      }
    }
    await turnOfflineOff();
    for (const k of storedKeys()) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    try {
      window.sessionStorage.clear();
      window.sessionStorage.setItem(ERASED_NOTE, "1");
    } catch {
      /* ignore */
    }
    window.location.assign("/");
  }

  const allRows: { title: MessageKey; body: string; id: string }[] = [
    { id: "here", title: "dataHereTitle", body: t("dataHere", { n: count }) },
    { id: "space", title: "dataSpaceTitle", body: t(SPACE_LINE[status]) },
    { id: "server", title: "dataServerTitle", body: t("dataServer") },
    { id: "reports", title: "dataReportsTitle", body: t("dataReports") },
    { id: "ai", title: "dataAiTitle", body: t("dataAi") },
    { id: "never", title: "dataNeverTitle", body: t("dataNever") },
  ];
  // Nothing goes to an AI while AI readings are off (lib/features.ts).
  const rows = allRows.filter((row) => AI_ENABLED || row.id !== "ai");

  return (
    <section className="ulune-panel ob-settings-card" id="data" data-testid="settings-data">
      <h2 className="ob-settings-h">{t("dataTitle")}</h2>
      <p className="ob-data-body">
        {t("dataLead")}{" "}
        <Link to="/privacy" className="ob-keep-link" data-testid="data-privacy">
          {t("dataPrivacy")}
        </Link>
      </p>
      <dl className="ob-data-list">
        {rows.map((row) => (
          <div key={row.id} className="ob-data-row" data-testid={`data-${row.id}`}>
            <dt>{t(row.title)}</dt>
            <dd>{row.body}</dd>
          </div>
        ))}
      </dl>
      <div className="ob-data-actions">
        <button type="button" className="ob-btn ob-btn--ghost" data-testid="data-export" onClick={() => void exportAll()}>
          <Download className="size-4" strokeWidth={1.75} aria-hidden />
          {t("dataExport")}
        </button>
        {confirm ? null : (
          <button type="button" className="ob-btn ob-btn--ghost" data-testid="data-wipe" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
            {t("dataWipe")}
          </button>
        )}
      </div>
      <p className="ob-space-note">{t("dataExportHint")}</p>
      {confirm ? (
        <div className="ob-data-confirm" role="group" aria-label={t("dataWipe")} data-testid="data-wipe-ask">
          <p className="ob-data-body">{t("dataWipeConfirm")}</p>
          <div className="ob-data-actions">
            <button
              type="button"
              className="ob-btn ob-btn--danger"
              data-testid="data-wipe-confirm"
              disabled={erasing}
              onClick={() => void wipe()}
            >
              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
              {t("dataWipeGo")}
            </button>
            <button type="button" className="ob-btn ob-btn--ghost" disabled={erasing} onClick={() => setConfirm(false)}>
              {t("spaceCancel")}
            </button>
          </div>
        </div>
      ) : null}
      <label className="ob-check" htmlFor="data-reports">
        <input
          id="data-reports"
          type="checkbox"
          data-testid="data-reports"
          checked={reports}
          onChange={(e) => {
            const on = e.target.checked;
            setReports(on);
            setReportsOn(on);
            setCount(settingKeys().length);
            toast(on ? t("reportsOn") : t("reportsOff"));
          }}
        />
        <span>
          {t("dataReportsSwitch")}
          <span className="ob-check-hint">{t("dataReportsSwitchHint")}</span>
        </span>
      </label>
      {offline === null ? null : (
        <label className="ob-check" htmlFor="data-offline">
          <input
            id="data-offline"
            type="checkbox"
            data-testid="data-offline"
            checked={offline}
            onChange={(e) => {
              const on = e.target.checked;
              setOffline(on);
              void (on ? turnOfflineOn() : turnOfflineOff()).then(() => toast(on ? t("offlineOn") : t("offlineOff")));
            }}
          />
          <span>
            {t("dataOffline")}
            <span className="ob-check-hint">{t("dataOfflineHint")}</span>
          </span>
        </label>
      )}
    </section>
  );
}
