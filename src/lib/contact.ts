/**
 * "Report a problem": an email to Ulune's publisher (lib/legal/operator.ts),
 * with the version in the subject and a line to start from. Nothing about
 * the chart on screen is added; the reader writes what they choose.
 */
import { APP_VERSION } from "@/lib/app-identity";
import type { MessageKey } from "@/lib/i18n/messages";
import { OPERATOR } from "@/lib/legal/operator";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function problemMailto(t: Translate): string {
  const subject = t("reportMailSubject", { version: APP_VERSION });
  const body = `${t("reportMailBody")}\n\n`;
  return `mailto:${OPERATOR.contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
