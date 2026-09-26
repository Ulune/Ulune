import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAiAccount } from "@/lib/ai/use-ai-account";
import { useAiSurface } from "@/lib/ai/use-ai-surface";
import { AI_PROVIDER_IDS, AI_PROVIDER_META, providerName, type AiProvider } from "@/lib/ai/providers";
import { callsDirectly } from "@/lib/ai/call";
import { readingAiLabel } from "@/lib/i18n/reading-ai";
import { popoverPlacement } from "@/lib/popover-place";
import { useI18n } from "@/lib/i18n/locale";
import { AiStarGlyph } from "./reading-ai-star";
import { toast } from "@/lib/toast";

export function AiAccountsButton() {
  const { t, locale } = useI18n();
  const { active } = useAiAccount();
  const { open, toggle, setOpen } = useAiSurface();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; width: number } | null>(null);
  const label = readingAiLabel(locale);

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }
    const placeNow = () => {
      const node = triggerRef.current;
      if (!node) return;
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setPlace(popoverPlacement(node.getBoundingClientRect(), { width: 22 * rem, align: "end" }));
    };
    placeNow();
    window.addEventListener("resize", placeNow);
    window.addEventListener("scroll", placeNow, true);
    return () => {
      window.removeEventListener("resize", placeNow);
      window.removeEventListener("scroll", placeNow, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-testid="ai-accounts"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        className="ob-icon-btn ob-ai-btn ulune-ai-trigger"
      >
        <AiStarGlyph className="size-4" />
        <span className="ob-ai-label">{active ? providerName(active) : t("aiAccounts")}</span>
      </button>
      {open && place && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label={t("hidePanel")}
                onClick={() => setOpen(false)}
              />
              <div
                data-testid="ai-accounts-popover"
                className="fixed z-50 max-h-[min(70dvh,32rem)] overflow-y-auto"
                style={{ top: place.top, left: place.left, width: place.width }}
              >
                <AiAccountsPanel />
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

export function AiAccountsPanel({ compose }: { compose?: ReactNode }) {
  const { t } = useI18n();
  const ai = useAiAccount();
  const [drafts, setDrafts] = useState<Partial<Record<AiProvider, string>>>({});
  const [busy, setBusy] = useState<AiProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section
      data-testid="ai-accounts-panel"
      className="ulune-panel p-[var(--space-4)]"
    >
      <p className="ulune-kicker text-fg-subtle">{t("aiAccounts")}</p>
      <p className="mt-1 font-display text-xl text-fg">{t("aiAccountsTitle")}</p>
      <p className="mt-2 text-sm leading-[var(--leading-phi)] text-fg-muted">{t("aiAccountsBody")}</p>

      <ul className="mt-4 space-y-3">
        {AI_PROVIDER_IDS.map((id) => {
          const meta = AI_PROVIDER_META[id];
          const saved = ai.keys.find((row) => row.provider === id);
          const active = ai.active === id;
          return (
            <li key={id} className="rounded-lg border border-border bg-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-fg">{meta.name}</p>
                  <p className="text-xs text-fg-subtle">{t(meta.hintKey)}</p>
                </div>
                {saved ? (
                  <span className="text-xs text-fg-muted">{t("aiConnected", { last4: saved.last4 })}</span>
                ) : null}
              </div>

              {saved ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={active || busy === id}
                    onClick={() => {
                      setError(null);
                      void ai.useProvider(id).catch(() => setError(t("aiSwitchFailed")));
                    }}
                    className="h-9 rounded-md border border-border px-3 text-xs text-fg hover:border-border-strong disabled:opacity-50"
                  >
                    {active ? t("aiUsing", { name: meta.name }) : t("aiUseThis")}
                  </button>
                  <button
                    type="button"
                    disabled={busy === id}
                    onClick={() => {
                      setBusy(id);
                      setError(null);
                      void ai
                        .removeKey(id)
                        .catch(() => setError(t("aiRemoveFailed")))
                        .finally(() => setBusy(null));
                    }}
                    className="h-9 rounded-md px-3 text-xs text-fg-muted hover:text-danger"
                  >
                    {t("aiRemove")}
                  </button>
                </div>
              ) : (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const key = (drafts[id] ?? "").trim();
                    if (key.length < 12) {
                      setError(t("aiInvalidKey"));
                      return;
                    }
                    setBusy(id);
                    setError(null);
                    void ai
                      .saveKey(id, key)
                      .then(() => {
                        setDrafts((prev) => ({ ...prev, [id]: "" }));
                        toast(t("toastKeySaved"));
                      })
                      .catch(() => setError(t("aiKeySaveFailed")))
                      .finally(() => setBusy(null));
                  }}
                >
                  <label className="sr-only" htmlFor={`ai-key-${id}`}>
                    {t("aiKeyPlaceholder")}
                  </label>
                  <input
                    id={`ai-key-${id}`}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={drafts[id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder={t("aiKeyPlaceholder")}
                    className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={meta.docs}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-fg-muted hover:text-fg"
                    >
                      {t(meta.hintKey)}
                    </a>
                    <button
                      type="submit"
                      disabled={busy === id}
                      className="h-9 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg disabled:opacity-50"
                    >
                      {busy === id ? t("aiSaving") : t("aiConnect")}
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ob-ai-notes" data-testid="ai-notes">
        <p>{t(ai.kept === "space" ? "aiKeptSpace" : "aiKeptTab")}</p>
        <p>{t("aiPositionsOnly")}</p>
        {ai.active ? (
          <p data-testid="ai-route">
            {t(callsDirectly(ai.active) ? "aiDirect" : "aiRelayed", { name: providerName(ai.active) })}
          </p>
        ) : null}
      </div>
      {compose}
    </section>
  );
}
