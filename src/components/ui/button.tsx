import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[opacity,transform,background-color,border-color,box-shadow] duration-[var(--motion-press)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:opacity-90",
        secondary:
          "border border-border bg-bg-elevated text-fg hover:border-border-strong hover:bg-bg-subtle",
        ghost: "text-fg-muted hover:bg-bg-subtle hover:text-fg",
      },
      size: {
        default: "h-[var(--btn-h)] rounded-md px-[var(--space-4)] text-sm",
        sm: "h-9 rounded-sm px-[var(--space-3)] text-sm",
        /** Small, at a full 44 px touch height. */
        compact: "h-[var(--ctl-h)] rounded-sm px-[var(--space-3)] text-sm",
        lg: "h-12 rounded-lg px-[var(--space-5)] text-base",
        icon: "size-[var(--ctl-icon)] rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
