import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale";
import { AccountMenu } from "@/studio/shell/AccountMenu";
import { SpaceButton } from "@/components/space/space-button";

/*
 * The mark and the top bar of the pages outside the studio (login, settings,
 * not found). Nothing here imports the studio (store, chart picker, reading
 * text), so those pages and the router's not-found fallback stay light.
 */

export function UluneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="currentColor" aria-hidden>
      <path d="M6 0C6.4 3.1 8.9 5.6 12 6 8.9 6.4 6.4 8.9 6 12 5.6 8.9 3.1 6.4 0 6 3.1 5.6 5.6 3.1 6 0Z" />
    </svg>
  );
}

/** Top bar for pages outside the studio (login, settings, not found). */
export function PageTopBar({ menu = true }: { menu?: boolean }) {
  const { t } = useI18n();
  return (
    <header className="ob-pagebar" data-testid="page-topbar">
      <Link to="/" className="ob-back" data-testid="back-to-studio">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        <span>{t("shellStudio")}</span>
      </Link>
      <span className="ob-brand ob-brand--page" aria-hidden>
        <UluneMark className="ob-brand-mark" />
        <span className="ob-brand-word">Ulune</span>
      </span>
      <div className="ob-pagebar-r">
        {menu ? (
          <>
            <SpaceButton />
            <AccountMenu />
          </>
        ) : null}
      </div>
    </header>
  );
}
