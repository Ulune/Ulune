import {
  formatEuropeanDate,
  isCompleteBirthDate,
  isCompleteBirthTime,
} from "@/lib/chart/parse-birth";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function euroFromMs(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function timeFromMs(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function msFromEuro(date: string, time: string): number | null {
  const euro = formatEuropeanDate(date);
  if (!isCompleteBirthDate(euro) || !isCompleteBirthTime(time)) return null;
  const [dd, mm, yyyy] = euro.split("/");
  const next = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(time.slice(0, 2)), Number(time.slice(3, 5)));
  return Number.isNaN(next.getTime()) ? null : next.getTime();
}

export function isoFromEuro(date: string): string | null {
  const euro = formatEuropeanDate(date);
  if (!isCompleteBirthDate(euro)) return null;
  const [dd, mm, yyyy] = euro.split("/");
  return `${yyyy}-${mm}-${dd}`;
}
