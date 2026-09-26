import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppNotFound } from "@/lib/not-found";

// Any other path: the "not found" page, sent with a real 404 status (the
// router's not-found handling sets it; a plain matched route would send 200).
export const Route = createFileRoute("/$")({
  loader: () => {
    throw notFound();
  },
  component: AppNotFound,
});
