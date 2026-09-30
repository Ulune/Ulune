import { Fragment, type ReactNode } from "react";

/** Names that read wrong split over two lines (at a hyphen or a space): each is kept on one line. */
const WHOLE = /AES-256-GCM|tz-lookup|geo-tz|GNU AGPL(?: 3\.0)?/g;

/** A text with those names wrapped so that no line breaks inside them. */
export function keepWhole(text: string, key: string | number = "w"): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(WHOLE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <span key={`n${at}`} className="whitespace-nowrap">
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return <Fragment key={key}>{out.map((part, i) => (typeof part === "string" ? <Fragment key={`t${i}`}>{part}</Fragment> : part))}</Fragment>;
}
