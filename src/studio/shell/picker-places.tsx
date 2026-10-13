import { Check, House, Lock } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { homeLine } from "@/lib/chinese/fengshui-home-line";
import { useI18n } from "@/lib/i18n/locale";
import { placeWord } from "@/lib/i18n/places-words";
import { openSpaceSheet, useSpace } from "@/lib/space/state";
import { cn } from "@/lib/utils";
import { languageOf } from "@/studio/map";
import { openKeptHome, readHomeList, useHomeList } from "@/studio/modes/fengshui-home-list";
import { preloadMode } from "@/studio/modes/registry";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import "./picker-places.css";

/*
 * The chart switcher's homes (reorganisation plan, R9: "People and places"),
 * fetched by ChartPicker.tsx at idle once a private space exists, or when the
 * switcher opens. Under the charts, a second headed group: the homes kept in
 * the open space, each with a house icon, its name and its facing in a few
 * words, the one open on Feng Shui's Home page marked. Choosing one opens it
 * there; the chart stays as it is, and a home is never offered as a person
 * (no edit, remove or pair: forgetting one stays on the Home page). With the
 * space locked, and only on Feng Shui's pages, the way to unlock them.
 */

/** What the switcher shows under its charts: the homes, the way to unlock them, or nothing. */
function usePlaces(): "homes" | "locked" | null {
  const status = useSpace((s) => s.status);
  const page = useStudioStore((s) => s.page);
  const any = useHomeList((s) => s.homes.length > 0);
  if (status === "open") return any ? "homes" : null;
  return status === "locked" && languageOf(page) === "feng-shui" ? "locked" : null;
}

// Read as soon as this code arrives (ChartPicker.tsx fetches it at idle), so the switcher opens with its homes.
void readHomeList();

/**
 * "People", over the charts, while the homes are under them (two headed
 * groups). Only if they were there as the switcher opened: the charts never
 * move under the pointer.
 */
export function PeopleHead() {
  const { locale } = useI18n();
  const shown = usePlaces() != null;
  const [atOpen] = useState(shown);
  return atOpen && shown ? (
    <p className="ob-picker-head" data-testid="picker-people-head">
      {placeWord(locale, "placesPeople")}
    </p>
  ) : null;
}

export function PickerPlaces({ go, onClose }: { go: (page: StudioPage) => void; onClose: () => void }) {
  const { locale } = useI18n();
  const places = usePlaces();
  const homes = useHomeList((s) => s.homes);
  const keptId = useHomeList((s) => s.keptId);
  const onHomePage = useStudioStore((s) => s.page === "fengshui-home");
  const [busy, setBusy] = useState<string | null>(null);
  const headId = useId();
  useEffect(() => {
    void readHomeList();
  }, []);
  if (!places) return null;
  // The home page's code, ahead of the choice (pointed at, or focused).
  const ahead = () => preloadMode("fengshui-home");
  const choose = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try {
      if (await openKeptHome(id)) go("fengshui-home");
    } finally {
      setBusy(null);
      onClose();
    }
  };
  return (
    <div role="group" aria-labelledby={headId} className="ob-picker-places" data-testid="picker-homes">
      <p id={headId} className="ob-picker-head">
        {placeWord(locale, "placesHomes")}
      </p>
      {places === "locked" ? (
        <button
          type="button"
          className="ob-picker-name ob-picker-home ob-picker-unlock"
          data-testid="picker-homes-unlock"
          onClick={() => {
            onClose();
            openSpaceSheet("unlock");
          }}
        >
          <Lock className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="ob-picker-home-text">{placeWord(locale, "placesLocked")}</span>
        </button>
      ) : (
        <ul className="ob-picker-list ob-picker-homes">
          {homes.map((h) => {
            const on = onHomePage && keptId === h.id;
            const line = homeLine(h, locale);
            return (
              <li key={h.id} data-testid="home-row" data-name={h.name} data-id={h.id} className="ob-picker-row">
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  aria-busy={busy === h.id || undefined}
                  className={cn("ob-picker-name ob-picker-home", on && "is-on")}
                  onPointerEnter={ahead}
                  onFocus={ahead}
                  onClick={() => void choose(h.id)}
                >
                  <House className="size-4" strokeWidth={1.75} aria-hidden />
                  <span className="ob-picker-home-text">
                    <span className="truncate">{h.name}</span>
                    {line ? <span className="ob-picker-meta">{line}</span> : null}
                  </span>
                  {on ? <Check className="ob-picker-home-on size-4" strokeWidth={1.75} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
