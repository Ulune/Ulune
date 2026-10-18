import { ArrowDown, ArrowUp, Check, ChevronRight, Pencil, Plus, Tag, Tags, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { chartDisplayName, type SavedChart } from "@/lib/chart/library";
import { useI18n } from "@/lib/i18n/locale";
import { toast } from "@/lib/toast";
import { useStudioStore } from "@/studio/store";
import { GROUP_NAME_MAX, addGroup, dropGroup, moveGroup, noteFinds, renameGroup, setMember, type GroupError, type KeptGroup } from "./kept";
import { loadKept, setGroups, useKept } from "./kept-store";
import { useKeptWords, type KeptT } from "./kept-words";
import "./groups.css";

/*
 * The reader's groups in the chart switcher (share and compare plan, idea
 * B5), fetched by studio/show/picker-extras.tsx once a private space is open:
 *   - over the charts, a filter: All, then each group, in the reader's order;
 *   - All shows the charts group by group under headings that fold, then
 *     those in no group (a chart in two groups is under both); a group
 *     chosen shows its charts alone; a search looks through the charts
 *     shown, and, when asked, through their notes too (idea B6: off by
 *     default, for this tab only; a note is never shown here, only that the
 *     chart was found in it);
 *   - beside each chart, once a group exists, its groups to tick, and a new
 *     one to make;
 *   - under New and Ask, the Groups row: the groups to make, rename, move
 *     and delete (deleting a group never touches its charts).
 * The rows themselves are ChartPicker.tsx's, with every one of their parts.
 * Kept sealed in the space (kept-store.ts); without one, the row says so
 * (need-line.tsx). The filter, the folded headings and the notes' search are
 * remembered for the tab only, never stored.
 */

/** A row of the switcher (ChartPicker.tsx), with what this code adds beside its buttons. */
export type PickerRow = (row: SavedChart, more?: ReactNode) => ReactNode;

// The space's groups and notes, read as soon as this code is here (fetched at idle once a space is open): the switcher opens with them.
if (typeof window !== "undefined") void loadKept();

/** For this tab only: the group shown ("" for All), the headings folded, whether the search looks in notes. */
let filterNow = "";
const closedNow = new Set<string>();
let notesNow = false;

function stopEscape(e: KeyboardEvent<HTMLElement>, then: () => void): void {
  if (e.key !== "Escape") return;
  // The field's own Escape: the switcher stays open (anchored-popover.tsx closes on Escape).
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
  then();
}

function errorText(T: KeptT, error: GroupError): string {
  return T(error === "taken" ? "keptTaken" : error === "full" ? "keptFull" : "keptEmptyName");
}

/** The switcher's list of charts, by group (in place of its plain list once a space is open). */
export function GroupedList({ shown, rows, query, row }: { shown: SavedChart[]; rows: SavedChart[]; query: string; row: PickerRow }) {
  const { t } = useI18n();
  const T = useKeptWords();
  const ready = useKept((s) => s.ready);
  const groups = useKept((s) => s.groups);
  const notes = useKept((s) => s.notes);
  // Read as the switcher opened, or the plain list this time: the charts never move under the pointer.
  const [readyAtOpen] = useState(ready);
  // Each group's charts as the switcher opened: a group ticked or unticked moves a chart at the next opening,
  // not under the pointer (its row, and the groups unfolded under it, stay). A group made meanwhile shows its own.
  const [placed] = useState(() => new Map(groups.map((g) => [g.id, new Set(g.members)])));
  const membersOf = (g: KeptGroup): ReadonlySet<string> => placed.get(g.id) ?? new Set(g.members);
  const [filter, setFilter] = useState(filterNow);
  const [closed, setClosed] = useState(() => new Set(closedNow));
  const [inNotes, setInNotes] = useState(notesNow);
  const baseId = useId();
  useEffect(() => void loadKept(), []);

  const tagged = (r: SavedChart) => (groups.length ? row(r, <RowGroups id={r.id} name={chartDisplayName(r.input, t("untitled"))} />) : row(r));
  const plain = (list: SavedChart[], none: string) => (
    <ul className="ob-picker-list">{list.length ? list.map(tagged) : <li className="ob-picker-none">{none}</li>}</ul>
  );
  if (!readyAtOpen) return plain(shown, t("libraryNone"));

  const current = filter && groups.some((g) => g.id === filter) ? filter : "";
  const chosen = current ? groups.find((g) => g.id === current) : undefined;
  const scope = chosen ? membersOf(chosen) : null;
  const inScope = (r: SavedChart) => !scope || scope.has(r.id);
  const choose = (id: string) => {
    filterNow = id;
    setFilter(id);
  };
  const onArrows = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!by) return;
    e.preventDefault();
    const ids = ["", ...groups.map((g) => g.id)];
    choose(ids[(ids.indexOf(current) + by + ids.length) % ids.length]!);
    const box = e.currentTarget;
    window.requestAnimationFrame(() => box.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  };
  const chips = groups.length ? (
    <div className="ob-kept-chips" role="radiogroup" aria-label={T("keptShowFrom")} data-testid="group-filter" onKeyDown={onArrows}>
      {[{ id: "", name: T("keptAll") }, ...groups].map((g) => (
        <button
          key={g.id || "all"}
          type="button"
          role="radio"
          aria-checked={current === g.id}
          tabIndex={current === g.id ? 0 : -1}
          className="ob-kept-chip"
          data-testid="group-chip"
          data-group={g.id ? g.name : ""}
          onClick={() => choose(g.id)}
        >
          <span className="truncate">{g.name}</span>
        </button>
      ))}
    </div>
  ) : null;

  const q = query.trim();
  if (q) {
    // The charts found by name, place or date (ChartPicker.tsx), then, if asked, those found in their notes.
    const found = shown.filter(inScope);
    const foundIds = new Set(found.map((r) => r.id));
    const hits = inNotes ? rows.filter((r) => inScope(r) && !foundIds.has(r.id) && noteFinds(notes[r.id], q)) : [];
    const subId = `${baseId}-notes`;
    return (
      <>
        {chips}
        {Object.keys(notes).length ? (
          <label className="ob-kept-toggle">
            <input
              type="checkbox"
              checked={inNotes}
              data-testid="search-notes"
              onChange={(e) => {
                notesNow = e.target.checked;
                setInNotes(notesNow);
              }}
            />
            {T("keptSearchNotes")}
          </label>
        ) : null}
        <div className="ob-kept-scroll">
          {found.length || !hits.length ? plain(found, t("libraryNone")) : null}
          {hits.length ? (
            <>
              <p className="ob-kept-sub" id={subId}>
                {T("keptInNotes")}
              </p>
              <ul className="ob-picker-list" aria-labelledby={subId} data-testid="note-hits">
                {hits.map(tagged)}
              </ul>
            </>
          ) : null}
        </div>
      </>
    );
  }
  if (scope) {
    return (
      <>
        {chips}
        {plain(shown.filter(inScope), T("keptGroupEmpty"))}
      </>
    );
  }
  if (!groups.length) return plain(shown, t("libraryNone"));

  const toggle = (id: string) => {
    if (closedNow.has(id)) closedNow.delete(id);
    else closedNow.add(id);
    setClosed(new Set(closedNow));
  };
  const section = (id: string, title: string, list: SavedChart[]) => {
    const open = !closed.has(id);
    const n = list.length;
    const listId = `${baseId}-${id || "rest"}`;
    return (
      <div key={id || "rest"} data-testid="group-section" data-group={id ? title : ""}>
        <button
          type="button"
          className="ob-kept-head"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={T(n === 0 ? "keptHeadNone" : n === 1 ? "keptHeadOne" : "keptHeadMany", { name: title, n })}
          data-testid="group-head"
          onClick={() => toggle(id)}
        >
          <ChevronRight className="ob-kept-chev" strokeWidth={2} aria-hidden />
          <span className="truncate">{title}</span>
          <span className="ob-kept-count" aria-hidden>
            {n}
          </span>
        </button>
        {open ? (
          <ul id={listId} className="ob-picker-list">
            {n ? list.map(tagged) : <li className="ob-picker-none">{T("keptGroupEmpty")}</li>}
          </ul>
        ) : null}
      </div>
    );
  };
  const grouped = new Set(groups.flatMap((g) => [...membersOf(g)]));
  const rest = shown.filter((r) => !grouped.has(r.id));
  return (
    <>
      {chips}
      <div className="ob-kept-scroll" data-testid="group-sections">
        {groups.map((g) => {
          const members = membersOf(g);
          return section(
            g.id,
            g.name,
            shown.filter((r) => members.has(r.id)),
          );
        })}
        {rest.length ? section("", T("keptUngrouped"), rest) : null}
      </div>
    </>
  );
}

