"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar as CalendarIcon,
  Compass,
  FlaskConical,
  MessageSquare,
  PenSquare,
  Settings,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui/primitives";
import { ScheduleWorker } from "@/components/schedule/schedule-worker";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { MOCK_USER } from "@/lib/mock/data";
import { LIMITS, usageLast24h, useSettings, useUi } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV: { href: string; labelKey: TranslationKey; shortKey: TranslationKey; icon: typeof BarChart3 }[] = [
  { href: "/", labelKey: "overview", shortKey: "overview", icon: BarChart3 },
  { href: "/discover", labelKey: "discover", shortKey: "discover", icon: Compass },
  { href: "/tuning", labelKey: "tuning", shortKey: "tuning", icon: SlidersHorizontal },
  { href: "/calendar", labelKey: "calendar", shortKey: "calendar", icon: CalendarIcon },
  { href: "/inbox", labelKey: "inbox", shortKey: "inbox", icon: MessageSquare },
  { href: "/settings", labelKey: "settings", shortKey: "settings", icon: Settings },
];

function ThreadsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 192 192" className={cn("fill-current", className)} aria-hidden>
      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2109 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C77.3795 44.745 61.9845 55.455 54.498 72.825C47.234 89.675 48.496 108.57 58.077 122.95C67.355 136.87 83.255 145.26 101.442 145.26C117.842 145.26 132.842 138.44 142.172 126.68L129.582 116.63C122.562 125.48 111.962 130.26 99.882 130.26C86.722 130.26 74.882 124.08 67.922 113.62C61.422 103.87 60.562 90.75 65.622 79C71.372 65.67 82.882 58.74 97.222 58.74C114.732 58.74 123.632 69.87 124.782 89.75C120.352 87.77 115.532 86.63 110.422 86.63C92.202 86.63 79.462 98.71 79.462 115.24C79.462 129.35 89.702 139.06 103.882 139.06C117.382 139.06 127.342 130.34 131.762 117.96C135.532 119.98 138.862 122.53 141.632 125.59C147.782 115.24 150.992 102.77 150.992 89.24C150.992 89.15 150.992 89.07 150.992 88.98C147.882 89.1 144.732 89.1 141.537 88.9883ZM103.882 125.06C96.962 125.06 91.962 120.24 91.962 113.24C91.962 104.99 98.632 98.63 108.922 98.63C112.562 98.63 116.032 99.37 119.192 100.8C117.152 117.18 111.452 125.06 103.882 125.06Z" />
    </svg>
  );
}

function RateLimitBanner() {
  const rateLimit = useUi((s) => s.rateLimit);
  const setRateLimit = useUi((s) => s.setRateLimit);
  const searchCalls = useSettings((s) => s.searchCalls);
  const publishCalls = useSettings((s) => s.publishCalls);
  const searchUsed = usageLast24h(searchCalls);
  const publishUsed = usageLast24h(publishCalls);
  const nearLimit = searchUsed >= LIMITS.search * 0.9 || publishUsed >= LIMITS.publish * 0.9;
  if (!rateLimit && !nearLimit) return null;
  return (
    <div className="flex items-start gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm md:px-6">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="flex-1 text-fg text-xs md:text-sm">
        {rateLimit ? (
          <>
            <span className="font-semibold">Limit.</span> {rateLimit.message}
          </>
        ) : (
          <>
            {searchUsed}/{LIMITS.search} · {publishUsed}/{LIMITS.publish}
          </>
        )}
      </div>
      {rateLimit && (
        <button onClick={() => setRateLimit(null)} className="text-fg-subtle hover:text-fg cursor-pointer" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const rawTheme = useSettings((s) => s.theme);
  const theme = rawTheme === "light" ? "light" : "dark";
  const openStudio = useUi((s) => s.openStudio);
  const mockMode = useSettings((s) => s.mockMode);
  const user = useSettings((s) => (s.mockMode ? MOCK_USER : s.user));
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const current = NAV.find((n) => isActive(n.href));
  const headerTitle =
    pathname.startsWith("/studio") ? t("studio") : current ? t(current.labelKey) : t("studio");

  function goWrite() {
    openStudio({ text: "", origin: "manual" });
    if (pathname !== "/studio") router.push("/studio");
  }

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px]">
        <aside className="sticky top-0 hidden h-screen w-[var(--rail-width)] shrink-0 flex-col items-center border-r border-border py-4 md:flex lg:w-56 lg:items-stretch lg:px-3">
          <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 px-2 lg:justify-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fg text-bg">
              <ThreadsMark className="h-5 w-5" />
            </div>
            <div className="hidden lg:block leading-tight">
              <div className="font-display text-[15px] font-bold tracking-tight">LiveThread</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">{t("brandTag")}</div>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map(({ href, labelKey, icon: Icon }) => {
              const active = isActive(href);
              const label = t(labelKey);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "group flex items-center justify-center gap-3 rounded-full px-0 py-2.5 text-[15px] font-semibold transition-colors lg:justify-start lg:px-3",
                    active ? "text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                      active ? "bg-surface-2" : "group-hover:bg-surface-2",
                    )}
                  >
                    <Icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.25px]")} />
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-3 lg:items-stretch">
            <Button variant="brand" className="hidden w-full lg:inline-flex" onClick={goWrite}>
              <PenSquare className="h-4 w-4" /> {t("write")}
            </Button>
            <button
              type="button"
              onClick={goWrite}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-fg shadow-sm hover:bg-brand-hover cursor-pointer lg:hidden"
              aria-label={t("write")}
            >
              <PenSquare className="h-5 w-5" />
            </button>
            {user && (
              <Link
                href="/settings"
                className="flex items-center gap-2.5 rounded-full p-1.5 hover:bg-surface-2 lg:border lg:border-border lg:p-2"
              >
                <Avatar src={user.threads_profile_picture_url} name={user.username} size="sm" />
                <div className="hidden min-w-0 flex-1 lg:block">
                  <div className="truncate text-sm font-semibold">@{user.username}</div>
                  {mockMode ? (
                    <Badge tone="warning" className="mt-0.5">
                      <FlaskConical className="h-2.5 w-2.5" /> {t("demo")}
                    </Badge>
                  ) : (
                    <div className="text-[11px] text-success">{t("connected")}</div>
                  )}
                </div>
              </Link>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col border-r border-border">
          <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur-md md:px-6">
            <div className="font-display text-lg font-bold tracking-tight md:text-xl">{headerTitle}</div>
            {!pathname.startsWith("/studio") && (
              <Button size="sm" variant="brand" className="md:hidden" onClick={goWrite}>
                {t("write")}
              </Button>
            )}
          </header>

          <RateLimitBanner />
          <main className="flex-1 px-4 py-5 md:px-6 md:py-6 animate-rise-in pb-24 md:pb-8">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
          {NAV.slice(0, 5).map(({ href, shortKey, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold",
                  active ? "text-fg" : "text-fg-subtle",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4px]")} />
                {t(shortKey)}
              </Link>
            );
          })}
        </div>
      </nav>

      <ScheduleWorker />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="sr-only">{title}</p>
        {description && <p className="text-sm text-fg-muted leading-relaxed max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
