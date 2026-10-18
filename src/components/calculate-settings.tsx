import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { engineWords } from "@/lib/i18n/catalog/engine-words";
import { chosenCalculateOn, setCalculateOn, type CalculateOn } from "@/lib/engine/choice";
import { toast } from "@/lib/toast";

type WordKey = keyof typeof engineWords;

const OPTIONS: { value: CalculateOn; label: WordKey; hint: WordKey }[] = [
  { value: "device", label: "calcDevice", hint: "calcDeviceHint" },
  { value: "server", label: "calcServer", hint: "calcServerHint" },
];

/**
 * Settings › Where charts are calculated (on-device plan, step 5): on this device (the default,
 * recommended) or on Ulune's server, with what each sends. Kept in this browser only
 * (lib/engine/choice.ts); "Use the server once", answered when the device can't, leaves it as it is.
 */
export function CalculateSettings() {
  const { locale } = useI18n();
  const t = (key: WordKey) => engineWords[key][locale === "fr" ? 1 : 0];
  const [value, setValue] = useState<CalculateOn>("device");
  // The device's choice, read once the page runs (the server's page shows the default).
  useEffect(() => setValue(chosenCalculateOn()), []);
  return (
    <section id="calculate" className="ulune-panel ob-settings-card" data-testid="settings-calculate">
      <h2 className="ob-settings-h">{t("calcTitle")}</h2>
      <p className="ob-data-body">{t("calcLead")}</p>
      <fieldset className="ob-calc-where">
        <legend className="sr-only">{t("calcTitle")}</legend>
        {OPTIONS.map((option) => (
          <label key={option.value} className="ob-check" htmlFor={`calculate-${option.value}`}>
            <input
              id={`calculate-${option.value}`}
              type="radio"
              name="calculate"
              data-testid={`calculate-${option.value}`}
              checked={value === option.value}
              onChange={() => {
                setValue(option.value);
                setCalculateOn(option.value);
                toast(t("calcNow").replace("{where}", t(option.value === "server" ? "calcNowServer" : "calcNowDevice")));
              }}
            />
            <span>
              {t(option.label)}
              <span className="ob-check-hint">{t(option.hint)}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
