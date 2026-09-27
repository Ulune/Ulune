import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { AppNotFound } from "@/lib/not-found";
import { makeNonce } from "@/lib/csp";
import { routeTree } from "./routeTree.gen";

/**
 * On the server, each page gets its own nonce for the content security
 * policy (lib/csp.ts, sent by the root route's headers). Development has no
 * policy: Vite's own inline scripts carry no nonce. In the browser the
 * router reads the nonce back from the page (TanStack's csp-nonce meta).
 */
function pageNonce(): string | undefined {
  return import.meta.env.PROD && typeof window === "undefined" ? makeNonce() : undefined;
}

export function getRouter() {
  const nonce = pageNonce();
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: AppNotFound,
    ...(nonce ? { ssr: { nonce } } : {}),
  });
}
