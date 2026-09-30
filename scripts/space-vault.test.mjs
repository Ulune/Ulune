import assert from "node:assert/strict";
import { test } from "node:test";
import { argon2idAsync } from "@noble/hashes/argon2.js";
import {
  ARGON,
  formatRecoveryCode,
  fromB64u,
  newRecoveryCode,
  parseRecoveryCode,
} from "../src/lib/space/crypto.ts";
import { memoryStore } from "../src/lib/space/store.ts";
import { Vault, WrongSecret, adoptBackup, checkBackupWay, openBackup, parseBackup } from "../src/lib/space/vault.ts";

const PASS = "correct horse battery staple";
const CHART = { id: "c1", input: { name: "Sample B", date: "03/11/1987" }, savedAt: 1 };

test("Argon2id with the space's settings matches the reference implementation", async () => {
  // Reference: argon2-cffi (the C implementation), same inputs.
  const out = await argon2idAsync(new TextEncoder().encode(PASS), new Uint8Array(16).fill(7), { ...ARGON, dkLen: 32 });
  assert.equal(Buffer.from(out).toString("hex"), "799f12b9e17710824482d829835acb69f5a9355bf774c4f07342823b11b90928");
});

test("round trip: create, write, lock, unlock with the passphrase, read", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  await vault.put("chart/c1", CHART);
  vault.lock();
  await assert.rejects(() => vault.get("chart/c1"), { name: "SpaceLocked" });
  const again = await Vault.unlock(store, { passphrase: `  ${PASS} ` });
  assert.deepEqual(await again.get("chart/c1"), CHART);
  // Nothing readable is stored: no record, and not the description, holds the chart.
  const raw = JSON.stringify([...store.dump().items.values()].map((s) => [Buffer.from(s.ct).toString("latin1")]));
  assert.ok(!raw.includes("Sample B") && !JSON.stringify(store.dump().meta).includes("Sample B"));
});

test("a wrong passphrase, or one too short to create with, is refused", async () => {
  const store = memoryStore();
  await Vault.create(store, { passphrase: PASS });
  await assert.rejects(() => Vault.create(store, { passphrase: PASS }), /space-exists/);
  await assert.rejects(() => Vault.unlock(store, { passphrase: "correct horse battery stapler" }), WrongSecret);
  await assert.rejects(() => Vault.create(memoryStore(), { passphrase: "short one" }), /passphrase-too-short/);
});

test("the recovery code opens the space, typed loosely; a wrong one does not", async () => {
  const store = memoryStore();
  const { recoveryCode } = await Vault.create(store, { passphrase: PASS });
  assert.match(recoveryCode, /^[0-9A-HJKMNP-TV-Z]{25}$/);
  const typed = formatRecoveryCode(recoveryCode).toLowerCase().replace(/0/g, "o").replace(/1/g, "l");
  const vault = await Vault.unlock(store, { recovery: ` ${typed} ` });
  assert.ok(vault.isOpen);
  const wrong = recoveryCode.slice(0, 24) + (recoveryCode[24] === "A" ? "B" : "A");
  await assert.rejects(() => Vault.unlock(store, { recovery: wrong }), WrongSecret);
  await assert.rejects(() => Vault.unlock(store, { recovery: "not a code" }), WrongSecret);
  assert.equal(parseRecoveryCode("ABCD"), null);
  assert.equal(parseRecoveryCode("U".repeat(25)), null);
});

test("a tampered record is refused, and so is one moved under another name", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  await vault.write([
    ["chart/a", { name: "A" }],
    ["chart/b", { name: "B" }],
  ]);
  const items = store.dump().items;
  const a = items.get("chart/a");
  a.ct[3] ^= 1;
  await assert.rejects(() => vault.get("chart/a"));
  items.set("chart/b2", items.get("chart/b"));
  await assert.rejects(() => vault.get("chart/b2"));
  const { rows, unreadable } = await vault.list("chart/");
  assert.deepEqual(rows.map(([k]) => k), ["chart/b"]);
  assert.deepEqual(unreadable.sort(), ["chart/a", "chart/b2"]);
});

test("a new passphrase rewraps the key: the new one opens, the old one no longer does", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  await vault.put("chart/c1", CHART);
  const before = [...store.dump().items.get("chart/c1").ct];
  await assert.rejects(() => vault.setPassphrase({ passphrase: "not the passphrase" }, "another long passphrase"), WrongSecret);
  await vault.setPassphrase({ passphrase: PASS }, "another long passphrase");
  assert.deepEqual([...store.dump().items.get("chart/c1").ct], before, "records are not re-encrypted");
  await assert.rejects(() => Vault.unlock(store, { passphrase: PASS }), WrongSecret);
  const again = await Vault.unlock(store, { passphrase: "another long passphrase" });
  assert.deepEqual(await again.get("chart/c1"), CHART);
});

