import type { MessageKey } from "@/lib/i18n/messages";
import type { AiFailureKind } from "./call";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** What to tell the reader when their AI did not answer. */
export function aiFailureText(
  kind: AiFailureKind | "incomplete" | "blank",
  t: T,
  name: string,
  otherwise: MessageKey,
): string {
  switch (kind) {
    case "key":
      return t("aiErrKey", { name });
    case "limit":
      return t("aiErrLimit", { name });
    case "timeout":
      return t("grokTimeout");
    case "network":
      return t("aiErrNetwork", { name });
    case "incomplete":
      return t("grokIncomplete");
    case "blank":
      return t("askBlank");
    default:
      return t(otherwise);
  }
}
