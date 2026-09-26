/*
 * What versions before the private space left in this browser, in the clear:
 * the library and its active chart, the partners of synastry and composite,
 * the first view, and the charts a signed-in account kept on this device. It
 * is read (lib/chart/library.ts, readLegacyLibrary), never written; the reader
 * decides once to lock it into a private space or to erase it.
 */
export const LEGACY_LIBRARY = "orbis.charts.v1";
export const LEGACY_ACTIVE = "orbis.charts.active";
export const LEGACY_ACCOUNT_PREFIX = "orbis.account.charts.";
export const LEGACY_SYNASTRY = "orbis.synastry.partner";
export const LEGACY_COMPOSITE = "orbis.composite.partner";
export const LEGACY_FIRST_VIEW = "orbis.firstview.v1";

const EXACT = [LEGACY_LIBRARY, LEGACY_ACTIVE, LEGACY_FIRST_VIEW, LEGACY_SYNASTRY, LEGACY_COMPOSITE];

/*
 * Ulune was built under the working name Orbis, and the prototype kept its
 * display settings under that name. They move to Ulune's own names once, in
 * an inline script before anything reads them (RENAME_BOOT); the charts above
 * keep their old names, as the prototype wrote them.
 */
export const LEGACY_PREFIX = "orbis.";
export const PREFIX = "ulune.";
/** A private space from before the rename (tests only: none was ever in use); deleted on sight. */
export const LEGACY_SPACE_DB = "orbis-space";
/** The offline copy's caches from before the rename; deleted with the worker's. */
export const LEGACY_CACHE_PREFIX = "orbis-";

/**
 * Inline, first on every page: each old display setting moves to its new
 * name (unless the new one exists already), and the old one goes. The
 * prototype's charts are left for "Charts from before". Fails open.
 */
export const RENAME_BOOT = `(function(){try{var s=localStorage,o=${JSON.stringify(LEGACY_PREFIX)},n=${JSON.stringify(PREFIX)},keep=${JSON.stringify(EXACT)},a=${JSON.stringify(LEGACY_ACCOUNT_PREFIX)},m=[],i,k,t;for(i=0;i<s.length;i++){k=s.key(i);if(k&&k.indexOf(o)===0&&keep.indexOf(k)<0&&k.indexOf(a)!==0)m.push(k)}for(i=0;i<m.length;i++){k=m[i];t=n+k.slice(o.length);if(s.getItem(t)===null)s.setItem(t,s.getItem(k));s.removeItem(k)}}catch(e){}})();`;

/** Delete a private space's database from before the rename, if one is here. */
export function dropLegacySpace(): void {
  try {
    const dbs = (indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }).databases;
    if (!dbs) return;
    void dbs
      .call(indexedDB)
      .then((list) => {
        if (list.some((db) => db.name === LEGACY_SPACE_DB)) indexedDB.deleteDatabase(LEGACY_SPACE_DB);
      })
      .catch(() => {});
  } catch {
    /* no IndexedDB here */
  }
}

/**
 * What the prototype's sign-in (removed in v1.0) left in the browser: a
 * session token and a copy of the account (name, email, picture). Nothing
 * reads them any more; they are removed on sight.
 */
export const OLD_SIGN_IN_PREFIX = "grok-auth.";

/** Set just before "Erase everything" reloads the page, so the page can say it is done (sessionStorage). */
export const ERASED_NOTE = "ulune.erased";

export function eraseOldSignIn(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(OLD_SIGN_IN_PREFIX)) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    /* storage off: nothing there */
  }
}

export function legacyKeysHere(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && (EXACT.includes(k) || k.startsWith(LEGACY_ACCOUNT_PREFIX))) out.push(k);
    }
  } catch {
    return [];
  }
  return out;
}

export function hasLegacyData(): boolean {
  return legacyKeysHere().length > 0;
}

/** How many charts are kept from before (the library and an account's copies, duplicates counted once by id). */
export function legacyChartCount(): number {
  const ids = new Set<string>();
  for (const k of legacyKeysHere()) {
    if (k !== LEGACY_LIBRARY && !k.startsWith(LEGACY_ACCOUNT_PREFIX)) continue;
    try {
      const rows = JSON.parse(window.localStorage.getItem(k) ?? "[]") as { id?: unknown }[];
      if (Array.isArray(rows)) for (const r of rows) if (r && typeof r.id === "string") ids.add(r.id);
    } catch {
      /* unreadable: not counted */
    }
  }
  return ids.size;
}

/** Remove everything from before: once it is locked into a private space, or when the reader erases it. */
export function eraseLegacyData(): void {
  for (const k of legacyKeysHere()) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}
