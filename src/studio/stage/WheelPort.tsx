import type { ReactNode } from "react";

export function WheelPort({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return <div className={dim ? "ulune-wheel-port opacity-70" : "ulune-wheel-port"}>{children}</div>;
}
