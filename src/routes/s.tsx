import { createFileRoute } from "@tanstack/react-router";
import { ShareLanding } from "@/components/share/share-landing";
import { pageHead } from "@/lib/page-head";

/*
 * Where a share link lands (share plan, feature 1): /s#<the chart, sealed>.
 * The server only ever sees "/s": the part after "#" never leaves the
 * browser. The page is the same for everyone and stays out of search.
 */
export const Route = createFileRoute("/s")({
  head: () => pageHead({ path: "/s", title: "A chart shared with you · Ulune", index: false }),
  component: ShareLanding,
});
