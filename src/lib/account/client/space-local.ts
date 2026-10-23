import { b64u } from "../encoding";
import { SYNC_RECORD } from "@/lib/space/records";
import type { SpaceStore, Wrap } from "@/lib/space/store";
import type { Vault } from "@/lib/space/vault";
import { contentHash, type Local, type SyncState } from "./engine";
import { SPACE_WAYS, syncs } from "./merge";

/*
 * The private space as the sync engine sees it (share and compare plan, feature 4): its records
 * that sync, each with a fingerprint (the nonce it was last sealed with: every write seals afresh,
 * so a write changes it), read and written through the open vault, and the space's description as
 * the record "space/ways" (its id, its passkeys' user, its ways in, wrapped). The engine's own
 * state is the sealed record sync/account, which never syncs.
 *
 * The engine's own writes are not taken for the reader's (`quiet` while they happen), so they are
 * not sent back.
 */

/** The space's description as the account carries it. */
export type SpaceWays = { id: string; passkeyUser: string; wraps: Wrap[] };

export function waysOf(vault: Vault): SpaceWays {
  const m = vault.meta;
  return { id: m.id, passkeyUser: m.passkeyUser, wraps: m.wraps };
}

export type SpaceLocal = Local & {
  /** Names being written by the engine itself right now. */
  readonly quiet: ReadonlySet<string>;
};

export function spaceLocal(vault: Vault, store: SpaceStore, onWays: () => void): SpaceLocal {
  const quiet = new Set<string>();
  const waysPrint = async () => `w.${await contentHash(waysOf(vault))}`;
  return {
    quiet,
    async snapshot() {
      const out = new Map<string, string>();
      for (const [name, sealed] of await store.listItems("")) if (syncs(name)) out.set(name, b64u(sealed.iv));
      out.set(SPACE_WAYS, await waysPrint());
      return out;
    },
    async read(name) {
      if (name === SPACE_WAYS) return waysOf(vault);
      try {
        return await vault.get(name);
      } catch (err) {
        // A record that does not open here is not sent; a locked space stops the round.
        if (err instanceof Error && err.name === "SpaceLocked") throw err;
        return null;
      }
    },
    async write(changes) {
      const puts: [string, unknown][] = [];
      const deletes: string[] = [];
      let ways: SpaceWays | null = null;
      for (const [name, value] of changes) {
        if (name === SPACE_WAYS) ways = value as SpaceWays | null;
        else if (value === null) deletes.push(name);
        else puts.push([name, value]);
      }
      const out = new Map<string, string | null>();
      const names = [...puts.map(([n]) => n), ...deletes, ...(ways ? [SPACE_WAYS] : [])];
      for (const n of names) quiet.add(n);
      try {
        if (puts.length || deletes.length) await vault.write(puts, deletes);
        if (ways) {
          await vault.setWraps({ passkeyUser: ways.passkeyUser, wraps: ways.wraps });
          onWays();
          out.set(SPACE_WAYS, await waysPrint());
        }
      } finally {
        for (const n of names) quiet.delete(n);
      }
      for (const [name] of puts) {
        const item = await store.getItem(name);
        out.set(name, item ? b64u(item.iv) : null);
      }
      for (const name of deletes) out.set(name, null);
      return out;
    },
    async loadState() {
      return await vault.get<SyncState>(SYNC_RECORD).catch(() => null);
    },
    async saveState(state) {
      quiet.add(SYNC_RECORD);
      try {
        await vault.put(SYNC_RECORD, state);
      } finally {
        quiet.delete(SYNC_RECORD);
      }
    },
  };
}
