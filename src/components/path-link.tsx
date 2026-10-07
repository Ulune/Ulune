import { useNavigate } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

/**
 * A link to a path worked out as the page runs (a studio page, the
 * encyclopedia's pages): a plain <a href>, so it opens in a new tab and reads
 * as a link, and on a plain click the router moves there without loading the
 * page again (charts cast without a private space live in memory only).
 */
export function PathLink({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const navigate = useNavigate();
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target) return;
        e.preventDefault();
        void navigate({ href });
      }}
    />
  );
}
