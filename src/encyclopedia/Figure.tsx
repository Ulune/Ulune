import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { lazyNamed } from "@/lib/lazy-component";
import type { Figure as FigureData, Lang } from "./types";

/*
 * An entry's figure (encyclopedia plan, part 19): drawn at build time from
 * the charts' own numbers (scripts/encyclopedia/figures.mjs) and sent as SVG
 * with the page, so it costs no code and reads without JavaScript; its
 * colours are the theme's and the reader's (encyclopedia.css). The caption
 * under it is its text twin. An aspect's figure becomes a dial the reader
 * turns through the orb, once its own small download is here.
 */

const Dial = lazyNamed(() => import("./AspectDial"), "AspectDial");

class Quiet extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Panels({ figure }: { figure: FigureData }) {
  return (
    <div className="ob-enc-figure-panels">
      {figure.panels.map((p, i) => (
        <div
          key={i}
          className="ob-enc-figure-panel"
          style={{ width: Math.round(p.w * (p.scale ?? 1)) }}
          // Built by the encyclopedia's build from its own numbers, its words escaped there.
          dangerouslySetInnerHTML={{ __html: p.svg }}
        />
      ))}
    </div>
  );
}

export function Figure({ figure, lang }: { figure: FigureData; lang: Lang }) {
  const [live, setLive] = useState(false);
  useEffect(() => setLive(Boolean(figure.interactive)), [figure.interactive]);
  const still = <Panels figure={figure} />;
  return (
    <figure className="ob-enc-figure" data-testid="enc-figure">
      {live && figure.interactive ? (
        <Quiet fallback={still}>
          <Suspense fallback={still}>
            <Dial angle={figure.interactive.angle} orb={figure.interactive.orb} lang={lang} />
          </Suspense>
        </Quiet>
      ) : (
        still
      )}
      <figcaption className="ob-enc-figure-caption">{figure.caption}</figcaption>
    </figure>
  );
}
