import { createFileRoute } from "@tanstack/react-router";
import { studioRoute } from "@/studio/studio-route";

export const Route = createFileRoute("/_studio/human-design/cycles")(studioRoute());
