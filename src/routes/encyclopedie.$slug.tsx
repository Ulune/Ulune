import { createFileRoute } from "@tanstack/react-router";
import { EntryPage } from "@/encyclopedia/EntryPage";
import { TraditionPage } from "@/encyclopedia/TraditionPage";
import { importWithRetry } from "@/lib/lazy-retry";
import { pageHead } from "@/lib/page-head";

/* A French entry's page (/encyclopedie/saturne), or a tradition's home (/encyclopedie/astrologie); see encyclopedia.$slug.tsx. */
export const Route = createFileRoute("/encyclopedie/$slug")({
  loader: ({ params }) => importWithRetry(() => import("@/encyclopedia/load")).then((m) => m.slugData("fr", params.slug)),
  head: ({ loaderData }) => loaderData?.head ?? pageHead({ path: "", title: "Page introuvable · Ulune", index: false }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  return data.kind === "entry" ? <EntryPage page={data.page} /> : <TraditionPage home={data.home} />;
}
