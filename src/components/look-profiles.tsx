import { Check, X } from "lucide-react";
import { DEFAULT_LOOK_ID, MAX_LOOK_PROFILES, nextLookProfileName } from "@/lib/look";
import { useLook } from "@/lib/look-provider";
import { useI18n } from "@/lib/i18n/locale";
import { toast } from "@/lib/toast";

const CHIP =
  "inline-flex h-[var(--control-h-sm)] items-center rounded-md border px-2.5 text-xs transition-colors duration-[var(--motion-ui)]";
const CHIP_ON = "border-border-strong bg-bg-subtle text-fg";
const CHIP_OFF = "border-border text-fg-muted hover:border-border-strong hover:text-fg";

export function LookProfiles({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const {
    profiles,
    activeId,
    dirty,
    applyDefault,
    applyProfile,
    saveProfile,
    renameProfile,
    deleteProfile,
  } = useLook();

  const atCap = profiles.length >= MAX_LOOK_PROFILES;
  const onDefault = activeId === DEFAULT_LOOK_ID;
  const saveDisabled = onDefault ? atCap || !dirty : !dirty;
  /** A saved profile, unchanged: the button says so instead of standing greyed out. */
  const saved = !onDefault && !dirty;

  function onSave() {
    if (onDefault) {
      saveProfile(nextLookProfileName(profiles, (n) => t("lookProfileN", { n })));
      return;
    }
    saveProfile();
  }

  const active = profiles.find((p) => p.id === activeId);

  return (
    <div data-testid="look-profiles" className="flex flex-col gap-2">
      {!compact ? (
        // The page's title already says "Profiles": its instruction only.
        <p className="text-xs text-fg-muted">{t("lookProfilesKicker")}</p>
      ) : (
        <p className="ulune-kicker text-fg-subtle">{t("lookProfiles")}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-look-profile={DEFAULT_LOOK_ID}
          aria-pressed={onDefault}
          onClick={applyDefault}
          className={`${CHIP} ${onDefault ? CHIP_ON : CHIP_OFF}`}
        >
          {t("lookUlune")}
        </button>
        {profiles.map((p) => {
          const on = activeId === p.id;
          return (
            <span key={p.id} className="inline-flex items-center">
              <button
                type="button"
                data-look-profile={p.id}
                aria-pressed={on}
                onClick={() => applyProfile(p.id)}
                className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF} ${compact ? "" : "rounded-r-none border-r-0"}`}
              >
                {p.name}
              </button>
              {!compact ? (
                <button
                  type="button"
                  data-look-delete={p.id}
                  title={t("lookDelete")}
                  aria-label={t("lookDelete")}
                  onClick={() => deleteProfile(p.id)}
                  className={`${CHIP} ${CHIP_OFF} rounded-l-none px-1.5`}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </span>
          );
        })}
        <button
          type="button"
          data-look-save
          disabled={saveDisabled}
          title={
            saveDisabled
              ? atCap && onDefault
                ? t("lookProfilesFull")
                : saved
                  ? t("lookHintSaved")
                  : t("lookHintSave")
              : undefined
          }
          onClick={() => {
            onSave();
            toast(t("toastProfileSaved"));
          }}
          className={`${CHIP} ${saved ? "gap-1 border-border text-fg-muted" : `${CHIP_OFF} disabled:opacity-60`}`}
        >
          {saved ? (
            <>
              <Check className="size-3.5" aria-hidden />
              {t("lookSaved")}
            </>
          ) : (
            t("lookSave")
          )}
        </button>
      </div>
      {!compact && active ? (
        <label className="block max-w-xs">
          <span className="mb-1 block ulune-kicker text-fg-subtle">{t("lookRename")}</span>
          <input
            key={active.id}
            data-testid="look-rename"
            defaultValue={active.name}
            maxLength={24}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value.trim() !== active.name) {
                renameProfile(active.id, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              (e.target as HTMLInputElement).blur();
            }}
            className="block h-11 w-full min-w-0 rounded-md border border-border-field bg-bg px-3 text-sm text-fg"
          />
        </label>
      ) : null}
      {/* Ulune's own look, unchanged, is no saved profile: the hint says how to make one. */}
      <p className="text-xs text-fg-muted">
        {atCap && onDefault ? t("lookProfilesFull") : saved ? t("lookHintSaved") : t("lookHintSave")}
      </p>
    </div>
  );
}
