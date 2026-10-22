import { History, Languages, Link2, UserPlus, Users, X } from "lucide-react";
import { useMemo } from "react";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { chartDisplayName, type SavedChart } from "@/lib/chart/library";
import { compareWords } from "@/lib/i18n/catalog/compare-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { cn } from "@/lib/utils";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { PairSelects, type PairPick } from "@/studio/modes/pair-selects";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import { canMoments, MAX_PEOPLE, type CompareMode } from "@/studio/compare/compare-modes";
import { addMore, addSomeoneAs, addSomeoneAsB, setLinked, setMode, setMore, swapPeople } from "@/studio/compare/compare-store";
import { leaveCompare } from "@/studio/compare/gate";
import type { Who } from "@/studio/compare/linked";
import { relationshipPageOf } from "@/studio/compare/meet";

/*
 * Compare's bar (share and compare plan, feature 2, ideas B7 and B8): how to
 * compare (people, one person in two languages, one chart at two moments);
 * the people (A and B as on a Relationship page, then a third and a fourth,
 * each taken out with its ✕) or the one person; linked selection (not
 * between two languages, which share no elements); the way to Relationship
 * for two people; and out.
 */

const ADD = "__add__";

type Props = {
  mode: CompareMode;
  rows: SavedChart[];
  rowA: SavedChart | null;
  rowB: SavedChart | null;
  /** C and D's charts (three or four people). */
  more: SavedChart[];
  names: Record<Who, string>;
};

