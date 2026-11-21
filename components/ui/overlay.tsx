"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in" style={{ background: "var(--color-overlay)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex h-full w-full max-w-5xl flex-col border-l border-border bg-bg shadow-2xl animate-slide-in-right",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 bg-bg">
          <div>
            <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-fg-subtle hover:bg-surface-2 hover:text-fg cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-bg">{children}</div>
        {footer && <div className="border-t border-border bg-bg px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in" style={{ background: "var(--color-overlay)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn("relative w-full max-w-md rounded-[1.25rem] border border-border bg-elevated p-6 animate-rise-in", className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
