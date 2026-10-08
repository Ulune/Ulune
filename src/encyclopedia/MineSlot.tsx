import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { lazyNamed } from "@/lib/lazy-component";
import { onYourCharts, yourCharts } from "./your-chart";
import type { Lang, PageData } from "./types";

/*
 * Where "In your chart" goes (encyclopedia plan, part 18): nothing on the
 * server and nothing for a reader with no chart in this tab, not even a
 * download; with one, its own small download (InYourChart.tsx). A failure
 * there leaves the page as it is.
 */

const Part = lazyNamed(() => import("./InYourChart"), "InYourChartPart");
const Index = lazyNamed(() => import("./InYourChart"), "YourPages");
const PageKeep = lazyNamed(() => import("./Keep"), "PageKeep");
const Shelf = lazyNamed(() => import("./Keep"), "Shelf");

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useHasChart(): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    const update = () => setHas(Boolean(yourCharts()));
    update();
    return onYourCharts(update);
  }, []);
  return has;
}

export function MineSlot({ page }: { page: PageData }) {
  const has = useHasChart();
  if (!has) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Part page={page} />
      </Suspense>
    </Quiet>
  );
}

export function MineIndexSlot({ lang, tradition }: { lang: Lang; tradition?: string }) {
  const has = useHasChart();
  if (!has) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Index lang={lang} tradition={tradition} />
      </Suspense>
    </Quiet>
  );
}

/** After the page is drawn (nothing of it on the server): the reader's bookmark and note (part 20). */
function useDrawn(): boolean {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => setDrawn(true), []);
  return drawn;
}

export function KeepSlot({ page }: { page: PageData }) {
  if (!useDrawn()) return <div className="ob-enc-keep-room" />;
  return (
    <Quiet>
      <Suspense fallback={<div className="ob-enc-keep-room" />}>
        <PageKeep page={page} />
      </Suspense>
    </Quiet>
  );
}

export function ShelfSlot({ lang }: { lang: Lang }) {
  if (!useDrawn()) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Shelf lang={lang} />
      </Suspense>
    </Quiet>
  );
}
