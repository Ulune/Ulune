import { groupsNeedWords } from "@/lib/i18n/catalog/groups-need-words";
import { groupsWords } from "@/lib/i18n/catalog/groups-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";

/*
 * The groups' and notes' words (share and compare plan, ideas B5 and B6) as
 * their code says them (picker-groups.tsx, note-field.tsx): their own book,
 * the headings they share with the lines said without a space
 * (groups-need-words.ts), then the app's catalog.
 */
const WORDS = { ...groupsNeedWords, ...groupsWords };

export function useKeptWords() {
  const { t, locale } = useI18n();
  return bookT(WORDS, t, locale);
}

export type KeptT = ReturnType<typeof useKeptWords>;