test("passkeys: the PRF secret opens the space; another passkey's secret does not", async () => {
  const store = memoryStore();
  const prf = crypto.getRandomValues(new Uint8Array(32));
  const { vault, recoveryCode } = await Vault.create(store, { passkey: { credId: "cred-1", prf, prfSalt: "salt" } });
  await vault.put("chart/c1", CHART);
  const opened = await Vault.unlock(store, { passkey: { credId: "cred-1", prf } });
  assert.deepEqual(await opened.get("chart/c1"), CHART);
  const other = crypto.getRandomValues(new Uint8Array(32));
  await assert.rejects(() => Vault.unlock(store, { passkey: { credId: "cred-1", prf: other } }), WrongSecret);
  await assert.rejects(() => Vault.unlock(store, { passkey: { credId: "cred-2", prf } }), WrongSecret);
  // A second passkey, then the first removed: only the second opens.
  const prf2 = crypto.getRandomValues(new Uint8Array(32));
  await opened.addPasskey({ recovery: recoveryCode }, { credId: "cred-2", prf: prf2, prfSalt: "salt2" });
  await opened.removePasskey({ passkey: { credId: "cred-2", prf: prf2 } }, "cred-1");
  await assert.rejects(() => Vault.unlock(store, { passkey: { credId: "cred-1", prf } }), WrongSecret);
  assert.ok((await Vault.unlock(store, { passkey: { credId: "cred-2", prf: prf2 } })).isOpen);
  // The last way in besides the recovery code cannot go.
  await assert.rejects(() => opened.removePasskey({ recovery: recoveryCode }, "cred-2"), /no-way-in/);
});

test("changes to the ways in: confirm first, a new recovery code, the passphrase removed while a passkey stays", async () => {
  const store = memoryStore();
  const { vault, recoveryCode } = await Vault.create(store, { passphrase: PASS });
  const described = JSON.stringify(store.dump().meta);
  // Confirming checks a way in and changes nothing.
  await vault.confirm({ passphrase: PASS });
  await vault.confirm({ recovery: recoveryCode });
  await assert.rejects(() => vault.confirm({ passphrase: "not the passphrase at all" }), WrongSecret);
  assert.equal(JSON.stringify(store.dump().meta), described);
  // A new recovery code: the old one stops opening the space, the new one opens it.
  const fresh = await vault.newRecoveryCode({ passphrase: PASS });
  assert.notEqual(fresh, recoveryCode);
  await assert.rejects(() => Vault.unlock(store, { recovery: recoveryCode }), WrongSecret);
  assert.ok((await Vault.unlock(store, { recovery: fresh })).isOpen);
  // The passphrase can go only while a passkey remains.
  await assert.rejects(() => vault.removePassphrase({ passphrase: PASS }), /no-way-in/);
  const prf = crypto.getRandomValues(new Uint8Array(32));
  await vault.addPasskey({ passphrase: PASS }, { credId: "cred-1", prf, prfSalt: "salt" });
  await vault.removePassphrase({ passkey: { credId: "cred-1", prf } });
  await assert.rejects(() => Vault.unlock(store, { passphrase: PASS }), WrongSecret);
  assert.ok((await Vault.unlock(store, { passkey: { credId: "cred-1", prf } })).isOpen);
  assert.deepEqual(
    store.dump().meta.wraps.map((w) => w.kind).sort(),
    ["passkey", "recovery"],
  );
  // A locked vault confirms nothing.
  vault.lock();
  await assert.rejects(() => vault.confirm({ recovery: fresh }), { name: "SpaceLocked" });
});

test("the charts' mark changes with any chart sealed again, added or removed, and with nothing else", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  const empty = await vault.mark("chart/");
  assert.equal(empty.count, 0);
  await vault.put("chart/c1", CHART);
  const one = await vault.mark("chart/");
  assert.equal(one.count, 1);
  assert.notEqual(one.mark, empty.mark);
  await vault.put("state/library", { order: ["c1"], activeId: "c1" });
  assert.equal((await vault.mark("chart/")).mark, one.mark, "another record leaves it");
  await vault.put("chart/c1", CHART);
  const resealed = await vault.mark("chart/");
  assert.notEqual(resealed.mark, one.mark, "the same chart sealed again changes it");
  await vault.remove("chart/c1");
  assert.equal((await vault.mark("chart/")).count, 0);
  vault.lock();
  await assert.rejects(() => vault.mark("chart/"), { name: "SpaceLocked" });
});

