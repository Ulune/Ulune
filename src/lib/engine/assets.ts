/**
 * Where a device fetches the engine's files from (on-device plan, step 2):
 * Ulune's own address, each file under a name that changes with its content
 * (/assets/sepl_18-<hash>.se1 in a build), so the browser and the edge keep
 * it for a year and a new file never meets an old copy. In development they
 * are served from the repository (ephe/ and sweph-wasm's package).
 *
 * Imported by the worker only: none of this is in the first load.
 */
import type { EngineUrls } from "./files-browser";
import swisseph from "../../../node_modules/sweph-wasm/dist/wasm/swisseph.wasm?url";
import sepl18 from "../../../ephe/sepl_18.se1?url";
import semo18 from "../../../ephe/semo_18.se1?url";
import seas18 from "../../../ephe/seas_18.se1?url";
import eris from "../../../ephe/s136199s.se1?url";
import sedna from "../../../ephe/se90377s.se1?url";
import stars from "../../../ephe/sefstars.txt?url";
import sepl12 from "../../../ephe/sepl_12.se1?url";
import semo12 from "../../../ephe/semo_12.se1?url";
import seas12 from "../../../ephe/seas_12.se1?url";
import sepl06 from "../../../ephe/sepl_06.se1?url";
import semo06 from "../../../ephe/semo_06.se1?url";
import seas06 from "../../../ephe/seas_06.se1?url";
import sepl00 from "../../../ephe/sepl_00.se1?url";
import semo00 from "../../../ephe/semo_00.se1?url";
import seas00 from "../../../ephe/seas_00.se1?url";
import seplm06 from "../../../ephe/seplm06.se1?url";
import semom06 from "../../../ephe/semom06.se1?url";
import seasm06 from "../../../ephe/seasm06.se1?url";

export const ENGINE_URLS: EngineUrls = {
  wasm: swisseph,
  files: {
    "sepl_18.se1": sepl18,
    "semo_18.se1": semo18,
    "seas_18.se1": seas18,
    "s136199s.se1": eris,
    "se90377s.se1": sedna,
    "sefstars.txt": stars,
    "sepl_12.se1": sepl12,
    "semo_12.se1": semo12,
    "seas_12.se1": seas12,
    "sepl_06.se1": sepl06,
    "semo_06.se1": semo06,
    "seas_06.se1": seas06,
    "sepl_00.se1": sepl00,
    "semo_00.se1": semo00,
    "seas_00.se1": seas00,
    "seplm06.se1": seplm06,
    "semom06.se1": semom06,
    "seasm06.se1": seasm06,
  },
};
