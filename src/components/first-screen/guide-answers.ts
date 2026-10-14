/*
 * The guide's answers (GuideAnswer.tsx, languages plan, part 29): their own
 * download in the browser, out of the first load every studio page pays for.
 * On the server the pages that draw the guide (every studio page, under its
 * first screen, and /guide) load them in their loader, and the guide draws
 * them at once (Guide.tsx): React's first pass holds every answer, so the
 * page does, without JavaScript too, even when the server has just started.
 * (Through React.lazy alone, a server just started streamed them after the
 * page, hidden until a script showed them, and that is the page the edge
 * would keep.) Tiny on purpose: the routes import it.
 */
import type { GuideAnswer } from "./GuideAnswer";

let loaded: typeof GuideAnswer | null = null;

export const loadGuideAnswer = () =>
  import("./GuideAnswer").then((m) => {
    loaded = m.GuideAnswer;
    return m;
  });

/** A route's loader: on the server, the answers loaded before the page is drawn; nothing in the browser. */
export async function guideAnswersReady(): Promise<void> {
  if (import.meta.env.SSR) await loadGuideAnswer().catch(() => {});
}

/** On the server, the answer component once a loader has loaded it; never in the browser, where React.lazy takes it. */
export const serverGuideAnswer = (): typeof GuideAnswer | null => (import.meta.env.SSR ? loaded : null);
