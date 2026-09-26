import { importWithRetry } from "@/lib/lazy-retry";

/** The private space's engine (lib/space/runtime.ts): its own download, fetched when a space exists or is asked for. */
export function loadSpaceRuntime() {
  return importWithRetry(() => import("./runtime"));
}
