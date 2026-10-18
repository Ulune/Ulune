import { importWithRetry } from "@/lib/lazy-retry";

/* Show mode's code (share and compare plan, idea B2): fetched when it is first used (host.tsx), or ahead when its button is pointed at or focused (show-button.tsx). */
export const loadShow = () => import("@/studio/show/show-mode");

export const showAhead = (): void => void importWithRetry(loadShow).catch(() => {});
