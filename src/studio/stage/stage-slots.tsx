import { createContext, useContext } from "react";

/** The stage footer hosts the wheel's zoom bar (portalled from WheelZoom). */
export const ZoomSlotContext = createContext<HTMLElement | null>(null);

export function useZoomSlot(): HTMLElement | null {
  return useContext(ZoomSlotContext);
}

/** The stage footer hosts the wheel's aspect count strip (portalled from the wheel). */
export const AspectSlotContext = createContext<HTMLElement | null>(null);

export function useAspectSlot(): HTMLElement | null {
  return useContext(AspectSlotContext);
}