export function CompareBar({ mode, rows, rowA, rowB, more, names }: Props) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const linked = useStudioStore((s) => s.compare.linked);
  const { setPage } = useStudioUrl({ hydrate: false });
  const meet = mode === "people" && more.length === 0 ? relationshipPageOf(page) : null;
  const meetHint = meet && rowB ? T("cmpMeetHint", { page: t(PAGE_LABEL[meet]), a: names.a, b: names.b }) : "";
  // The ways this page offers: two moments only where its language has a Cycles page.
  const ways: CompareMode[] = canMoments(page) ? ["people", "languages", "moments"] : ["people", "languages"];
  const WAY: Record<CompareMode, { icon: typeof Users; word: Parameters<typeof T>[0]; hint: Parameters<typeof T>[0] }> = {
    people: { icon: Users, word: "cmpWayPeople", hint: "cmpWayPeopleHint" },
    languages: { icon: Languages, word: "cmpWayLanguages", hint: "cmpWayLanguagesHint" },
    moments: { icon: History, word: "cmpWayMoments", hint: "cmpWayMomentsHint" },
  };
  return (
    // A press here is about Compare, not the charts' choices (chart-wheel.tsx lets go of a pin pressed off it).
    <div className="ob-compare-bar" data-testid="compare-bar" data-chart-pick data-mode={mode}>
      <div className="ob-compare-ways" data-testid="compare-ways">
        <SegmentedToggle
          ariaLabel={T("cmpWay")}
          value={ways.includes(mode) ? mode : "people"}
          onChange={setMode}
          options={ways.map((w) => {
            const { icon: Icon, word, hint } = WAY[w];
            return {
              value: w,
              testId: `compare-way-${w}`,
              ariaLabel: `${T(word)} · ${T(hint)}`,
              title: T(hint),
              icon: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                  <span className="ob-compare-way-word">{T(word)}</span>
                </span>
              ),
            };
          })}
        />
      </div>
      {mode === "people" ? <People rows={rows} rowA={rowA} rowB={rowB} more={more} names={names} /> : <OnePerson rows={rows} rowA={rowA} />}
      <div className="ob-compare-tools">
        {mode === "languages" ? null : (
          <button
            type="button"
            role="switch"
            aria-checked={linked}
            className="ob-compare-tool ob-compare-link"
            data-testid="compare-link"
            aria-label={T("cmpLink")}
            title={T("cmpLinkHint")}
            onClick={() => setLinked(!linked)}
          >
            <Link2 className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="ob-compare-tool-word">{T("cmpLink")}</span>
          </button>
        )}
        {meet && rowB ? (
          <button
            type="button"
            className="ob-compare-tool"
            data-testid="compare-meet"
            aria-label={`${T("cmpMeet")} · ${meetHint}`}
            title={meetHint}
            onClick={() => {
              // Every Relationship page reads synastry's second person (studio/store.ts, finishAddPartner).
              useStudioStore.getState().setPartner("synastry", rowB.id);
              setPage(meet);
            }}
          >
            <Users className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="ob-compare-tool-word">{T("cmpMeet")}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="ob-icon-btn ob-compare-leave"
          data-testid="compare-leave"
          aria-label={T("cmpLeave")}
          title={T("cmpLeave")}
          onClick={leaveCompare}
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** The people: A and B (Relationship's lists, A the chart shown everywhere, Swap), then C and D, and one more. */
function People({ rows, rowA, rowB, more, names }: Omit<Props, "mode">) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const pick = useMemo<PairPick>(
    () => ({
      rows,
      aId: rowA?.id ?? null,
      resolvedBId: rowB?.id ?? null,
      // B's list: every chart but A and those already shown as C or D.
      others: rows.filter((r) => r.id !== rowA?.id && !more.some((m) => m.id === r.id)),
      selectA: (id) => useStudioStore.getState().select(id),
      selectB: (id) => useStudioStore.setState((s) => ({ compare: { ...s.compare, partnerId: id || null } })),
      addSecond: addSomeoneAsB,
      swap: swapPeople,
    }),
    [rows, rowA, rowB, more],
  );
  const used = new Set([rowA?.id, rowB?.id, ...more.map((m) => m.id)]);
  const free = [...rows].filter((r) => !used.has(r.id)).sort((x, y) => y.savedAt - x.savedAt);
  const room = rowB != null && more.length < MAX_PEOPLE - 2;
  const nextWho: "c" | "d" = more.length ? "d" : "c";
  const addWord = T(more.length ? "cmpAddFourth" : "cmpAddThird");
  return (
    <div className="ob-compare-people" data-count={2 + more.length}>
      <PairSelects mode="synastry" pair={pick} prefix="compare" page={page} />
      {more.map((row, i) => {
        const who: "c" | "d" = i ? "d" : "c";
        const letter = who.toUpperCase();
        return (
          <span key={who} className="ob-compare-more">
            <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden />
            <label className="ulune-pair-slot">
              <span className="sr-only">{T("cmpPersonPick", { letter })}</span>
              <select
                className="ulune-pair-select ulune-synastry-select"
                data-testid={`compare-person-${who}`}
                value={row.id}
                onChange={(e) => (e.target.value === ADD ? addSomeoneAs(who) : setMore(who, e.target.value))}
              >
                {rows
                  .filter((r) => r.id === row.id || !used.has(r.id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {chartDisplayName(r.input, t("untitled"))}
                    </option>
                  ))}
                <option value={ADD}>{t("pairAddSomeone")}</option>
              </select>
            </label>
            <button
              type="button"
              className="ob-icon-btn ob-compare-remove"
              data-testid={`compare-remove-${who}`}
              aria-label={T("cmpRemove", { name: names[who] })}
              title={T("cmpRemove", { name: names[who] })}
              onClick={() => setMore(who, null)}
            >
              <X className="size-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        );
      })}
      {room ? (
        <button
          type="button"
          className="ob-compare-tool ob-compare-add"
          data-testid="compare-add-person"
          aria-label={addWord}
          title={addWord}
          // The chart kept last that is not shown yet; none left, the birth form for someone new.
          onClick={() => (free[0] ? addMore(free[0].id) : addSomeoneAs(nextWho))}
        >
          <UserPlus className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="ob-compare-tool-word">{T("cmpAddShort")}</span>
        </button>
      ) : null}
    </div>
  );
}

/** One person (two languages, two moments): the chart shown, chosen here as in the switcher. */
function OnePerson({ rows, rowA }: { rows: SavedChart[]; rowA: SavedChart | null }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  return (
    <div className="ob-compare-people">
      <span className="ob-compare-mark is-a" aria-hidden />
      <label className="ulune-pair-slot">
        <span className="sr-only">{T("cmpPersonPick", { letter: "A" })}</span>
        <select
          className="ulune-pair-select ulune-synastry-select"
          data-testid="compare-person-a"
          value={rowA?.id ?? ""}
          onChange={(e) => e.target.value && useStudioStore.getState().select(e.target.value)}
        >
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {chartDisplayName(r.input, t("untitled"))}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
