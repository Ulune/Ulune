import { AskSheet } from "./ask-sheet";
import { ReplyCard } from "./reply-card";
import { useShareUi } from "./share-state";

/* Asking for someone's chart (idea B4): the asker's sheet and the recipient's "Send it back" card, one download, fetched when either is wanted (ExtrasHost in studio/show/host.tsx). */
export function AskUi() {
  const ask = useShareUi((s) => s.ask);
  return (
    <>
      {ask ? <AskSheet /> : null}
      <ReplyCard />
    </>
  );
}
