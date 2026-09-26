import { DayPicker } from "react-day-picker";
// One file per locale: the "react-day-picker/locale" barrel is every locale
// (about 5 MB unbundled in development).
import { enGB } from "react-day-picker/locale/en-GB";
import { fr } from "react-day-picker/locale/fr";
import "./birth-calendar.css";

/**
 * The month calendar of a date field. Its own download (with date-fns and
 * its styles): fetched when the calendar button is pointed at, focused or
 * opened.
 */
export function BirthCalendar({
  locale,
  month,
  onMonthChange,
  selected,
  onPick,
}: {
  locale: "en" | "fr";
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: Date | undefined;
  onPick: (day: Date) => void;
}) {
  return (
    <DayPicker
      mode="single"
      locale={locale === "fr" ? fr : enGB}
      weekStartsOn={1}
      captionLayout="dropdown"
      startMonth={new Date(1800, 0)}
      endMonth={new Date(2100, 11)}
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={(day) => {
        if (day) onPick(day);
      }}
      className="ulune-day-picker"
    />
  );
}
