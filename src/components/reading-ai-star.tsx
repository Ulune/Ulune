import { Sparkles } from "lucide-react";
import { readingAiLabel } from "@/lib/i18n/reading-ai";
import { useI18n } from "@/lib/i18n/locale";
import { useAiSurface } from "@/lib/ai/use-ai-surface";

export function AiStarGlyph({ className }: { className?: string }) {
  return <Sparkles className={className} data-ai-glyph="sparkles" aria-hidden />;
}

export function ReadingAiStar() {
  const { locale } = useI18n();
  const { setOpen } = useAiSurface();
  const label = readingAiLabel(locale);

  return (
    <button
      type="button"
      data-testid="reading-ai"
      className="ulune-sky-read-ai"
      aria-label={label}
      onClick={() => setOpen(true)}
    >
      <span className="sr-only">{label}</span>
      <AiStarGlyph className="ulune-sky-read-ai-icon" />
    </button>
  );
}
