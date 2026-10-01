import { installPressFeedback } from "@/lib/press";
import { createRootRoute, HeadContent, Outlet, Scripts, useRouter } from "@tanstack/react-router";
import { AiSurfaceProvider } from "@/lib/ai/use-ai-surface";
import { SpaceGate } from "@/components/space/space-gate";
import { LocaleProvider, LOCALE_BOOT } from "@/lib/i18n/locale";
import { THEME_BOOT, ThemeProvider } from "@/lib/theme";
import { RENAME_BOOT } from "@/lib/space/legacy";
import { LookProvider } from "@/lib/look-provider";
import { APP_DESCRIPTION, APP_NAME, SITE_URL } from "@/lib/app-identity";
import { bootScript, firstViewScript } from "@/lib/boot";
import { contentSecurityPolicy, isVercelPreview } from "@/lib/csp";
import { installErrorReports } from "@/lib/error-report";
import { installStaleChunkRecovery } from "@/lib/stale-chunks";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import shellCss from "../shell.css?url";
import uiFont from "../assets/fonts/FamiljenGrotesk-latin-wght.woff2?url";
import uluneClassic from "../assets/fonts/UluneClassic.woff2?url";
import starFontSans from "../assets/fonts/StarFontSans.woff2?url";
import starFontSerif from "../assets/fonts/StarFontSerif.woff2?url";

// The glyph font of the reader's Look is preloaded by the boot script.
const BOOT = bootScript({
  astronomicon: uluneClassic,
  "starfont-sans": starFontSans,
  "starfont-serif": starFontSerif,
});

// A returning reader's zodiac and houses, drawn before the app starts (lib/first-view.ts).
const FIRST_VIEW = firstViewScript();

const fontPreload = (href: string) => ({
  rel: "preload",
  href,
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous" as const,
});

/**
 * An inline script with this page's nonce (lib/csp.ts). Browsers hide a
 * nonce from the DOM once the page has loaded, so hydration would see a
 * difference that is not one.
 */
function InlineScript({ code }: { code: string }) {
  const nonce = useRouter().options.ssr?.nonce;
  return <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: code }} />;
}

/** Once the page runs: error reports (lib/error-report.ts) and a reload for code gone after a deploy. */
function ClientGuards() {
  useEffect(() => {
    installErrorReports();
    installStaleChunkRecovery();
    installPressFeedback();
  }, []);
  return null;
}

export const Route = createRootRoute({
  // Production pages carry a content security policy with their own nonce
  // (router.tsx makes it; development has neither).
  headers: ({ ssr }) =>
    ssr?.nonce
      ? { "Content-Security-Policy": contentSecurityPolicy(ssr.nonce, { preview: isVercelPreview() }) }
      : undefined,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#111111" },
      { name: "description", content: APP_DESCRIPTION },
      // Home Screen and Dock (iOS and macOS read these besides the manifest).
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      // Share cards (public/og.jpg, made by scripts/og-card.mjs).
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/og.jpg` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Ulune: an astrology chart wheel beside the name" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}/og.jpg` },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      // Fonts ship with the app (styles.css, "Fonts"): the interface's own
      // face is fetched at once, with the CSS. The chart-mark symbols (Noto,
      // 5 KB) are inlined in the CSS itself, so they need no request.
      fontPreload(uiFont),
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: shellCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <InlineScript code={RENAME_BOOT} />
        <InlineScript code={THEME_BOOT} />
        <InlineScript code={LOCALE_BOOT} />
        <InlineScript code={BOOT} />
      </head>
      <body className="min-h-dvh bg-bg text-fg">
        <InlineScript code={FIRST_VIEW} />
        <ThemeProvider>
          <LookProvider>
            <LocaleProvider>
              <AiSurfaceProvider>
                <Outlet />
                <SpaceGate />
                <ClientGuards />
              </AiSurfaceProvider>
            </LocaleProvider>
          </LookProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  ),
});
