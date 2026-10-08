import { useRouter } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { loadCards, loadIndex, termRow } from "./data";
import { EncLink } from "./frame";
import { inYourChart, titleOf, yourPages, type Line, type Mine } from "./in-your-chart";
import { Term } from "./Term";
import { askReading, chooseYourChart, onYourCharts, yourChart, yourCharts, type YourChart } from "./your-chart";
import { tr, type EncKey } from "./words";
import type { CardTexts, Lang, PageData, TermIndex } from "./types";

/*
 * "In your chart" (encyclopedia plan, part 18): its own download, fetched by
 * a page only when the studio has a chart in this tab (MineSlot in
 * EntryPage.tsx and HomePage.tsx). The lines come from in-your-chart.ts; the
 * entries' addresses from the index, the titles of the few links that need
 * one from the tradition's cards. Shown, with a switch to hide it (decision
 * 6), remembered in this browser as a yes or no, nothing personal.
 */

const HIDE_KEY = "ulune.enc.mine";

function hiddenPref(): boolean {
  try {
    return window.localStorage.getItem(HIDE_KEY) === "hidden";
  } catch {
    return false;
  }
}

function setHiddenPref(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(HIDE_KEY, "hidden");
    else window.localStorage.removeItem(HIDE_KEY);
  } catch {
    // Storage refused: the choice lasts for the page.
  }
}

/** The chart the encyclopedia speaks of, following the studio and the reader's choice. */
function useYourChart(): YourChart | null {
  return useSyncExternalStore(onYourCharts, yourChart, () => null);
}

