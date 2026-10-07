import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/encyclopedia/HomePage";
import { importWithRetry } from "@/lib/lazy-retry";
import { pageHead } from "@/lib/page-head";

/*
 * The encyclopedia's home in English (/encyclopedie: the French one). Its
 * data, its head and its page load when it opens, never with the studio.
 * `?q=` is the search sent without JavaScript: the server answers it.
 */
export const Route = createFileRoute("/encyclopedia/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" && search.q.trim() ? { q: search.q.slice(0, 80) } : {},
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => importWithRetry(() => import("@/encyclopedia/load")).then((m) => m.homeData("en", deps.q)),
  head: ({ loaderData }) => loaderData?.head ?? pageHead({ path: "/encyclopedia", title: "Encyclopedia · Ulune" }),
  component: Page,
});

function Page() {
  return <HomePage data={Route.useLoaderData()} />;
}
