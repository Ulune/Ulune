import { createFileRoute } from "@tanstack/react-router";
import { calendarHead } from "@/studio/calendar-head";
import { studioRoute } from "@/studio/studio-route";

// The Calendar in English: a page of its own for search engines, its French twin at /calendrier.
export const Route = createFileRoute("/_studio/calendar")({
  ...studioRoute({ head: () => calendarHead("en") }),
});
