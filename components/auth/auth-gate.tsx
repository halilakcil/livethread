"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useSettings } from "@/lib/store";
import { SetupScreen } from "./setup-screen";
import { AppShell } from "@/components/layout/app-shell";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const token = useSettings((s) => s.threadsToken);
  const user = useSettings((s) => s.user);
  const mockMode = useSettings((s) => s.mockMode);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-subtle bg-bg">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!mockMode && !(token && user)) return <SetupScreen />;

  return <AppShell>{children}</AppShell>;
}
