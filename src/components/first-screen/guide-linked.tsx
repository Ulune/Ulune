import { Suspense } from "react";
import { lazyNamed } from "@/lib/lazy-component";

// The guide's words link to their entries (encyclopedia plan, part 16): its own download; the plain text until then.
const LinkedText = lazyNamed(() => import("@/encyclopedia/LinkedText"), "LinkedText");

/**
 * A paragraph of the guide (Guide.tsx) or one of its answers (GuideAnswer.tsx)
 * with its encyclopedia words linked: the plain text, as the server sends it,
 * until the links arrive.
 */
export function Linked({ text, tradition = "all" }: { text: string; tradition?: string }) {
  return (
    <Suspense fallback={text}>
      <LinkedText text={text} tradition={tradition} />
    </Suspense>
  );
}
