import { createFileRoute } from "@tanstack/react-router";
import { EntryPage } from "@/encyclopedia/EntryPage";
import { TraditionPage } from "@/encyclopedia/TraditionPage";
import { importWithRetry } from "@/lib/lazy-retry";
import { pageHead } from "@/lib/page-head";

/*
 * An English entry's page (/encyclopedia/saturn), or a tradition's home
 * (/encyclopedia/astrology); the French twins are under /encyclopedie. An
 * entry with no page yet, or no entry at all, is the app's "not found" page,
 * sent with a 404 (src/encyclopedia/load.ts).
 */
export const Route = createFileRoute("/encyclopedia/$slug")({
  loader: ({ params }) => importWithRetry(() => import("@/encyclopedia/load")).then((m) => m.slugData("en", params.slug)),
  head: ({ loaderData }) => loaderData?.head ?? pageHead({ path: "", title: "Page not found · Ulune", index: false }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  return data.kind === "entry" ? <EntryPage page={data.page} /> : <TraditionPage home={data.home} />;
}
