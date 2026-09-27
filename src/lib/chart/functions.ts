import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { normalizeBirth } from "./parse-birth";
import type { BirthInput, PlaceHit, ProgressedSky, TimingCast, TransitSky } from "./types";
import { geocodePlace } from "./geocode";
import {
  birthSchema,
  humanDesignSchema,
  placeQuery,
  progressionSchema,
  timingSchema,
  transitSchema,
} from "./server-input";

/*
 * The server calculates and answers; it keeps nothing and logs nothing about
 * the birth. A cast brings a date, a time and coordinates, never a name or a
 * place's name (the browser finds the place first, through searchPlaces).
 * What each function accepts, and its limits: server-input.ts.
 */

function locOf(value: unknown): AppLocale {
  return value === "fr" ? "fr" : "en";
}

/** The place search's own limit, so a slow geocoder never holds the form. */
const PLACE_TIMEOUT_MS = 6000;

/**
 * Place search, relayed so the geocoder (Open-Meteo) sees Ulune's server
 * rather than the reader's address. Nothing is logged; Open-Meteo's answers
 * stay a day in the server's memory, keyed only by the words typed
 * (geocode.ts, PLACE_CACHE).
 */
export const searchPlaces = createServerFn({ method: "POST" })
  .validator((data: { q: string; locale?: string }) => placeQuery(data))
  .handler(async ({ data }): Promise<PlaceHit[]> => {
    return await geocodePlace(data.q, data.locale, AbortSignal.timeout(PLACE_TIMEOUT_MS));
  });

export const castChart = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof birthSchema>) => birthSchema.parse(input))
  .handler(async ({ data }) => {
    const locale = locOf(data.locale);
    try {
      const parsed = normalizeBirth({
        date: data.date,
        time: data.time,
        placeLabel: "",
        latitude: data.latitude,
        longitude: data.longitude,
        timeUnknown: data.timeUnknown,
      });
      const { calculateNatal } = await import("./calculate.server");
      if (typeof calculateNatal !== "function") {
        throw new Error(translate(locale, "calculatorFailed"));
      }
      const chart = await calculateNatal({
        name: "",
        date: parsed.date,
        time: parsed.timeUnknown ? "12:00" : parsed.time,
        timeUnknown: parsed.timeUnknown,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        placeLabel: "",
        houseSystem: data.houseSystem,
        zone: data.zone,
        tz: data.tz,
        fold: data.fold,
      } as BirthInput);
      if (parsed.timeUnknown) {
        chart.meta.time = "12:00";
      }
      // Only the chart: the client builds its own readings from it, and puts
      // the name and the place's name back on it (they never came here).
      return { chart, timeUnknown: parsed.timeUnknown };
    } catch (err) {
      // No log line: a failed cast's message can hold what was typed.
      const raw = err instanceof Error ? err.message : "";
      const message =
        !raw || /ENOENT|EACCES|\/var\/task|node_modules/i.test(raw) ? translate(locale, "couldNotCast") : raw;
      throw new Error(message);
    }
  });

export const castTransits = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof transitSchema>) => transitSchema.parse(input))
  .handler(async ({ data }): Promise<TransitSky> => {
    const utc = new Date(data.at);
    if (Number.isNaN(utc.getTime())) {
      throw new Error("Could not read this moment.");
    }
    const { calculateTransits } = await import("./calculate.server");
    return calculateTransits({
      utc,
      latitude: data.latitude,
      longitude: data.longitude,
      natalCusps: data.natalCusps,
      natalBodies: data.natalBodies.map((row) => ({
        id: row.id as TransitSky["planets"][number]["id"],
        name: row.name,
        ecliptic: row.ecliptic,
      })),
      houseSystem: data.houseSystem,
    });
  });

export const castTiming = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof timingSchema>) => timingSchema.parse(input))
  .handler(async ({ data }): Promise<TimingCast> => {
    const from = new Date(data.from);
    const to = new Date(data.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error("Could not read this timing window.");
    }
    const { calculateTiming } = await import("./calculate.server");
    return calculateTiming({
      from,
      to,
      latitude: data.latitude,
      longitude: data.longitude,
      natalBodies: data.natalBodies.map((row) => ({
        id: row.id as TransitSky["planets"][number]["id"],
        name: row.name,
        ecliptic: row.ecliptic,
      })),
    });
  });

export const castProgressions = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof progressionSchema>) => progressionSchema.parse(input))
  .handler(async ({ data }): Promise<ProgressedSky> => {
    const natalUtc = new Date(data.natalUtc);
    const targetUtc = new Date(data.targetUtc);
    if (Number.isNaN(natalUtc.getTime()) || Number.isNaN(targetUtc.getTime())) {
      throw new Error("Could not read this moment.");
    }
    const { calculateProgressions } = await import("./calculate.server");
    return calculateProgressions({
      natalUtc,
      targetUtc,
      latitude: data.latitude,
      longitude: data.longitude,
      natalCusps: data.natalCusps,
      natalBodies: data.natalBodies.map((row) => ({
        id: row.id as TransitSky["planets"][number]["id"],
        name: row.name,
        ecliptic: row.ecliptic,
      })),
      houseSystem: data.houseSystem,
    });
  });

export const castHumanDesign = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof humanDesignSchema>) => humanDesignSchema.parse(input))
  .handler(async ({ data }) => {
    const natalUtc = new Date(data.natalUtc);
    if (Number.isNaN(natalUtc.getTime())) {
      throw new Error("Could not read this birth moment.");
    }
    const { calculateHumanDesign } = await import("./calculate.server");
    return calculateHumanDesign({ natalUtc });
  });
