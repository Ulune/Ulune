import { useEffect, useMemo, useState } from "react";
import { browserZone } from "@/lib/chart/client-zone";
import { deviceZone, loadCalendarPrefs, PREFS_EVENT, zoneCity, zoneOffset, type CalendarZone } from "@/lib/chart/calendar-prefs";
import { CALENDAR_UI, fill } from "@/lib/i18n/calendar-words";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { useStudioStore } from "@/studio/store";

/**
 * The clock the Time pages show their moments in (review 3 Oct, T4): the
 * Calendar's choice (this device, the birthplace, or universal time), so a
 * Calendar row and the Transits it opens agree. Its words: "Paris time ·
 * UTC+2" or "Universal time (UT)".
 */
export function useClockZone(atMs: number): { tz: string; choice: CalendarZone; label: string } {
  const { locale } = useI18n();
  const chartZone = useStudioStore((s) => s.chart?.meta.timezone);
  const [choice, setChoice] = useState<CalendarZone>("device");
  useEffect(() => {
    const read = () => setChoice(loadCalendarPrefs().zone);
    read();
    window.addEventListener(PREFS_EVENT, read);
    return () => window.removeEventListener(PREFS_EVENT, read);
  }, []);
  const tz = useMemo(() => (choice === "utc" ? "UTC" : choice === "birth" ? browserZone(chartZone) : browserZone(deviceZone())), [choice, chartZone]);
  const ut = tz === "UTC" || tz === "Etc/UTC";
  const label = ut ? pick(CALENDAR_UI.zone.ut, locale) : `${fill(CALENDAR_UI.zone.cityTime, locale, { city: zoneCity(tz) })} · ${zoneOffset(tz, atMs)}`;
  return { tz, choice, label };
}
