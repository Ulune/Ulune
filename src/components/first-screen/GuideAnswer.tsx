import { useI18n } from "@/lib/i18n/locale";
import { guideWords } from "@/lib/i18n/catalog/guide-words";
import { Linked } from "./guide-linked";

export type QuestionId = "time" | "houses" | "name" | "year" | "count" | "free" | "kept" | "trust" | "ai";

/** Each question's answer, in the guide's book of words (guide-words.ts). */
const ANSWER: Record<QuestionId, keyof typeof guideWords> = {
  time: "faqTimeA",
  houses: "faqHousesA",
  name: "faqNameA",
  year: "faqYearA",
  count: "faqCountA",
  free: "faqFreeA",
  kept: "faqKeptA",
  trust: "faqTrustA",
  ai: "faqAiA",
};

/**
 * One of the guide's answers, folded under its question (Guide.tsx), with
 * its words linked to the encyclopedia. In the browser, its own download
 * with the answers' words (languages plan, part 29), out of the first load
 * every studio page pays for: it takes over the server's answer once it
 * arrives. The server's routes load it before drawing the guide
 * (guide-answers.ts), so the page holds every answer, without JavaScript too.
 */
export function GuideAnswer({ id }: { id: QuestionId }) {
  const { locale } = useI18n();
  return (
    <p className="ob-guide-p">
      <Linked text={guideWords[ANSWER[id]][locale === "fr" ? 1 : 0]} />
    </p>
  );
}
