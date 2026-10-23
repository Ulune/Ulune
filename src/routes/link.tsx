import { createFileRoute } from "@tanstack/react-router";
import { DeviceLinkLanding } from "@/components/space/link-landing";
import { pageHead } from "@/lib/page-head";

/*
 * Where a device link's QR code lands (share and compare plan, feature 4): /link#<the link and the
 * opening device's key>. The server only ever sees "/link": the part after "#" never leaves the
 * browser. The page is the same for everyone and stays out of search.
 */
export const Route = createFileRoute("/link")({
  head: () => pageHead({ path: "/link", title: "Add a device · Ulune", index: false }),
  component: DeviceLinkLanding,
});
