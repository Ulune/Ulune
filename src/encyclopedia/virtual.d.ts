/* The encyclopedia's data modules, made by scripts/encyclopedia/vite-plugin.mjs. */

declare module "virtual:ulune-encyclopedia/index" {
  const index: import("@/encyclopedia/types").TermIndex;
  export default index;
}

declare module "virtual:ulune-encyclopedia/loaders" {
  type Load<T> = () => Promise<{ default: T }>;
  /** Keys: "<lang>/<tradition>"; each loads that tradition's pages in that language, by id. */
  export const pages: Record<string, Load<Record<string, Load<import("@/encyclopedia/types").PageData>>>>;
  /** Keys: "<lang>/<tradition>". */
  export const cards: Record<string, Load<import("@/encyclopedia/types").CardTexts>>;
  /** Keys: "<lang>". */
  export const search: Record<string, Load<import("@/encyclopedia/types").SearchIndex>>;
  /** Keys: "<lang>". */
  export const homes: Record<string, Load<import("@/encyclopedia/types").HomeData>>;
  /** Keys: "<lang>/<tradition>". */
  export const traditions: Record<string, Load<import("@/encyclopedia/types").TraditionHome>>;
}
