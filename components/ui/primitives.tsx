"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "brand";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-text font-semibold hover:opacity-90 active:scale-[0.98]",
  brand: "bg-brand text-brand-fg font-semibold hover:bg-brand-hover active:scale-[0.98]",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-border active:scale-[0.98]",
  outline: "border border-border text-fg hover:bg-surface-2 active:scale-[0.98]",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg active:scale-[0.98]",
  danger: "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/20 active:scale-[0.98]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-full",
  md: "h-9 px-4 text-sm gap-2 rounded-full",
  lg: "h-11 px-5 text-sm gap-2 rounded-full",
  icon: "h-9 w-9 rounded-full",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

const fieldBase =
  "w-full rounded-2xl border border-border bg-surface-2 px-3.5 text-sm text-fg placeholder:text-fg-subtle " +
  "focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "py-2.5 leading-relaxed resize-y", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "h-10 pr-8 cursor-pointer appearance-auto", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-semibold text-fg-muted tracking-wide", className)} {...props} />;
}

export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border border-border bg-elevated",
        interactive && "hover:border-border-strong transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "accent" | "success" | "warning" | "danger" }) {
  const tones = {
    default: "bg-surface-2 text-fg-muted border-border",
    accent: "bg-brand-soft text-brand border-brand/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/25",
    danger: "bg-danger/10 text-danger border-danger/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-fg/[0.06] to-transparent animate-[shimmer_1.4s_infinite]" />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex rounded-full border border-border bg-surface-2 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          title={o.title}
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5",
            size === "sm" ? "px-2.5 h-7 text-xs" : "px-3.5 h-8 text-sm",
            value === o.value ? "bg-accent text-accent-text shadow-sm" : "text-fg-subtle hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("rounded-full object-cover", dims)} />;
  }
  return (
    <div className={cn("flex items-center justify-center rounded-full bg-surface-3 font-bold text-fg", dims)}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
