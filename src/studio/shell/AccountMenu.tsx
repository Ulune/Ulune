import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, Compass, Settings, User } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AnchoredPopover } from "@/components/anchored-popover";
import { LangSwitch } from "@/components/lang-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { useI18n } from "@/lib/i18n/locale";
import { useSpace } from "@/lib/space/state";
import { startTour } from "@/lib/tour/state";

/** One menu for everyone: what is kept, the guide and the tour, settings, language, theme. */
export function AccountMenu() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const inStudio = useRouterState({ select: (s) => s.location.pathname === "/" });
  const status = useSpace((s) => s.status);
  const spaced = status === "open" || status === "locked";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={ref}
        type="button"
        data-testid="account-menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("shellMenu")}
        title={t("shellMenu")}
        onClick={() => setOpen((v) => !v)}
        className="ob-icon-btn ob-avatar-btn"
      >
        <User className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </button>
      <AnchoredPopover
        open={open}
        anchorRef={ref}
        onClose={close}
        align="end"
        width={280}
        testId="account-menu-panel"
        role="dialog"
        aria-label={t("shellMenu")}
        hideLabel={t("shellMenu")}
      >
        <div className="ob-pop ob-menu">
          <div className="ob-menu-who" data-testid="menu-kept">
            <span className="ob-menu-who-name">{t(spaced ? "spaceSpaceName" : "spaceJustLooking")}</span>
            <span className="ob-menu-who-sub">
              {t(status === "open" ? "spaceHereEncrypted" : status === "locked" ? "spaceLocked" : "spaceNothingKept")}
            </span>
          </div>
          <div className="ob-menu-group">
            <Link to="/guide" data-testid="menu-guide" className="ob-menu-item" onClick={close}>
              <BookOpen className="size-4" strokeWidth={1.75} aria-hidden />
              <span>{t("guidePage")}</span>
            </Link>
            <button
              type="button"
              data-testid="menu-tour"
              className="ob-menu-item"
              onClick={() => {
                close();
                if (inStudio) startTour();
                else void navigate({ to: "/", state: { tour: true } });
              }}
            >
              <Compass className="size-4" strokeWidth={1.75} aria-hidden />
              <span>{t("guideNewTour")}</span>
            </button>
            <Link
              to="/settings"
              data-testid="menu-settings"
              className="ob-menu-item"
              onClick={close}
            >
              <Settings className="size-4" strokeWidth={1.75} aria-hidden />
              <span>{t("shellSettings")}</span>
            </Link>
          </div>
          <div className="ob-menu-row">
            <span className="ob-menu-label">{t("language")}</span>
            <LangSwitch />
          </div>
          <div className="ob-menu-row">
            <span className="ob-menu-label">{t("theme")}</span>
            <ThemeSwitch />
          </div>
        </div>
      </AnchoredPopover>
    </>
  );
}
