/** Ulune's four-pointed star, for the studio's and the other pages' top bars. */
export function UluneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="currentColor" aria-hidden>
      <path d="M6 0C6.4 3.1 8.9 5.6 12 6 8.9 6.4 6.4 8.9 6 12 5.6 8.9 3.1 6.4 0 6 3.1 5.6 5.6 3.1 6 0Z" />
    </svg>
  );
}
