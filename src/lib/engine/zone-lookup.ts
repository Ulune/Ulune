/**
 * The time zone of typed coordinates, for a chart calculated on the device
 * (on-device plan, step 3). A place picked from the search comes with its
 * zone; coordinates typed by hand need the full zone map (31 MB), which stays
 * on Ulune's server, so the device asks it for the zone of those coordinates
 * only: no date, no time, no name, nothing kept or logged. The answer is what
 * a cast on the server would use (geo-tz's map, the same lookup), with where
 * it came from ("coordinates", or "approximate" where the map has nothing).
 * POST, so the coordinates never sit in an address or a log of addresses.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { latitudeSchema, longitudeSchema } from "../chart/server-input";
import type { ZoneLookup } from "./birth-time";

const zoneQuery = z.object({ latitude: latitudeSchema, longitude: longitudeSchema });

export const lookupZone = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof zoneQuery>) => zoneQuery.parse(input))
  .handler(async ({ data }): Promise<ZoneLookup> => {
    const { zoneAt } = await import("../chart/birth-time.server");
    return zoneAt(data.latitude, data.longitude);
  });
