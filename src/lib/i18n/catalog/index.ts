import { shell } from "./shell";
import { birth } from "./birth";
import { readings } from "./readings";
import { ai } from "./ai";
import { modes } from "./modes";
import { tables } from "./tables";
import { look } from "./look";
import { bodies } from "./bodies";
import { wheel } from "./wheel";
import { account } from "./account";
import { errors } from "./errors";
import { common } from "./common";
import { space } from "./space";
import { legal } from "./legal";

/**
 * Every UI string, English and French side by side, split by area.
 * Content prose (readings, click notes, hello copy) lives in its own files.
 */
export const CATALOG = {
  ...shell,
  ...birth,
  ...readings,
  ...ai,
  ...modes,
  ...tables,
  ...look,
  ...bodies,
  ...wheel,
  ...account,
  ...errors,
  ...common,
  ...space,
  ...legal,
} as const;

export type CatalogKey = keyof typeof CATALOG;
