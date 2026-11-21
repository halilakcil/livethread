"use client";

import { Toaster } from "sonner";
import { useSettings } from "@/lib/store";

export function ThemeToaster() {
  const rawTheme = useSettings((s) => s.theme);
  const theme = rawTheme === "light" ? "light" : "dark";
  return <Toaster theme={theme} position="bottom-right" richColors closeButton />;
}