/** A chart's groups, from its row: the button, and the groups to tick under the row once it is pressed. */
export function RowGroups({ id, name }: { id: string; name: string }) {
  const T = useKeptWords();
  const inOne = useKept((s) => s.groups.some((g) => g.members.includes(id)));
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const label = T("keptTagFor", { name });
  return (
    <>
      <button
        type="button"
        className="ob-icon-btn ob-icon-btn--quiet ob-kept-tag"
        data-testid="chart-groups"
        data-in={inOne ? "" : undefined}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Tag className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
      {open ? <TagChips id={panelId} chartId={id} label={label} /> : null}
    </>
  );
}

/** A chart's groups to tick, and a new one to make with the chart in it (the switcher's row, the Birth tab). */
export function TagChips({ chartId, label, id, testId = "chart-groups-panel" }: { chartId: string; label: string; id?: string; testId?: string }) {
  const T = useKeptWords();
  const groups = useKept((s) => s.groups);
  const [adding, setAdding] = useState(false);
  const newRef = useRef<HTMLButtonElement>(null);
  return (
    <div id={id} className="ob-kept-tags" role="group" aria-label={label} data-testid={testId}>
      {groups.map((g) => {
        const on = g.members.includes(chartId);
        return (
          <button
            key={g.id}
            type="button"
            className="ob-kept-chip"
            aria-pressed={on}
            data-testid="group-toggle"
            data-group={g.name}
            onClick={() => void setGroups(setMember(useKept.getState().groups, g.id, chartId, !on, Date.now()))}
          >
            {on ? <Check strokeWidth={2} aria-hidden /> : null}
            <span className="truncate">{g.name}</span>
          </button>
        );
      })}
      {adding ? (
        <NewGroup
          member={chartId}
          focus
          onDone={() => {
            setAdding(false);
            window.requestAnimationFrame(() => newRef.current?.focus());
          }}
        />
      ) : (
        <button ref={newRef} type="button" className="ob-kept-chip ob-kept-chip--new" data-testid="group-new" onClick={() => setAdding(true)}>
          <Plus strokeWidth={2} aria-hidden />
          {T("keptNewGroup")}
        </button>
      )}
    </div>
  );
}

