/*
 * The short card of a word linked to the encyclopedia (Term.tsx), downloaded
 * the first time a word is pointed at, focused or tapped. One card at a
 * time, drawn with the DOM alone so it can open over any page (the studio
 * included) without a React root of its own:
 *   - on a computer, after the pointer rests on the word a moment, or at once
 *     when the keyboard focuses it; it stays while the pointer is on the word
 *     or the card, and closes when the pointer leaves, with Escape, or when
 *     the focus moves on;
 *   - on a phone, a tap opens it as a small sheet at the bottom, with "Read
 *     the full page" when the entry has one; a tap outside, the close
 *     button or Escape closes it.
 * It says the entry's name, glyph, tradition and one-sentence summary.
 */
import { popoverPlacement } from "@/lib/popover-place";
import { ENC_BASE, loadCards, loadIndex, termPath, termRow } from "./data";
import type { Lang } from "./types";
import { tr } from "./words";
import "./term-card.css";

export type TermOpts = {
  el: HTMLElement;
  id: string;
  lang: Lang;
  /** Its address when the page knew it; null: a card only. */
  slug?: string | null;
  /** Moves the app to an address (the router's own navigation). */
  go: (href: string) => void;
};

type Entry = { title: string; summary: string; glyph: string; tradition: string; href: string | null; lang: Lang };
type Mode = "hover" | "focus" | "pinned" | "sheet";
type Shown = { el: HTMLElement; mode: Mode; box: HTMLElement; done: () => void };

/** How long the pointer rests on a word before its card opens, and lingers after leaving it. */
const OPEN_MS = 350;
const CLOSE_MS = 150;

let shown: Shown | null = null;
let openTimer = 0;
let closeTimer = 0;
/** Each request to show a card; an older one still loading is dropped. */
let ticket = 0;

async function entryOf(id: string, lang: Lang): Promise<Entry | null> {
  const index = await loadIndex();
  const row = termRow(index.terms, id);
  if (!row) return null;
  const texts = await loadCards(lang, row[0]);
  const [title, summary] = texts[id] ?? [id, ""];
  const tradition = index.traditions.find((t) => t.id === row[0])?.name[lang] ?? "";
  return { title, summary, glyph: row[5], tradition, href: termPath(row, lang), lang };
}

/** The pointer rests on a word: its card, after a moment. */
export function hover(o: TermOpts): void {
  window.clearTimeout(closeTimer);
  if (shown?.el === o.el) return;
  window.clearTimeout(openTimer);
  const t = ++ticket;
  openTimer = window.setTimeout(() => void show(o, t, "hover"), OPEN_MS);
}

/** The pointer leaves the word: a hover card closes, unless the pointer goes onto it. */
export function leave(): void {
  window.clearTimeout(openTimer);
  if (shown?.mode === "hover") closeSoon();
}

/** The keyboard reaches a word: its card at once. */
export function focus(o: TermOpts): void {
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
  void show(o, ++ticket, "focus");
}

/** The focus leaves the word. */
export function blur(): void {
  if (shown?.mode === "focus" || shown?.mode === "pinned") close();
}

/** A click on a computer: the page when there is one, else the card, kept open. */
export async function follow(o: TermOpts): Promise<void> {
  const t = ++ticket;
  window.clearTimeout(openTimer);
  const e = await entryOf(o.id, o.lang).catch(() => null);
  if (t !== ticket) return;
  if (!e) {
    // The index could not be read (offline): the address the link names.
    if (o.slug !== null) o.go(ENC_BASE[o.lang] + "/" + (o.slug ?? o.id));
    return;
  }
  if (e.href) {
    close();
    o.go(e.href);
  } else void show(o, t, "pinned", e);
}

/** A tap on a phone: the card as a sheet. */
export function sheet(o: TermOpts): void {
  window.clearTimeout(openTimer);
  void show(o, ++ticket, "sheet");
}

function closeSoon(): void {
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(close, CLOSE_MS);
}

/** Close whatever card is open; a sheet gives the focus back to its word. */
export function close(): void {
  window.clearTimeout(closeTimer);
  window.clearTimeout(openTimer);
  if (!shown) return;
  const { el, mode, done } = shown;
  shown = null;
  done();
  if (mode === "sheet" && el.isConnected) el.focus({ preventScroll: true });
}

