import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "block h-11 w-full min-w-0 rounded-md border border-border bg-bg px-3 text-base text-fg transition-[border-color,box-shadow] duration-[var(--motion-ui)] md:text-sm",
          "placeholder:italic placeholder:font-normal placeholder:text-[color-mix(in_oklab,var(--color-fg)_34%,transparent)]",
          "focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-[var(--space-2)] block ulune-kicker text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
