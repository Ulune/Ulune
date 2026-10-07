import { createFileRoute } from "@tanstack/react-router";
import { calendarHead } from "@/studio/calendar-head";
import { studioRoute } from "@/studio/studio-route";

// The Calendar in French: a page of its own for search engines, its English twin at /calendar.
export const Route = createFileRoute("/_studio/calendrier")({
  ...studioRoute({ head: () => calendarHead("fr") }),
});
