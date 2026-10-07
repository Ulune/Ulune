import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/encyclopedia/HomePage";
import { importWithRetry } from "@/lib/lazy-retry";
import { pageHead } from "@/lib/page-head";

/* The encyclopedia's home in French (/encyclopedia: the English one; see encyclopedia.index.tsx). */
export const Route = createFileRoute("/encyclopedie/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" && search.q.trim() ? { q: search.q.slice(0, 80) } : {},
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => importWithRetry(() => import("@/encyclopedia/load")).then((m) => m.homeData("fr", deps.q)),
  head: ({ loaderData }) => loaderData?.head ?? pageHead({ path: "/encyclopedie", title: "Encyclopédie · Ulune" }),
  component: Page,
});

function Page() {
  return <HomePage data={Route.useLoaderData()} />;
}
