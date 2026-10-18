/*
 * A request for someone's chart (share and compare plan, idea B4): what the
 * link "Ask someone for their chart" holds, packed into a few bytes before
 * it is sealed like a share link (lib/share/link.ts, a typed link). It opens
 * Ulune's birth form for the person who receives it; once they have cast
 * their chart, "Send it back" makes the ordinary share link for the asker.
 *
 * It holds no birth at all, only: that it is a request (the typed link's
 * type, REQUEST_TYPE), the asker's first name if the asker chose to give it
 * (none by default), the asker's interface language, and the page their
 * chart should open on (none for the birth chart).
 *
 * Packed (after the type byte), big-endian:
 *   flags  1 byte: a first name follows (bit 0), a page follows (bit 1),
 *          the other six bits 0
 *   lang   1 byte: the asker's interface language, 0 English, 1 French
 *          (codes append only: one this version does not know is left out,
 *          and the reader's own language is used)
 *   page   1 byte, when flagged: the page's code, as share links number
 *          them (format.ts, PAGE_CODES); one this version does not know
 *          opens the birth chart
 *   name   when flagged: the first name, its UTF-8 length in a byte, then
 *          its bytes, cleaned as share links clean names
 *
 * Read strictly: the reserved bits, every length and the end are checked,
 * the name cleaned again; a page that needs two people (a Relationship
 * page) or a place (Feng Shui's Home), or the Calendar, opens its
 * language's birth chart instead, as the asker's sheet already chose.
 */
import { languageOf, lensOf, pagesOf } from "@/studio/map";
import type { StudioPage } from "@/studio/url";
import { ByteReader, ByteWriter, ShareLinkError } from "./bytes";
import { PAGE_CODES, cleanText } from "./format";

/** The typed link's type for a request (lib/share/link.ts): types never change and are never reused. */
export const REQUEST_TYPE = 1;

/** The longest first name a request carries (characters). */
export const ASKER_MAX = 40;

/** Interface languages by code: append only. */
const LANGS = ["en", "fr"] as const;
export type RequestLang = (typeof LANGS)[number];

const FLAG = { name: 1 << 0, page: 1 << 1 } as const;
const RESERVED = 0xff & ~(FLAG.name | FLAG.page);

export type ChartRequest = {
  /** The asker's first name, when they chose to give it. */
  asker?: string;
  /** The asker's interface language, which the recipient's page uses unless they chose one. */
  lang?: RequestLang;
  /** The page the recipient's chart opens on, when not the birth chart. */
  page?: StudioPage;
};

/**
 * The page a request opens: one person's page. A Relationship page needs
 * two people and Feng Shui's Home a place, so either opens its language's
 * birth chart; the Calendar is no person's chart, so astrology's.
 */
export function requestPage(page: StudioPage): StudioPage {
  if (page === "timing") return "natal";
  const lens = lensOf(page);
  if (lens === "relationship" || lens === "home") {
    const lang = languageOf(page);
    return (lang && pagesOf(lang, "natal")[0]) || "natal";
  }
  return page;
}

/** A request packed, without its type byte (the sheet's side). */
export function packRequest(request: ChartRequest): Uint8Array<ArrayBuffer> {
  const w = new ByteWriter();
  const name = cleanText(request.asker ?? "", ASKER_MAX);
  const page = request.page ? requestPage(request.page) : "natal";
  let flags = 0;
  if (name) flags |= FLAG.name;
  if (page !== "natal") flags |= FLAG.page;
  w.u8(flags);
  w.u8(Math.max(0, LANGS.indexOf(request.lang ?? "en")));
  if (page !== "natal") w.u8(PAGE_CODES[page]);
  if (name) w.text(name);
  return w.done();
}

/** A request read back (the /s page's side), without its type byte; throws ShareLinkError. */
export function unpackRequest(bytes: Uint8Array): ChartRequest {
  const r = new ByteReader(bytes);
  const flags = r.u8();
  if (flags & RESERVED) throw new ShareLinkError("reserved");
  const out: ChartRequest = {};
  const lang = LANGS[r.u8()];
  if (lang) out.lang = lang;
  if (flags & FLAG.page) {
    const code = r.u8();
    // Codes are six bits, as in a share link's head.
    if (code > 63) throw new ShareLinkError("reserved");
    for (const [page, c] of Object.entries(PAGE_CODES) as [StudioPage, number][]) {
      if (c !== code) continue;
      const shown = requestPage(page);
      if (shown !== "natal") out.page = shown;
    }
  }
  if (flags & FLAG.name) {
    const name = cleanText(r.text(), ASKER_MAX);
    if (name) out.asker = name;
  }
  r.end();
  return out;
}
