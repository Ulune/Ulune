import { Suspense, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { LoadingLines } from "./loading-lines";

const loadList = () => import("./glossary-list");
const GlossaryList = lazyNamed(loadList, "GlossaryList");
const ahead = () => prefetch(loadList);

/**
 * "Glossary", folded under every reading (and in the guide): the words the
 * reading uses first, then all the others. Its words download when it opens.
 */
export function GlossaryDetails({
  page = "",
  selectedId = null,
  all = false,
  testId = "glossary",
}: {
  page?: string;
  selectedId?: string | null;
  all?: boolean;
  testId?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <details className="ob-rc-about ob-glossary" data-testid={testId} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary onPointerEnter={ahead} onFocus={ahead}>
        {t("glossaryTitle")}
      </summary>
      {open ? (
        <Suspense fallback={<LoadingLines lines={3} />}>
          <GlossaryList page={page} selectedId={selectedId} all={all} />
        </Suspense>
      ) : null}
    </details>
  );
}
