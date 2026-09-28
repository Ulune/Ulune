import type { KeyboardEvent } from "react";

/**
 * The arrow keys along a tablist (Home and End to either end), as the ARIA
 * tabs pattern has it: only the chosen tab is in the Tab order, and the arrows
 * move between the others. With `activate`, the tab reached is chosen at once
 * (quick switches: the panel's tabs, a table's sections); otherwise Enter or
 * Space chooses it (the modes, which load).
 */
export function onTablistKeyDown(e: KeyboardEvent<HTMLElement>, activate = false): void {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const list = e.currentTarget;
  const vertical = list.getAttribute("aria-orientation") === "vertical";
  const back = vertical ? "ArrowUp" : "ArrowLeft";
  const on = vertical ? "ArrowDown" : "ArrowRight";
  if (e.key !== back && e.key !== on && e.key !== "Home" && e.key !== "End") return;
  const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')].filter(
    (tab) =>
      tab.closest('[role="tablist"]') === list &&
      !tab.hasAttribute("disabled") &&
      tab.getAttribute("aria-disabled") !== "true" &&
      tab.getClientRects().length > 0,
  );
  const at = tabs.indexOf(document.activeElement as HTMLElement);
  if (!tabs.length || at < 0) return;
  const next =
    e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : e.key === on ? (at + 1) % tabs.length : (at - 1 + tabs.length) % tabs.length;
  e.preventDefault();
  tabs[next].focus();
  if (activate && tabs[next].getAttribute("aria-selected") !== "true") tabs[next].click();
}