async function show(o: TermOpts, t: number, mode: Mode, known?: Entry): Promise<void> {
  const e = known ?? (await entryOf(o.id, o.lang).catch(() => null));
  if (t !== ticket || !e || !o.el.isConnected) return;
  // The pointer or the focus has moved on while the card was coming.
  if (mode === "hover" && !o.el.matches(":hover")) return;
  if (mode === "focus" && document.activeElement !== o.el) return;
  close();
  const box = build(e, o, mode);
  const cleanups: (() => void)[] = [];
  const listen = <K extends keyof WindowEventMap>(type: K, fn: (ev: WindowEventMap[K]) => void, capture = false) => {
    window.addEventListener(type, fn, capture);
    cleanups.push(() => window.removeEventListener(type, fn, capture));
  };
  let scrim: HTMLElement | null = null;
  if (mode === "sheet") {
    scrim = document.createElement("div");
    scrim.className = "ob-term-scrim";
    scrim.addEventListener("click", close);
    document.body.append(scrim);
  }
  document.body.append(box);
  if (mode === "sheet") {
    box.focus({ preventScroll: true });
  } else {
    place(box, o.el);
    o.el.setAttribute("aria-describedby", `${box.id}-text`);
    // A press on the card keeps the focus on the word, so the card it opened stays.
    box.addEventListener("mousedown", (ev) => ev.preventDefault());
    box.addEventListener("pointerenter", () => window.clearTimeout(closeTimer));
    box.addEventListener("pointerleave", () => {
      if (shown?.mode === "hover") closeSoon();
    });
    // The page moves under a card: it would point at nothing.
    listen("scroll", close, true);
    listen("resize", close);
  }
  listen("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      close();
    }
  }, true);
  if (mode === "pinned") {
    listen("pointerdown", (ev) => {
      const target = ev.target as Node | null;
      if (target && !box.contains(target) && !o.el.contains(target)) close();
    }, true);
  }
  // The word gone (the page changed under the card): the card goes too.
  const watch = window.setInterval(() => {
    if (!o.el.isConnected) close();
  }, 400);
  shown = {
    el: o.el,
    mode,
    box,
    done: () => {
      window.clearInterval(watch);
      for (const c of cleanups) c();
      if (o.el.getAttribute("aria-describedby") === `${box.id}-text`) o.el.removeAttribute("aria-describedby");
      box.remove();
      scrim?.remove();
    },
  };
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function build(e: Entry, o: TermOpts, mode: Mode): HTMLElement {
  const t = (key: Parameters<typeof tr>[1]) => tr(e.lang, key);
  const isSheet = mode === "sheet";
  const box = node("div", isSheet ? "ob-term-card ob-term-sheet" : "ob-term-card");
  box.id = isSheet ? "ob-term-sheet" : "ob-term-card";
  box.lang = e.lang;
  box.setAttribute("data-testid", isSheet ? "term-sheet" : "term-card");
  const head = node("div", "ob-term-card-head");
  if (e.glyph) {
    const glyph = node("span", "ob-term-card-glyph", e.glyph);
    glyph.setAttribute("aria-hidden", "true");
    head.append(glyph);
  }
  const name = node(isSheet ? "h2" : "p", "ob-term-card-name", e.title);
  name.id = `${box.id}-name`;
  head.append(name, node("span", "ob-term-card-tag", e.tradition));
  const summary = node("p", "ob-term-card-summary", e.summary);
  summary.id = `${box.id}-text`;
  box.append(head, summary);
  if (e.href) {
    const href = e.href;
    const read = node("a", "ob-term-card-read", t("encReadFull"));
    read.href = href;
    read.setAttribute("data-testid", "term-read");
    // On a computer the word itself goes to the page: the card's link is for the pointer only.
    if (!isSheet) read.tabIndex = -1;
    read.addEventListener("click", (ev) => {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      close();
      o.go(href);
    });
    box.append(read);
  }
  if (isSheet) {
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", name.id);
    box.setAttribute("aria-describedby", summary.id);
    box.tabIndex = -1;
    const shut = node("button", "ob-term-close", "×");
    shut.type = "button";
    shut.setAttribute("aria-label", t("encClose"));
    shut.setAttribute("data-testid", "term-close");
    shut.addEventListener("click", close);
    box.append(shut);
    // The keyboard stays in the sheet while it is open.
    box.addEventListener("keydown", (ev) => {
      if (ev.key !== "Tab") return;
      const items = [...box.querySelectorAll<HTMLElement>("a[href], button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (ev.shiftKey && (document.activeElement === first || document.activeElement === box)) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    });
  }
  return box;
}

/** Under the word (its first line), or over it when there is more room there. */
function place(box: HTMLElement, el: HTMLElement): void {
  const rect = el.getClientRects()[0] ?? el.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 16);
  box.style.width = `${width}px`;
  const p = popoverPlacement(rect, { width, height: box.offsetHeight });
  box.style.left = `${p.left}px`;
  box.style.top = `${p.top}px`;
  box.style.maxHeight = `${p.maxHeight}px`;
}
