import { createContext, useContext } from "react";

/** The stage hosts the wheel's zoom bar (portalled from WheelZoom), in the figure's corner. */
export const ZoomSlotContext = createContext<HTMLElement | null>(null);

export function useZoomSlot(): HTMLElement | null {
  return useContext(ZoomSlotContext);
}

/** The stage footer hosts the wheel's aspect count strip (portalled from the wheel). */
export const AspectSlotContext = createContext<HTMLElement | null>(null);

export function useAspectSlot(): HTMLElement | null {
  return useContext(AspectSlotContext);
}

/** The stage's toolbar hosts the choice of rings (components/rings-menu.tsx). */
export const RingsSlotContext = createContext<HTMLElement | null>(null);

export function useRingsSlot(): HTMLElement | null {
  return useContext(RingsSlotContext);
}

/**
 * Room at the end of the Export menu, while it is open, for what only one
 * page saves (the Calendar's file, UI plan part 93): one menu for every way
 * out, not a button per page in the toolbar.
 */
export const ExportSlotContext = createContext<HTMLElement | null>(null);

export function useExportSlot(): HTMLElement | null {
  return useContext(ExportSlotContext);
}

/**
 * The phone's ⋯ menu (UI plan, part 96), while it is open: room at its top
 * for the rings' choices and, after Export, for 3D and the pointer tools,
 * which stand in the toolbar and the figure's corner on a computer.
 */
export type MoreSlots = { rings: HTMLElement | null; tools: HTMLElement | null; close: () => void };
export const MoreSlotsContext = createContext<MoreSlots>({ rings: null, tools: null, close: () => {} });

export function useMoreSlots(): MoreSlots {
  return useContext(MoreSlotsContext);
}

/**
 * The table's part links in the stage's toolbar (UI plan, part 97): the
 * sections follow the scroll from there instead of a bar of their own over
 * the table.
 */
export const TableTabsSlotContext = createContext<HTMLElement | null>(null);

export function useTableTabsSlot(): HTMLElement | null {
  return useContext(TableTabsSlotContext);
}
