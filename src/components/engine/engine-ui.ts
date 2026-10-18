/**
 * The calculations on the device, as the reader sees them (on-device plan, step 5): the first
 * chart's one-time download, quietly, at the foot of the screen; and, when this device can't
 * calculate, the question: calculate this one on Ulune's server (once, or from now on), or not.
 * Their own small download, fetched by the "calculate" door (lib/engine/door.ts) only when one
 * of them shows, and drawn at the end of the page so any page can show them (the studio, a
 * shared chart's arrival on /s). Their state: lib/engine/status.ts.
 *
 * Drawn with the page's own elements rather than React: a React root of their own would bring
 * React's client renderer for new roots into every page's first load (the app itself only
 * hydrates), for two small notices.
 */
import { engineWords } from "@/lib/i18n/catalog/engine-words";
import { engineNotice, onEngineNotice, type EngineNotice, type ServerAnswer } from "@/lib/engine/status";
import "./engine-ui.css";

type WordKey = keyof typeof engineWords;
/** The page's language, as the app sets it on <html>. */
const french = () => document.documentElement.lang === "fr";
const word = (key: WordKey) => engineWords[key][french() ? 1 : 0];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string>, ...children: Node[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

/** Why the device can't, in a line. */
function whyKey(why: string): WordKey {
  if (why === "E:engine.unsupported") return "engineWhyUnsupported";
  if (why === "E:engine.timeout") return "engineWhySlow";
  return "engineWhyFiles";
}

let host: HTMLDivElement | null = null;

/** The download, shown once it has taken a moment (a quick one never flashes). */
type Download = { root: HTMLDivElement; text: HTMLParagraphElement; bar: HTMLDivElement; fill: HTMLSpanElement; pct: HTMLSpanElement };
let download: Download | null = null;
let soon: number | null = null;

function makeDownload(): Download {
  const text = el("p", { class: "ob-engine-download-text", role: "status" });
  const fill = el("span", {});
  const bar = el("div", { class: "ob-engine-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" }, fill);
  const pct = el("span", { class: "ob-engine-pct", "aria-hidden": "true", "data-testid": "engine-download-pct" });
  return { root: el("div", { class: "ob-engine-download", "data-testid": "engine-download" }, text, bar, pct), text, bar, fill, pct };
}

function drawDownload(progress: EngineNotice["progress"]) {
  if (!progress) {
    if (soon != null) window.clearTimeout(soon);
    soon = null;
    download?.root.remove();
    download = null;
    return;
  }
  if (!download) {
    soon ??= window.setTimeout(() => {
      soon = null;
      download = makeDownload();
      host?.append(download.root);
      draw();
    }, 300);
    return;
  }
  const pct = Math.max(0, Math.min(99, Math.floor((progress.loaded / Math.max(1, progress.total)) * 100)));
  download.text.textContent = word("engineSetup");
  download.bar.setAttribute("aria-label", word("engineSetupLabel"));
  download.bar.setAttribute("aria-valuenow", String(pct));
  download.fill.style.width = `${pct}%`;
  download.pct.textContent = new Intl.NumberFormat(french() ? "fr-FR" : "en-GB", { style: "percent" }).format(pct / 100);
}

/** This device can't calculate: the question, until it is answered. */
type Question = { scrim: HTMLDivElement; why: string; before: Element | null; first: HTMLButtonElement; words(): void };
let question: Question | null = null;
let asked = 0;

function makeQuestion(why: string): Question {
  asked += 1;
  const titleId = `ob-engine-ask-title-${asked}`;
  const bodyId = `ob-engine-ask-body-${asked}`;
  // The answer goes to the question on screen now.
  const answer = (a: ServerAnswer) => engineNotice().question?.answer(a);
  const button = (testId: string, kind: string, a: ServerAnswer) => {
    const b = el("button", { type: "button", class: `ob-btn ob-btn--${kind}`, "data-testid": testId });
    b.addEventListener("click", () => answer(a));
    return b;
  };
  const title = el("h2", { id: titleId, class: "ob-engine-ask-title" });
  const body = el("p", { id: bodyId, class: "ob-engine-ask-body" });
  const once = button("engine-once", "primary", "once");
  const always = button("engine-always", "ghost", "always");
  const cancel = button("engine-cancel", "ghost", "cancel");
  const note = el("p", { class: "ob-engine-ask-note" });
  const card = el(
    "section",
    { class: "ob-engine-ask", role: "alertdialog", "aria-modal": "true", "aria-labelledby": titleId, "aria-describedby": bodyId, "data-testid": "engine-ask", "data-why": why },
    title,
    body,
    el("div", { class: "ob-engine-ask-actions" }, once, always, cancel),
    note,
  );
  // Escape is Cancel; Tab stays within the card while it asks.
  card.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      answer("cancel");
      return;
    }
    if (e.key !== "Tab") return;
    const buttons = [once, always, cancel];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.shiftKey ? (at <= 0 ? buttons.length - 1 : at - 1) : at === buttons.length - 1 ? 0 : at + 1;
    e.preventDefault();
    buttons[next].focus();
  });
  const words = () => {
    title.textContent = word("engineCantTitle");
    body.textContent = `${word(whyKey(why))} ${word("engineCantBody")}`;
    once.textContent = word("engineOnce");
    always.textContent = word("engineAlways");
    cancel.textContent = word("engineCancel");
    note.textContent = word("engineCantNote");
  };
  const scrim = el("div", { class: "ob-engine-scrim", "data-testid": "engine-ask-scrim" }, card);
  // A press beside the card keeps the focus in it (the question waits for an answer).
  scrim.addEventListener("mousedown", (e) => {
    if (e.target === scrim) e.preventDefault();
  });
  return { scrim, why, before: document.activeElement, first: once, words };
}

function drawQuestion(asking: EngineNotice["question"]) {
  if (question && question.why !== asking?.why) {
    // Answered (or another question): the focus goes back where it was.
    const { scrim, before } = question;
    question = null;
    scrim.remove();
    if (before instanceof HTMLElement && before.isConnected) before.focus();
  }
  if (!asking) return;
  if (question) {
    question.words();
    return;
  }
  question = makeQuestion(asking.why);
  question.words();
  host?.append(question.scrim);
  // The focus goes to the first answer.
  question.first.focus();
}

function draw() {
  const notice = engineNotice();
  drawDownload(notice.question ? null : notice.progress);
  drawQuestion(notice.question);
}

/** Draw the engine's notices at the end of the page, and keep them drawn (once). */
export function mountEngineUi(): void {
  if (host || typeof document === "undefined") return;
  host = el("div", { class: "ob-engine", "data-testid": "engine-notices" });
  document.body.append(host);
  onEngineNotice(draw);
  // The language changed: their words too.
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  draw();
}
