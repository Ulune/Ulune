import { Suspense } from "react";
import { useShareUi } from "@/components/share/share-state";
import { lazyNamed } from "@/lib/lazy-component";
import { loadShow } from "./show-load";
import { useShowMode } from "./show-state";

/*
 * Where Show mode (idea B2) and asking for someone's chart (idea B4) are
 * drawn: mounted once with the studio's shell, their code fetched only when
 * one of them is wanted (Show mode on; the request sheet open, or a request
 * for the reader's chart pending), so the first page carries only this.
 */
const ShowMode = lazyNamed(loadShow, "ShowMode");
const AskUi = lazyNamed(() => import("@/components/share/ask-ui"), "AskUi");

export function ExtrasHost() {
  const show = useShowMode((s) => s.on);
  const ask = useShareUi((s) => s.ask || s.request !== null);
  return (
    <>
      {show ? (
        <Suspense fallback={null}>
          <ShowMode />
        </Suspense>
      ) : null}
      {ask ? (
        <Suspense fallback={null}>
          <AskUi />
        </Suspense>
      ) : null}
    </>
  );
}
