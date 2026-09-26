declare module "tz-lookup" {
  export default function tzlookup(lat: number, lng: number): string;
}

declare module "sweph-wasm/wasm/swisseph" {
  const factory: (opts?: { wasmBinary?: Buffer | Uint8Array }) => Promise<unknown>;
  export default factory;
}
// A reading pack in one language (scripts/content-packs-plugin.mjs); packs.ts
// gives each import its real type.
declare module "*?lang=en" {
  const pack: unknown;
  export = pack;
}
declare module "*?lang=fr" {
  const pack: unknown;
  export = pack;
}
