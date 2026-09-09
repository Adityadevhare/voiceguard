import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/utils/cn"

type ButtonVariant = "primary" | "secondary" | "ghost"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-primary to-primary/85 text-primary-fg border border-transparent shadow-[0_14px_30px_-12px_var(--primary)]",
  secondary:
    "glass text-ink hover:bg-glass-border/40 active:bg-glass-border/60",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-ink/5",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 select-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
          variants[variant],
          className,
        )}
        {...props}
      />
    )
  },
)