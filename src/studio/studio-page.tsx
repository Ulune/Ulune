/*
 * The studio's page: the component of the studio's layout route
 * (src/routes/_studio.tsx), the same instance for every studio path, which the
 * router's code splitting keeps out of the first script.
 */
import { Shell } from "@/studio/shell/Shell";
import { useLibraryBoot } from "@/studio/library-boot";

export function StudioPage() {
  useLibraryBoot();
  return <Shell />;
}
