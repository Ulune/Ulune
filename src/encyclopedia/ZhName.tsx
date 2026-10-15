import { tr } from "./words";
import type { Lang, ZhName as Zh } from "./types";

/*
 * A Chinese name in the head of an encyclopedia page (encyclopedia plan,
 * part 23: "the names in the other languages Ulune shows… 土星 Tǔxīng where
 * a Chinese name exists"): its Traditional characters, its Simplified ones
 * where they differ (風水 · 风水), each marked with its script so it is drawn
 * with a Chinese face and read as Chinese, then its pinyin with its tones.
 * The same for every reader: the page is rendered on the server, before the
 * reader's choice of script is known.
 */

export function ZhName({ zh, lang, className = "ob-enc-zh" }: { zh: Zh; lang: Lang; className?: string }) {
  const both = zh.hans !== zh.hant;
  return (
    <span className={className} data-testid="enc-zh">
      <span className="sr-only">{tr(lang, "encZhName")} </span>
      <span className="ob-enc-zh-hanzi" lang="zh-Hant" title={both ? tr(lang, "encZhHant") : undefined}>
        {zh.hant}
      </span>
      {both ? (
        <>
          <span className="ob-enc-zh-sep" aria-hidden="true">
            {" · "}
          </span>
          <span className="ob-enc-zh-hanzi" lang="zh-Hans" title={tr(lang, "encZhHans")}>
            {zh.hans}
          </span>
        </>
      ) : null}{" "}
      <span className="ob-enc-zh-pinyin" lang="zh-Latn-pinyin">
        {zh.pinyin}
      </span>
    </span>
  );
}
