/*
 * The modes: names and groups (meta.ts, always loaded), the loader that
 * fetches each mode when it is first needed (registry.ts), and the runtime
 * store their data travels through (data.tsx).
 */
export { GROUP_LABEL, MODE_META, PAGE_LABEL, type ModeMeta } from "@/studio/modes/meta";
export { loadMode, preloadMode, prefetchModesAtIdle, useLoadedModes, useModeDef } from "@/studio/modes/registry";
export { ModeRuntimes, useModeData, useModeReading } from "@/studio/modes/data";
