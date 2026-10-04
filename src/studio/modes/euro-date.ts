import { civilFromUtc, utcFromCivil } from "@/lib/chart/timing-window";
import {
  formatEuropeanDate,
  isCompleteBirthDate,
  isCompleteBirthTime,
} from "@/lib/chart/parse-birth";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// With a zone (the Calendar's clock, review 3 Oct T4) the date and time are read and
// written in it; without one, in this device's.
export function euroFromMs(ms: number, tz?: string): string {
  if (tz) {
    const c = civilFromUtc(new Date(ms), tz);
    return `${pad(c.day)}/${pad(c.month)}/${c.year}`;
  }
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function timeFromMs(ms: number, tz?: string): string {
  if (tz) {
    const c = civilFromUtc(new Date(ms), tz);
    return `${pad(c.hour)}:${pad(c.minute)}`;
  }
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function msFromEuro(date: string, time: string, tz?: string): number | null {
  const euro = formatEuropeanDate(date);
  if (!isCompleteBirthDate(euro) || !isCompleteBirthTime(time)) return null;
  const [dd, mm, yyyy] = euro.split("/");
  if (tz) {
    const t = utcFromCivil({ year: Number(yyyy), month: Number(mm), day: Number(dd), hour: Number(time.slice(0, 2)), minute: Number(time.slice(3, 5)) }, tz).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const next = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(time.slice(0, 2)), Number(time.slice(3, 5)));
  return Number.isNaN(next.getTime()) ? null : next.getTime();
}

export function isoFromEuro(date: string): string | null {
  const euro = formatEuropeanDate(date);
  if (!isCompleteBirthDate(euro)) return null;
  const [dd, mm, yyyy] = euro.split("/");
  return `${yyyy}-${mm}-${dd}`;
}
