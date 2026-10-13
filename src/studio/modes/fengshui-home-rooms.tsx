import { useEffect, useId, useState } from "react";
import { cnWord } from "@/lib/chinese/words";
import { DIRECTIONS } from "@/lib/chinese/fengshui";
import { ROOMS_MAX, ROOM_KINDS, roomsIn, type RoomKind } from "@/lib/chinese/fengshui-rooms";
import { roomName } from "@/lib/chinese/fengshui-rooms-reading";
import type { PalaceId } from "@/lib/chinese/fengshui-stars";
import { fssPalaceRef, palaceName, planRows } from "@/lib/chinese/fengshui-stars-reading";
import { openSpaceSheet, useSpace } from "@/lib/space/state";
import { useI18n } from "@/lib/i18n/locale";
import { previewProps } from "@/lib/depth/preview-bus";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useHomeInput } from "@/studio/modes/fengshui-home-state";
import { chooseHome, forgetThisHome, keepThisHome, loadHomes, roomForAnother, useHomes } from "@/studio/modes/fengshui-homes";

/*
 * Feng Shui's home page, part 26: the rooms, placed on the home's plan (its
 * front at the bottom, as the nine palaces are laid out by default), and the
 * home kept in the private space, or not.
 */

/** The nine squares of the home's plan, each with its rooms and a list to add one. */
export function RoomsCard() {
  const { locale } = useI18n();
  const w = useWheelView();
  const ctx = useModeData("fengshui-home")?.ctx;
  const rooms = useHomeInput((s) => s.rooms);
  const addRoom = useHomeInput((s) => s.addRoom);
  const removeRoom = useHomeInput((s) => s.removeRoom);
  const id = useId();
  if (!ctx) return null;
  const home = ctx.home;
  const full = rooms.length >= ROOMS_MAX;
  const short = (p: PalaceId) => (p === "c" ? cnWord(locale, "fssCentre") : DIRECTIONS.find((d) => d.id === p)!.short[locale === "fr" ? "fr" : "en"]);
  return (
    <section className="ulune-fsh-form ulune-fsr" data-testid="fengshui-rooms" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="ulune-fs-h">
        {cnWord(locale, "fsrHead")}
      </h2>
      {!home ? (
        <p className="ulune-fsh-small" data-testid="fengshui-rooms-need">
          {cnWord(locale, "fsrNeedFacing")}
        </p>
      ) : (
        <>
          <p className="ulune-fsh-small">{cnWord(locale, "fsrHint")}</p>
          <div className="ulune-fsr-grid" data-testid="fengshui-rooms-grid">
            {planRows(home.facingDirection)
              .flat()
              .map((p) => {
                const place = palaceName(p, locale);
                const here = roomsIn(rooms, p);
                const ref = ctx.stars ? fssPalaceRef("main", p) : null;
                return (
                  <div key={p} role="group" aria-label={place} className={cn("ulune-fsr-cell", p === home.facingDirection && "is-front", p === "c" && "is-centre")} data-palace={p} data-testid={`fengshui-rooms-${p}`}>
                    {ref ? (
                      <button type="button" className={cn("ulune-fsr-dir", w.selectedId === ref && "is-on")} data-testid={`fengshui-rooms-open-${p}`} onClick={() => w.choose(ref)} aria-label={place} {...previewProps(ref)}>
                        {short(p)}
                      </button>
                    ) : (
                      <span className="ulune-fsr-dir" aria-hidden>
                        {short(p)}
                      </span>
                    )}
                    {here.length ? (
                      <ul className="ulune-fsr-list">
                        {here.map((r) => (
                          <li key={r.id} className="ulune-fsr-chip">
                            <span>{roomName(r.kind, locale)}</span>
                            <button
                              type="button"
                              className="ulune-fsr-x"
                              data-testid={`fengshui-room-remove-${r.id}`}
                              data-kind={r.kind}
                              aria-label={cnWord(locale, "fsrRemove", { room: roomName(r.kind, locale).toLowerCase(), place: place.toLowerCase() })}
                              onClick={() => removeRoom(r.id)}
                            >
                              <span aria-hidden>×</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <select
                      className="ulune-fsr-add"
                      data-testid={`fengshui-rooms-add-${p}`}
                      aria-label={cnWord(locale, "fsrAddIn", { place })}
                      value=""
                      disabled={full}
                      onChange={(e) => {
                        const kind = e.target.value as RoomKind;
                        if (kind) addRoom(kind, p);
                      }}
                    >
                      <option value="">{cnWord(locale, "fsrAdd")}</option>
                      {ROOM_KINDS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {roomName(k.id, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
          </div>
          {full ? <p className="ulune-fsh-small is-warn">{cnWord(locale, "fsrFull")}</p> : null}
          {!ctx.stars && rooms.length ? <p className="ulune-fsh-small">{cnWord(locale, "fsrNoStars")}</p> : null}
        </>
      )}
    </section>
  );
}

/** Whether the home on the page is kept in the private space, the way to keep it, and the homes kept. */
export function KeepCard() {
  const { locale } = useI18n();
  const status = useSpace((s) => s.status);
  const homes = useHomes((s) => s.rec.homes);
  const ready = useHomes((s) => s.ready);
  const keptId = useHomeInput((s) => s.keptId);
  const name = useHomeInput((s) => s.name);
  const setName = useHomeInput((s) => s.setName);
  const empty = useHomeInput((s) => !s.typed.trim() && !s.year.trim() && s.rooms.length === 0);
  const [sure, setSure] = useState(false);
  const [forgotten, setForgotten] = useState(false);
  const id = useId();
  useEffect(() => {
    void loadHomes();
  }, [status]);
  useEffect(() => {
    setSure(false);
    if (keptId) setForgotten(false);
  }, [keptId]);
  const open = status === "open";
  const fallback = cnWord(locale, "fskDefault");
  const defaultName = homes.length ? `${fallback} ${homes.length + 1}` : fallback;
  return (
    <section className="ulune-fsh-form ulune-fsk" data-testid="fengshui-keep" data-kept={keptId ? "1" : undefined} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="ulune-fs-h">
        {cnWord(locale, "fskHead")}
      </h2>
      {open && ready && homes.length ? (
        <label className="ulune-fsh-field" htmlFor={`${id}-pick`}>
          <span className="ulune-fsh-label">{cnWord(locale, "fskPick")}</span>
          <select id={`${id}-pick`} className="ulune-fsk-pick" data-testid="fengshui-keep-pick" value={keptId ?? ""} onChange={(e) => void chooseHome(e.target.value || null)}>
            {homes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
            <option value="">{cnWord(locale, "fskNew")}</option>
          </select>
        </label>
      ) : null}
      {open && keptId ? (
        <>
          <label className="ulune-fsh-field" htmlFor={`${id}-name`}>
            <span className="ulune-fsh-label">{cnWord(locale, "fskName")}</span>
            <span className="ulune-fsh-input is-name">
              <input id={`${id}-name`} data-testid="fengshui-keep-name" type="text" autoComplete="off" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </span>
          </label>
          <p className="ulune-fsh-small" data-testid="fengshui-keep-status">
            {cnWord(locale, "fskKept")}
          </p>
          {sure ? (
            <div className="ulune-fsh-row">
              <button
                type="button"
                className="ulune-fsh-btn is-main"
                data-testid="fengshui-keep-forget-sure"
                onClick={() => {
                  setForgotten(true);
                  void forgetThisHome();
                }}
              >
                {cnWord(locale, "fskForgetSure")}
              </button>
              <button type="button" className="ulune-fsh-btn" onClick={() => setSure(false)}>
                {cnWord(locale, "fskCancel")}
              </button>
            </div>
          ) : (
            <div className="ulune-fsh-row">
              <button type="button" className="ulune-fsh-btn" data-testid="fengshui-keep-forget" onClick={() => setSure(true)}>
                {cnWord(locale, "fskForget")}
              </button>
            </div>
          )}
        </>
      ) : open ? (
        <>
          <div className="ulune-fsh-row">
            <button type="button" className="ulune-fsh-btn is-main" data-testid="fengshui-keep-save" disabled={empty || !ready || !roomForAnother()} onClick={() => void keepThisHome(defaultName)}>
              {cnWord(locale, "fskKeep")}
            </button>
          </div>
          <p className="ulune-fsh-small" data-testid="fengshui-keep-status" aria-live="polite">
            {cnWord(locale, forgotten ? "fskForgotten" : !roomForAnother() ? "fskFull" : empty ? "fskEmpty" : "fskNotKept")}
          </p>
        </>
      ) : (
        <p className="ulune-fsh-small" data-testid="fengshui-keep-status">
          {cnWord(locale, "fskNotKept")}{" "}
          {status === "none" || status === "locked" ? (
            <button type="button" className="ulune-fsk-link" data-testid="fengshui-keep-sign-in" onClick={() => openSpaceSheet(status === "locked" ? "unlock" : "create")}>
              {cnWord(locale, status === "locked" ? "fskUnlock" : "fskSignIn")}
            </button>
          ) : null}
        </p>
      )}
    </section>
  );
}
