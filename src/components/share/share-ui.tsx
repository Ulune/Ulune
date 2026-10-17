import { ArrivalNoteCard } from "./arrival-note";
import { ShareSheet } from "./share-sheet";
import { useShareUi } from "./share-state";

/* The share sheet and the arrival note (share plan, feature 1): one download, fetched when either shows (ShareHost in studio/stage/ExportMenu.tsx). */
export function ShareUi() {
  const sheet = useShareUi((s) => s.sheet);
  const note = useShareUi((s) => s.note);
  return (
    <>
      {sheet ? <ShareSheet /> : null}
      {note ? <ArrivalNoteCard note={note} /> : null}
    </>
  );
}
