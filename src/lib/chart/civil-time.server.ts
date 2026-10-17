/**
 * Civil (wall-clock) time ↔ UTC on Ulune's server: the same module the
 * reader's device runs (src/lib/engine/civil-time.ts, on-device plan, step 3),
 * re-exported here so the server's code and its tests keep their imports.
 */
export * from "../engine/civil-time";
