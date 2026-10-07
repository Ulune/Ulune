import { useRouter } from "@tanstack/react-router";
import { useRef, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type SyntheticEvent } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { importWithRetry } from "@/lib/lazy-retry";
import type { TermOpts } from "./term-card";
import type { Lang } from "./types";
import "./term.css";

/*
 * A word that has an entry in the encyclopedia (encyclopedia plan, part 2):
 * a real link to its page, marked as the reader chose in Settings (a fine
 * dotted underline by default; html[data-term-links]). On a computer a click
 * opens the page, and the pointer resting on the word or the keyboard's focus
 * shows its short card; on a phone a tap shows the card as a small sheet,
 * with "Read the full page". An entry with no page yet is a button that shows
 * its card. Everything but the link itself (the card, its texts, the index)
 * is downloaded the first time a word is pointed at, focused or tapped.
 */

type CardModule = typeof import("./term-card");
let loaded: CardModule | null = null;
const card = () => importWithRetry(() => import("./term-card")).then((m) => (loaded = m));
const BASE: Record<Lang, string> = { en: "/encyclopedia/", fr: "/encyclopedie/" };

export function Term({
  id,
  children,
  lang,
  slug,
}: {
  id: string;
  children: ReactNode;
  /** The language of the card and the page (the reader's by default). */
  lang?: Lang;
  /** Its address in that language when known; null: a card only, no page; left out: found from the id. */
  slug?: string | null;
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const touch = useRef(false);
  const l = lang ?? locale;
  const go = (href: string) => void router.navigate({ href });
  const withCard = (e: SyntheticEvent<HTMLElement>, fn: (m: CardModule, o: TermOpts) => void) => {
    const o: TermOpts = { el: e.currentTarget, id, lang: l, slug, go };
    void card().then((m) => fn(m, o));
  };
  const props = {
    className: "ob-term",
    "data-term": id,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      touch.current = e.pointerType !== "mouse";
    },
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") withCard(e, (m, o) => m.hover(o));
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") loaded?.leave();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(":focus-visible")) withCard(e, (m, o) => m.focus(o));
    },
    onBlur: () => loaded?.blur(),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      touch.current = false;
      if (e.key === "Escape") loaded?.close();
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      // A new tab or window: the browser's own way.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const tapped = touch.current;
      if (!tapped && slug) {
        loaded?.close();
        go(BASE[l] + slug);
      } else withCard(e, (m, o) => (tapped ? m.sheet(o) : m.follow(o)));
    },
  };
  if (slug === null) {
    return (
      <button type="button" {...props}>
        {children}
      </button>
    );
  }
  return (
    <a href={BASE[l] + (slug ?? id)} {...props}>
      {children}
    </a>
  );
}