/** The index (addresses) and, when a link needs its title, the tradition's cards. */
function useNames(lang: Lang, traditions: string[]): { index: TermIndex | null; cards: CardTexts } {
  const [index, setIndex] = useState<TermIndex | null>(null);
  const [cards, setCards] = useState<CardTexts>({});
  const key = traditions.join(" ");
  useEffect(() => {
    let live = true;
    loadIndex()
      .then((i) => live && setIndex(i))
      .catch(() => {});
    for (const t of key ? key.split(" ") : [])
      loadCards(lang, t)
        .then((c) => live && setCards((prev) => ({ ...prev, ...c })))
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [lang, key]);
  return { index, cards };
}

function Pieces({ line, lang, index, cards }: { line: Line; lang: Lang; index: TermIndex | null; cards: CardTexts }) {
  return (
    <>
      {line.map((p, i) => {
        if (typeof p === "string") return p;
        const words = p.text ?? titleOf(p.id, lang) ?? cards[p.id]?.[0]?.split(" · ")[0] ?? "";
        const row = index ? termRow(index.terms, p.id) : null;
        // Until the index is here, or for a thing with no entry: the words alone.
        if (!row) return <span key={i}>{words}</span>;
        return (
          <Term key={i} id={p.id} lang={lang} slug={row[4] ? (lang === "en" ? row[2] : row[3]) : null}>
            {words}
          </Term>
        );
      })}
    </>
  );
}

function Whose({ lang, chart }: { lang: Lang; chart: YourChart }) {
  const all = yourCharts()?.charts ?? [];
  if (all.length < 2) return null;
  return (
    <label className="ob-enc-mine-whose">
      <span className="ob-enc-mine-whose-label">{tr(lang, "encMineWhose")}</span>
      <select value={chart.id} onChange={(e) => chooseYourChart(e.target.value)} data-testid="enc-mine-whose">
        {all.map((c, i) => (
          <option key={c.id} value={c.id}>
            {c.label || tr(lang, "encMineUntitled", { n: i + 1 })}
          </option>
        ))}
      </select>
    </label>
  );
}

function Frame({ lang, chart, children, testId }: { lang: Lang; chart: YourChart; children: ReactNode; testId: string }) {
  const [hidden, setHidden] = useState(hiddenPref);
  const toggle = () => {
    setHiddenPref(!hidden);
    setHidden(!hidden);
  };
  return (
    <section className={`ob-enc-mine${hidden ? " ob-enc-mine--hidden" : ""}`} aria-labelledby="s-mine" data-testid={testId} data-hidden={hidden ? "" : undefined}>
      <div className="ob-enc-mine-head">
        <h2 id="s-mine" className="ob-enc-h2">
          {tr(lang, "encMine")}
        </h2>
        {hidden ? null : <Whose lang={lang} chart={chart} />}
        <button type="button" className="ob-enc-mine-toggle" onClick={toggle} aria-expanded={!hidden} data-testid="enc-mine-toggle">
          {tr(lang, hidden ? "encMineShow" : "encMineHide")}
        </button>
      </div>
      {hidden ? null : children}
    </section>
  );
}

function Reading({ lang, chart, mine }: { lang: Lang; chart: YourChart; mine: Mine }) {
  const router = useRouter();
  if (!mine.reading) return null;
  const { path, ref } = mine.reading;
  const open = () => {
    if (ref) askReading(chart.id, ref);
    void router.navigate({ href: path });
  };
  return (
    <button type="button" className="ob-enc-mine-reading" onClick={open} data-testid="enc-mine-reading">
      {tr(lang, ref ? "encMineReading" : "encMineHd")}
    </button>
  );
}

/** The part of an entry's page. */
export function InYourChartPart({ page }: { page: PageData }) {
  const chart = useYourChart();
  const lang = page.lang;
  const mine = chart ? inYourChart({ id: page.id, tradition: page.tradition.id, family: page.family.id, kind: page.kind }, chart, lang) : null;
  const needsCards = Boolean(mine?.lines.some((l) => l.some((p) => typeof p !== "string" && !p.text && !titleOf(p.id, lang))));
  const { index, cards } = useNames(lang, needsCards ? [page.tradition.id] : []);
  if (!chart || !mine || !mine.lines.length) return null;
  return (
    <Frame lang={lang} chart={chart} testId="enc-mine">
      <div className="ob-enc-mine-body ob-enc-prose">
        {mine.lines.map((line, i) => (
          <p key={i}>
            <Pieces line={line} lang={lang} index={index} cards={cards} />
          </p>
        ))}
      </div>
      <div className="ob-enc-mine-foot">
        <Reading lang={lang} chart={chart} mine={mine} />
        <span className="ob-enc-mine-note">{tr(lang, "encMineNote")}</span>
      </div>
    </Frame>
  );
}

const GROUPS: { group: ReturnType<typeof yourPages>[number]["group"]; key: EncKey; tradition: string }[] = [
  { group: "signs", key: "encMineSigns", tradition: "astrology" },
  { group: "houses", key: "encMineHouses", tradition: "astrology" },
  { group: "angles", key: "encMineAngles", tradition: "astrology" },
  { group: "aspects", key: "encMineAspects", tradition: "astrology" },
  { group: "numbers", key: "encMineNumbers", tradition: "numerology" },
  { group: "design", key: "encMineDesign", tradition: "human-design" },
];

/** The home's personal index: every page that speaks of this chart (all traditions, or one). */
export function YourPages({ lang, tradition }: { lang: Lang; tradition?: string }) {
  const chart = useYourChart();
  const groups = chart ? yourPages(chart) : [];
  const shown = GROUPS.filter((g) => !tradition || g.tradition === tradition)
    .map((g) => ({ ...g, ids: groups.find((x) => x.group === g.group)?.ids ?? [] }))
    .filter((g) => g.ids.length);
  const { index, cards } = useNames(lang, shown.some((g) => g.group === "design") ? ["human-design"] : []);
  if (!chart || !shown.length) return null;
  return (
    <Frame lang={lang} chart={chart} testId="enc-mine-index">
      <p className="ob-enc-mine-lead">{tr(lang, "encMineLead")}</p>
      {shown.map((g) => (
        <div key={g.group} className="ob-enc-mine-group" data-group={g.group}>
          <h3 className="ob-enc-mine-h3">{tr(lang, g.key)}</h3>
          <ul className="ob-enc-compact">
            {g.ids.map((id) => {
              const row = index ? termRow(index.terms, id) : null;
              const title = titleOf(id, lang) ?? cards[id]?.[0] ?? "";
              if (!row || !row[4] || !title) return null;
              return (
                <li key={id} data-entry={id}>
                  <EncLink to={lang} slug={lang === "en" ? row[2] : row[3]} className="ob-enc-compact-link">
                    {title}
                  </EncLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="ob-enc-mine-note">{tr(lang, "encMineNote")}</p>
    </Frame>
  );
}
