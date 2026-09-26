import { useToasts } from "@/lib/toast";

/** One status region for the app: polite, bottom-centre, above the nav. */
export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="ob-toasts" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <p key={t.id} className="ob-toast" data-tone={t.tone} data-testid="toast">
          {t.text}
        </p>
      ))}
    </div>
  );
}
