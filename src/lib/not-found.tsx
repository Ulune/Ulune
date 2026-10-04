import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n/locale";

export function AppNotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh">
      {/* A plain bar back to the studio: the other pages' bar and its styles load with those pages, not with every visit. */}
      <header className="flex h-[var(--ob-top-h)] items-center border-b border-border px-4">
        <Link to="/" className="font-display text-xl text-fg" data-testid="back-to-studio">
          ✦ Ulune
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-col items-center px-[var(--space-5)] py-16 text-center">
        <p className="ulune-kicker text-fg-subtle">404</p>
        <h1 className="mt-[var(--space-2)] font-display text-3xl text-fg">{t("pageNotFound")}</h1>
        <Link
          to="/"
          className="mt-[var(--space-5)] rounded-md border border-border px-3 py-2 text-sm text-fg hover:border-border-strong"
        >
          {t("backToChart")}
        </Link>
      </main>
    </div>
  );
}