/** A new group's name, and Add (with `member` in it, from a chart's groups); its error said at once. */
function NewGroup({ member, focus = false, onDone }: { member?: string; focus?: boolean; onDone?: () => void }) {
  const T = useKeptWords();
  const [name, setName] = useState("");
  const [error, setError] = useState<GroupError | null>(null);
  const errId = useId();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) field.current?.focus();
  }, [focus]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = addGroup(useKept.getState().groups, name, crypto.randomUUID(), Date.now(), member ? [member] : []);
    if (typeof next === "string") {
      setError(next);
      return;
    }
    setError(null);
    setName("");
    void setGroups(next);
    onDone?.();
  };
  return (
    <div className="ob-kept-new">
      <form className="ob-kept-form" onSubmit={submit} data-testid="group-new-form">
        <input
          ref={field}
          className="ob-kept-field"
          value={name}
          maxLength={GROUP_NAME_MAX}
          placeholder={T("keptNewPlaceholder")}
          aria-label={T("keptNewName")}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          autoComplete="off"
          data-testid="group-new-name"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (onDone) stopEscape(e, onDone);
          }}
        />
        <button type="submit" className="ob-btn ob-btn--ghost" data-testid="group-new-add">
          {T("keptAdd")}
        </button>
      </form>
      <p id={errId} className="ob-kept-error" role="alert">
        {error ? errorText(T, error) : ""}
      </p>
    </div>
  );
}

