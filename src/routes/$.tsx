import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppNotFound } from "@/lib/not-found";
import { pageHead } from "@/lib/page-head";

// Any other path: the "not found" page, sent with a real 404 status (the
// router's not-found handling sets it; a plain matched route would send 200).
export const Route = createFileRoute("/$")({
  head: () => pageHead({ path: "", title: "Page not found · Ulune", index: false }),
  loader: () => {
    throw notFound();
  },
  component: AppNotFound,
});
