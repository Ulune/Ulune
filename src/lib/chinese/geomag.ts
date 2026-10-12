/*
 * The magnetic declination, the angle between true north and the north a
 * compass needle points to, from the World Magnetic Model (wmm2025.ts), at a
 * place and a date. A luopan reads magnetic north; a map reads true north;
 * Feng Shui's facing input says which one a typed facing is, and turns one
 * into the other (languages plan, part 22).
 *
 * The model's own method (the WMM 2025 technical report, section 1.2): the
 * geodetic place turned geocentric on the WGS 84 ellipsoid, the coefficients
 * moved to the date, the field summed with Schmidt semi-normalised
 * associated Legendre functions, then turned back to the geodetic frame.
 * Pure; tested against the model's published test values in
 * scripts/chinese-fengshui-home.test.mjs. Nothing is sent.
 */
import { WMM_EPOCH, WMM_G, WMM_GDOT, WMM_H, WMM_HDOT, WMM_VALID } from "./wmm2025";

export type GeoModel = { epoch: number; g: readonly number[]; h: readonly number[]; gdot: readonly number[]; hdot: readonly number[]; nMax: number };

export const WMM2025: GeoModel = { epoch: WMM_EPOCH, g: WMM_G, h: WMM_H, gdot: WMM_GDOT, hdot: WMM_HDOT, nMax: 12 };

const A = 6378.137; // WGS 84 semi-major axis, km
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const RE = 6371.2; // the model's reference radius, km
const RAD = Math.PI / 180;

/** The field at a place (degrees, km above the ellipsoid) and a decimal year: north, east and down, in nT. */
export function magneticField(lat: number, lon: number, year: number, altKm = 0, model: GeoModel = WMM2025): { x: number; y: number; z: number } {
  const phi = lat * RAD;
  const lam = lon * RAD;
  const sinPhi = Math.sin(phi);
  const rc = A / Math.sqrt(1 - E2 * sinPhi * sinPhi);
  const p = (rc + altKm) * Math.cos(phi);
  const zc = (rc * (1 - E2) + altKm) * sinPhi;
  const r = Math.hypot(p, zc);
  const phiC = Math.asin(zc / r);
  const t = year - model.epoch;
  const N = model.nMax;
  // Schmidt semi-normalised P(n, m)(sin φ′) and dP/dθ (θ the colatitude), by recursion.
  const x = Math.sin(phiC); // cos θ
  const s = Math.cos(phiC); // sin θ
  const P: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  const dP: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  P[0]![0] = 1;
  for (let n = 1; n <= N; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) {
        const k = n === 1 ? 1 : Math.sqrt((2 * n - 1) / (2 * n));
        P[n]![n] = k * s * P[n - 1]![n - 1]!;
        dP[n]![n] = k * (x * P[n - 1]![n - 1]! + s * dP[n - 1]![n - 1]!);
      } else {
        const a = Math.sqrt(n * n - m * m);
        const b = n >= 2 ? Math.sqrt((n - 1) * (n - 1) - m * m) : 0;
        const p2 = n >= 2 ? P[n - 2]![m]! : 0;
        const d2 = n >= 2 ? dP[n - 2]![m]! : 0;
        P[n]![m] = ((2 * n - 1) * x * P[n - 1]![m]! - b * p2) / a;
        dP[n]![m] = ((2 * n - 1) * (x * dP[n - 1]![m]! - s * P[n - 1]![m]!) - b * d2) / a;
      }
    }
  }
  let bx = 0;
  let by = 0;
  let bz = 0;
  for (let n = 1; n <= N; n++) {
    const ratio = Math.pow(RE / r, n + 2);
    for (let m = 0; m <= n; m++) {
      const i = (n * (n + 1)) / 2 + m;
      const g = model.g[i]! + t * model.gdot[i]!;
      const h = model.h[i]! + t * model.hdot[i]!;
      const cm = Math.cos(m * lam);
      const sm = Math.sin(m * lam);
      const gh = g * cm + h * sm;
      // North is −B_θ = (1/r) ∂V/∂θ; east −(1/(r sin θ)) ∂V/∂λ; down ∂V/∂r.
      bx += ratio * gh * dP[n]![m]!;
      if (s > 1e-12) by += ratio * m * (g * sm - h * cm) * P[n]![m]! / s;
      bz -= (n + 1) * ratio * gh * P[n]![m]!;
    }
  }
  const psi = phiC - phi;
  return { x: bx * Math.cos(psi) - bz * Math.sin(psi), y: by, z: bx * Math.sin(psi) + bz * Math.cos(psi) };
}

/** The declination at a place and a decimal year, in degrees, east positive. */
export function declination(lat: number, lon: number, year: number, altKm = 0, model: GeoModel = WMM2025): number {
  const f = magneticField(lat, lon, year, altKm, model);
  return Math.atan2(f.y, f.x) / RAD;
}

/** A date as the model's decimal year. */
export function decimalYear(ms: number): number {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (ms - start) / (end - start);
}

/** Whether a date lies within the model's five years. */
export function modelCovers(ms: number): boolean {
  return ms >= Date.parse(`${WMM_VALID.from}T00:00:00Z`) && ms < Date.parse(`${WMM_VALID.to}T00:00:00Z`);
}