/** A group's new name: Enter or Save keeps it, Escape leaves it as it was. */
function Rename({ group, onDone }: { group: KeptGroup; onDone: () => void }) {
  const T = useKeptWords();
  const [name, setName] = useState(group.name);
  const [error, setError] = useState<GroupError | null>(null);
  const errId = useId();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = renameGroup(useKept.getState().groups, group.id, name, Date.now());
    if (typeof next === "string") {
      setError(next);
      return;
    }
    void setGroups(next);
    onDone();
  };
  return (
    <div className="ob-kept-new">
      <form className="ob-kept-form" onSubmit={submit}>
        <input
          ref={field}
          className="ob-kept-field"
          value={name}
          maxLength={GROUP_NAME_MAX}
          aria-label={T("keptRenameField", { name: group.name })}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          autoComplete="off"
          data-testid="group-rename-field"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => stopEscape(e, onDone)}
        />
        <button type="submit" className="ob-btn ob-btn--ghost" data-testid="group-rename-save">
          {T("keptSave")}
        </button>
      </form>
      <p id={errId} className="ob-kept-error" role="alert">
        {error ? errorText(T, error) : ""}
      </p>
    </div>
  );
}

/** The switcher's Groups row, under New and Ask: the groups to make, rename, move and delete, folded until pressed. */
export function GroupsRow() {
  const T = useKeptWords();
  const ready = useKept((s) => s.ready);
  const count = useKept((s) => s.groups.length);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rowRef = useRef<HTMLButtonElement>(null);
  useEffect(() => void loadKept(), []);
  if (!ready) return null;
  return (
    <>
      <button
        ref={rowRef}
        type="button"
        className="ob-picker-new"
        style={{ marginTop: 0, borderTop: 0 }}
        data-testid="groups-row"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Tags className="size-4" strokeWidth={1.75} aria-hidden />
        <span>{T("keptGroups")}</span>
        {count ? <span className="ob-kept-count">{count}</span> : null}
        <ChevronRight className="ob-kept-chev" strokeWidth={2} aria-hidden style={{ marginLeft: "auto" }} />
      </button>
      {open ? <Manage id={panelId} back={() => rowRef.current?.focus()} /> : null}
    </>
  );
}