test("stay unlocked keeps the key on the device; choosing another lock takes it away", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  await vault.put("chart/c1", CHART);
  assert.equal(await Vault.unlockOnDevice(store), null);
  await vault.setLockMode("stay");
  const kept = await Vault.unlockOnDevice(store);
  assert.deepEqual(await kept.get("chart/c1"), CHART);
  assert.equal(store.dump().device.extractable, false);
  await vault.setLockMode("idle");
  assert.equal(await Vault.unlockOnDevice(store), null);
  assert.equal(store.dump().device, null);
});

test("a backup opens elsewhere with the passphrase or the recovery code, and only with them", async () => {
  const store = memoryStore();
  const { vault, recoveryCode } = await Vault.create(store, { passphrase: PASS });
  await vault.put("chart/c1", CHART);
  const text = JSON.stringify(await vault.backup());
  assert.ok(!text.includes("Sample B"));
  const backup = parseBackup(text);
  assert.ok(backup);
  assert.equal(parseBackup("{}"), null);
  assert.equal(parseBackup(JSON.stringify({ ...backup, items: [] })), null);
  const read = await openBackup(backup, { passphrase: PASS });
  assert.deepEqual(read.get("chart/c1"), CHART);
  await assert.rejects(() => openBackup(backup, { passphrase: "a wrong passphrase" }), WrongSecret);
  const elsewhere = memoryStore();
  await adoptBackup(elsewhere, backup);
  const there = await Vault.unlock(elsewhere, { recovery: recoveryCode });
  assert.deepEqual(await there.get("chart/c1"), CHART);
  assert.equal(there.meta.lock, "close");
});

test("a backup is checked before it is used: its way in on the file first, and no wrap asking for too much work", async () => {
  const store = memoryStore();
  const { vault, recoveryCode } = await Vault.create(store, { passphrase: PASS });
  await vault.put("chart/c1", CHART);
  const backup = parseBackup(JSON.stringify(await vault.backup()));
  // The way in is tried on the file itself, before anything is written anywhere.
  await checkBackupWay(backup, { passphrase: PASS });
  await checkBackupWay(backup, { recovery: recoveryCode });
  await assert.rejects(() => checkBackupWay(backup, { passphrase: "a wrong passphrase" }), WrongSecret);
  // A passphrase wrap asking Argon2 for 2 GiB, 100 passes or no lane: the file is refused.
  const withWrap = (change) => {
    const copy = structuredClone(backup);
    const wrap = copy.meta.wraps.find((w) => w.kind === "passphrase");
    Object.assign(wrap, change);
    return JSON.stringify(copy);
  };
  assert.ok(parseBackup(withWrap({})), "Ulune's own settings pass");
  assert.equal(parseBackup(withWrap({ m: 2_097_152 })), null);
  assert.equal(parseBackup(withWrap({ t: 100 })), null);
  assert.equal(parseBackup(withWrap({ p: 0 })), null);
  assert.equal(parseBackup(withWrap({ m: "19456" })), null);
  assert.equal(parseBackup(withWrap({ salt: 7 })), null);
  // A kind this version doesn't know is left alone, as long as one it knows is there.
  const later = structuredClone(backup);
  later.meta.wraps.push({ kind: "from-a-later-version", id: "x", iv: "AA", ct: "AA" });
  assert.ok(parseBackup(JSON.stringify(later)));
  later.meta.wraps = later.meta.wraps.filter((w) => w.kind === "from-a-later-version");
  assert.equal(parseBackup(JSON.stringify(later)), null);
  // The same limit holds for the space on this device: a greedy wrap there is not tried.
  const meta = await store.getMeta();
  meta.wraps.find((w) => w.kind === "passphrase").m = 2_097_152;
  await store.putMeta(meta);
  vault.lock();
  await assert.rejects(() => Vault.unlock(store, { passphrase: PASS }), WrongSecret);
});

test("a wrap altered in the description does not open the space", async () => {
  const store = memoryStore();
  await Vault.create(store, { passphrase: PASS });
  const meta = await store.getMeta();
  const wrap = meta.wraps.find((w) => w.kind === "passphrase");
  const salt = fromB64u(wrap.salt);
  salt[0] ^= 1;
  wrap.salt = Buffer.from(salt).toString("base64url");
  await store.putMeta(meta);
  await assert.rejects(() => Vault.unlock(store, { passphrase: PASS }), WrongSecret);
});

test("recovery codes are 25 symbols, fresh each time", () => {
  const a = newRecoveryCode();
  const b = newRecoveryCode();
  assert.notEqual(a, b);
  assert.equal(formatRecoveryCode(a).split("-").length, 5);
  assert.equal(parseRecoveryCode(formatRecoveryCode(a)), a);
});
