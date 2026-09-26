/**
 * A chart's IANA zone as this browser's Intl can use it. The server resolves
 * zones from the current tz database; an older browser may not know a zone
 * created or renamed since its own data (America/Coyhaique 2025,
 * America/Ciudad_Juarez 2022, Europe/Kyiv 2022…) and Intl would throw. Fall
 * back to the older name or a zone that has kept the same clock, then UTC.
 */
const OLDER: Record<string, string[]> = {
  "Europe/Kyiv": ["Europe/Kiev"],
  "America/Nuuk": ["America/Godthab"],
  "Pacific/Kanton": ["Pacific/Enderbury"],
  "Asia/Yangon": ["Asia/Rangoon"],
  "Asia/Kolkata": ["Asia/Calcutta"],
  "Asia/Kathmandu": ["Asia/Katmandu"],
  "Asia/Ho_Chi_Minh": ["Asia/Saigon"],
  "Atlantic/Faroe": ["Atlantic/Faeroe"],
  "America/Ciudad_Juarez": ["America/Denver"],
  "America/Coyhaique": ["America/Punta_Arenas"],
  "Asia/Qostanay": ["Asia/Almaty"],
};

const cache = new Map<string, string>();

function usable(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function browserZone(zone: string | null | undefined): string {
  const want = zone || "UTC";
  const hit = cache.get(want);
  if (hit) return hit;
  const pick = [want, ...(OLDER[want] ?? [])].find(usable) ?? "UTC";
  cache.set(want, pick);
  return pick;
}
