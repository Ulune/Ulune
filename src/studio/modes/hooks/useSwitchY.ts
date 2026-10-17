import type { NumerologyChart } from "@/lib/chart/numerology";
import type { NameLetter, YRole } from "@/lib/chart/numerology-name";
import { useScoped } from "@/studio/scope";

/**
 * Count one Y of the birth name as a vowel or a consonant; when every Y is
 * back to what the rule says, nothing is kept.
 */
export function useSwitchY() {
  // The main page's chart keeps it; a Compare pane only reads its own (studio/scope.tsx).
  const setNumerologyY = useScoped((s) => s.setNumerologyY);
  return (numbers: NumerologyChart, letter: NameLetter, role: YRole) => {
    const letters = numbers.names.birth?.parsed.letters ?? [];
    if (letter.y == null || !numbers.name) return;
    const ys = letters.filter((l) => l.y != null);
    const roles = ys.map((l) => (l.y === letter.y ? role : l.vowel ? "v" : "c"));
    const asRule = ys.every((l, k) => roles[k] === l.yRule);
    setNumerologyY(asRule ? null : { name: numbers.name, roles: roles.join("") });
  };
}