function Manage({ id, back }: { id: string; back: () => void }) {
  const T = useKeptWords();
  const groups = useKept((s) => s.groups);
  const rows = useStudioStore((s) => s.rows);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const here = new Set(rows.map((r) => r.id));
  /** After a move, a rename or a question: the focus on that group's own button again (its row was drawn anew). */
  const focus = (groupId: string, which: string) =>
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-group-id="${groupId}"] [data-focus="${which}"]`)?.focus());
  const move = (g: KeptGroup, by: -1 | 1) => {
    const next = moveGroup(useKept.getState().groups, g.id, by);
    void setGroups(next);
    // The same button again, unless the group now stands at that end of the list.
    const at = next.findIndex((x) => x.id === g.id);
    focus(g.id, by < 0 ? (at > 0 ? "up" : "down") : at < next.length - 1 ? "down" : "up");
  };
  // Ulune's three examples, to start with: once the reader has a group of their own, a name is typed.
  const suggested = groups.length ? [] : [T("keptSuggestFamily"), T("keptSuggestFriends"), T("keptSuggestClients")];
  return (
    <div id={id} className="ob-kept-manage" data-testid="groups-panel">
      {groups.length ? (
        <ul ref={listRef} className="ob-kept-list">
          {groups.map((g, i) => (
            <li key={g.id} className="ob-kept-item" data-testid="group-item" data-group={g.name} data-group-id={g.id}>
              {asking === g.id ? (
                <div className="ob-picker-confirm">
                  <span className="ob-picker-confirm-q">{T("keptDeleteAsk", { name: g.name })}</span>
                  <div className="ob-picker-confirm-actions">
                    <button
                      type="button"
                      className="ob-btn ob-btn--ghost"
                      data-focus="keep"
                      onClick={() => {
                        setAsking(null);
                        focus(g.id, "delete");
                      }}
                    >
                      {T("keptKeep")}
                    </button>
                    <button
                      type="button"
                      className="ob-btn ob-btn--danger"
                      data-testid="group-delete-confirm"
                      onClick={() => {
                        void setGroups(dropGroup(useKept.getState().groups, g.id));
                        setAsking(null);
                        toast(T("keptDeleted", { name: g.name }));
                        back();
                      }}
                    >
                      {T("keptDeleteYes")}
                    </button>
                  </div>
                </div>
              ) : renaming === g.id ? (
                <Rename
                  group={g}
                  onDone={() => {
                    setRenaming(null);
                    focus(g.id, "rename");
                  }}
                />
              ) : (
                <>
                  <span className="ob-kept-item-name">{g.name}</span>
                  <span className="ob-kept-count">{g.members.filter((m) => here.has(m)).length}</span>
                  <button
                    type="button"
                    className="ob-icon-btn ob-icon-btn--quiet"
                    data-focus="rename"
                    data-testid="group-rename"
                    title={T("keptRename", { name: g.name })}
                    aria-label={T("keptRename", { name: g.name })}
                    onClick={() => setRenaming(g.id)}
                  >
                    <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ob-icon-btn ob-icon-btn--quiet"
                    data-focus="up"
                    data-testid="group-up"
                    disabled={i === 0}
                    title={T("keptUp", { name: g.name })}
                    aria-label={T("keptUp", { name: g.name })}
                    onClick={() => move(g, -1)}
                  >
                    <ArrowUp className="size-4" strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ob-icon-btn ob-icon-btn--quiet"
                    data-focus="down"
                    data-testid="group-down"
                    disabled={i === groups.length - 1}
                    title={T("keptDown", { name: g.name })}
                    aria-label={T("keptDown", { name: g.name })}
                    onClick={() => move(g, 1)}
                  >
                    <ArrowDown className="size-4" strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ob-icon-btn ob-icon-btn--quiet ob-icon-btn--danger"
                    data-focus="delete"
                    data-testid="group-delete"
                    title={T("keptDelete", { name: g.name })}
                    aria-label={T("keptDelete", { name: g.name })}
                    onClick={() => {
                      setAsking(g.id);
                      focus(g.id, "keep");
                    }}
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ob-kept-intro">{T("keptIntro")}</p>
      )}
      {suggested.length ? (
        <div className="ob-kept-tags">
          {suggested.map((name) => (
            <button
              key={name}
              type="button"
              className="ob-kept-chip ob-kept-chip--new"
              data-testid="group-suggest"
              aria-label={T("keptSuggestAdd", { name })}
              onClick={() => {
                const next = addGroup(useKept.getState().groups, name, crypto.randomUUID(), Date.now());
                if (typeof next !== "string") void setGroups(next);
              }}
            >
              <Plus strokeWidth={2} aria-hidden />
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <NewGroup />
    </div>
  );
}
