import type { GrokReading, NatalChart } from "@/lib/chart/types";
import type { AppLocale } from "@/lib/i18n/messages";
import { AiCallError, callAi, type AiFailureKind } from "./call";
import { askSystem, askUser, defaultQuestion, fnv1a, modeQuestion, toProse, type AskInput } from "./ask-prompt";
import { composeSystem, composeUser, readingFromText } from "./compose-prompt";
import { hideWords, type Hidden } from "./scrub";
import type { AiProvider } from "./providers";
import { whenSpaceLocks } from "@/lib/space/state";

/*
 * The two things Ulune asks of the reader's AI, run from the reader's device:
 * the full natal reading and a question about one part of a chart. What goes
 * out is the chart's positions and the reading texts with names and places
 * replaced (lib/ai/scrub.ts); the answers stay in this tab, or in the private
 * space with their chart.
 */

export type AiAccount = { provider: AiProvider; apiKey: string };

export type AiOutcome<T> = { ok: true; value: T } | { ok: false; kind: AiFailureKind | "incomplete" | "blank" };

function failed<T>(err: unknown): AiOutcome<T> {
  return { ok: false, kind: err instanceof AiCallError ? err.kind : "provider" };
}

/** The whole natal reading. `dump` builds the positions-only summary (lib/chart/dump.ts). */
export async function composeNatalReading(opts: {
  chart: NatalChart;
  locale: AppLocale;
  account: AiAccount;
  dump: (chart: NatalChart, locale: AppLocale, compact: boolean) => string;
  hidden: readonly Hidden[];
  signal?: AbortSignal;
}): Promise<AiOutcome<GrokReading>> {
  const { chart, locale, account, hidden, signal } = opts;
  const system = composeSystem(locale, chart.meta.houseSystem);
  try {
    let text = await callAi(
      {
        provider: account.provider,
        apiKey: account.apiKey,
        system,
        user: hideWords(composeUser(opts.dump(chart, locale, false), locale, false), hidden),
        maxTokens: 4200,
        timeoutMs: 80_000,
      },
      signal,
    );
    let reading = readingFromText(text, locale);
    if (!reading) {
      // One shorter try: some answers run out before the last block.
      text = await callAi(
        {
          provider: account.provider,
          apiKey: account.apiKey,
          system,
          user: hideWords(composeUser(opts.dump(chart, locale, true), locale, true), hidden),
          maxTokens: 2800,
          timeoutMs: 55_000,
        },
        signal,
      );
      reading = readingFromText(text, locale);
    }
    return reading ? { ok: true, value: reading } : { ok: false, kind: "incomplete" };
  } catch (err) {
    return failed(err);
  }
}

const answers = new Map<string, string>();
whenSpaceLocks(() => answers.clear());

/** A question about one reading (or a mode's summary). Answers are kept for this tab. */
export async function askAboutFocus(
  input: AskInput,
  account: AiAccount,
  hidden: readonly Hidden[],
  signal?: AbortSignal,
): Promise<AiOutcome<{ question: string; text: string }>> {
  const history = input.history ?? [];
  const typed = input.question.trim();
  const question =
    typed ||
    (input.focus.kind === "mode"
      ? modeQuestion(input.locale, input.mode)
      : defaultQuestion(input.locale, input.focus.title, history.length > 0));
  const out: AskInput = {
    ...input,
    dump: hideWords(input.dump, hidden),
    focus: {
      ...input.focus,
      title: hideWords(input.focus.title, hidden),
      kicker: hideWords(input.focus.kicker, hidden),
      paragraphs: input.focus.paragraphs.map((p) => hideWords(p, hidden)),
    },
    history: history.map((turn) => ({ q: hideWords(turn.q, hidden), a: hideWords(turn.a, hidden) })),
  };
  const asked = hideWords(question, hidden);
  const key = [
    account.provider,
    input.mode ?? "natal",
    input.houseSystem ?? "",
    input.focus.id,
    fnv1a(out.focus.paragraphs.join("|")),
    fnv1a(out.dump),
    asked,
    input.locale,
    fnv1a(history.map((t) => `${t.q}\u0000${t.a}`).join("\u0001")),
  ].join("|");
  const hit = answers.get(key);
  if (hit) return { ok: true, value: { question, text: hit } };
  try {
    const raw = await callAi(
      {
        provider: account.provider,
        apiKey: account.apiKey,
        system: askSystem(input.locale, input.mode, input.houseSystem),
        user: askUser(out, asked),
        maxTokens: 900,
        timeoutMs: 28_000,
      },
      signal,
    );
    const text = toProse(raw);
    if (!text) return { ok: false, kind: "blank" };
    answers.set(key, text);
    if (answers.size > 80) {
      const first = answers.keys().next().value;
      if (first) answers.delete(first);
    }
    return { ok: true, value: { question, text } };
  } catch (err) {
    return failed(err);
  }
}

