"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Eye, Repeat2, Archive, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { AudienceView } from "@/components/dashboard/audience-view";
import { PostsTable } from "@/components/dashboard/posts-table";
import { WeeklyDigestCard } from "@/components/dashboard/weekly-digest-card";
import { computeTotals, computeTrends, engagementRate, useMyPosts } from "@/components/dashboard/use-posts";
import { Avatar, Badge, Button, Skeleton } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n";
import { MOCK_USER } from "@/lib/mock/data";
import { useSettings, useUi } from "@/lib/store";
import { formatNumber, formatPercent, timeAgo, cn } from "@/lib/utils";

type DashboardTab = "overview" | "audience" | "strategy" | "posts";

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { posts, syncedAt, syncing, error, sync } = useMyPosts(50);
  const openStudio = useUi((s) => s.openStudio);
  const mockMode = useSettings((s) => s.mockMode);
  const user = useSettings((s) => (s.mockMode ? MOCK_USER : s.user));
  const [activeTab, setActiveTab] = React.useState<DashboardTab>("overview");

  const totals = React.useMemo(() => (posts ? computeTotals(posts) : null), [posts]);
  const trends = React.useMemo(() => (posts ? computeTrends(posts) : undefined), [posts]);
  const top = React.useMemo(
    () => (posts ?? []).filter((p) => p.metrics && p.text).sort((a, b) => b.metrics!.views - a.metrics!.views).slice(0, 5),
    [posts],
  );

  return (
    <>
      <PageHeader
        title={t("overview")}
        description={
          <>
            {t("pulse")} · {t("lastSync")}: {timeAgo(syncedAt)}
            {totals ? ` · ${totals.posts} ${t("posts")}` : null}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={sync} loading={syncing}>
              {t("refresh")}
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => {
                openStudio({ text: "", origin: "manual" });
                router.push("/studio");
              }}
            >
              {t("writeNew")}
            </Button>
          </div>
        }
      />

      {/* Profile strip — social, not dashboard-card */}
      <section className="mb-6 flex items-center gap-4">
        <Avatar
          src={user?.threads_profile_picture_url}
          name={user?.username || "T"}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold tracking-tight truncate">
              @{user?.username || "threads"}
            </h2>
            {mockMode && <Badge tone="warning">Demo</Badge>}
          </div>
          <p className="text-sm text-fg-muted mt-0.5">
            Performans özeti ve en güçlü gönderileriniz
          </p>
        </div>
      </section>

      {error && !posts && (
        <div className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Threads verileri yüklenemedi: {error}
        </div>
      )}

      {/* Segmented as Threads-like pills */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: "overview" as const, label: t("performance") },
            { id: "audience" as const, label: t("audience") },
            { id: "strategy" as const, label: t("aiStrategy") },
            { id: "posts" as const, label: `${t("archive")}${totals ? ` · ${totals.posts}` : ""}` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer border",
              activeTab === tab.id
                ? "bg-accent text-accent-text border-transparent"
                : "bg-transparent text-fg-muted border-border hover:text-fg hover:bg-surface-2",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Horizontal stat rail — one composition, not 4 cards */}
          {!totals ? (
            <div className="stat-rail">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-3 h-7 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="stat-rail">
              <StatCell label={t("views")} value={formatNumber(totals.views)} trend={trends?.views} />
              <StatCell label={t("likes")} value={formatNumber(totals.likes)} trend={trends?.likes} />
              <StatCell label={t("replies")} value={formatNumber(totals.replies)} trend={trends?.replies} />
              <StatCell label={t("engagement")} value={formatPercent(totals.engagementRate, 2)} trend={trends?.engagementRate} />
            </div>
          )}

          <EngagementChart posts={posts} />

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold">{t("topPosts")}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("posts")}>
                <Archive className="h-3.5 w-3.5" />
                {t("allArchive")}
              </Button>
            </div>
            <div className="rounded-[1.25rem] border border-border bg-elevated divide-y divide-border overflow-hidden">
              {!posts ? (
                <div className="space-y-4 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : top.length === 0 ? (
                <p className="py-12 text-center text-sm text-fg-subtle">Henüz gönderi yok.</p>
              ) : (
                top.map((p, index) => (
                  <article key={p.id} className="p-4 hover:bg-surface-2/40 transition-colors">
                    <div className="flex gap-3">
                      <Avatar name={user?.username || "U"} src={user?.threads_profile_picture_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-surface-2 px-1.5 text-[10px] font-bold text-fg-muted font-mono">
                            #{index + 1}
                          </span>
                          <span className="font-semibold">@{user?.username || "you"}</span>
                          <span className="text-fg-subtle">·</span>
                          <span className="text-fg-subtle text-xs">{timeAgo(p.timestamp)}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-fg line-clamp-4">
                          {p.text}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3.5 text-xs text-fg-subtle">
                            <span className="inline-flex items-center gap-1.5" title={t("views")}>
                              <Eye className="h-3.5 w-3.5" /> {formatNumber(p.metrics!.views)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-like" title={t("likes")}>
                              <Heart className="h-3.5 w-3.5" /> {formatNumber(p.metrics!.likes)}
                            </span>
                            <span className="inline-flex items-center gap-1.5" title={t("replies")}>
                              <MessageCircle className="h-3.5 w-3.5" /> {formatNumber(p.metrics!.replies)}
                            </span>
                            <span className="inline-flex items-center gap-1.5" title={t("engagement")}>
                              <Repeat2 className="h-3.5 w-3.5" /> {formatNumber(p.metrics!.reposts)}
                            </span>
                            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted">
                              {formatPercent(engagementRate(p.metrics))}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              openStudio({
                                text: p.text!,
                                permalink: p.permalink,
                                metrics: p.metrics,
                                origin: "dashboard",
                              });
                              router.push("/studio");
                            }}
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                            {t("openInStudio")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={() => setActiveTab("strategy")}
            className="flex w-full items-center justify-between gap-3 rounded-[1.25rem] border border-border bg-elevated px-5 py-4 text-left hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <div>
              <div className="font-semibold text-fg">{t("weeklyStrategy")}</div>
              <div className="text-sm text-fg-muted mt-0.5">{t("weeklyStrategyDesc")}</div>
            </div>
            <span className="inline-flex h-8 items-center rounded-full border border-border bg-surface-2 px-3 text-xs font-semibold text-fg shrink-0">
              {t("open")}
            </span>
          </button>
        </div>
      )}

      {activeTab === "audience" && (
        <AudienceView />
      )}

      {activeTab === "strategy" && (
        <div className="space-y-4">
          <WeeklyDigestCard posts={posts || []} />
        </div>
      )}

      {activeTab === "posts" && (
        <div className="space-y-4">
          <PostsTable posts={posts} />
        </div>
      )}
    </>
  );
}

function StatCell({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: number;
}) {
  const up = trend !== undefined && trend >= 0;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tracking-tight tabular-nums">{value}</span>
        {trend !== undefined && (
          <span className={cn("text-[11px] font-bold tabular-nums", up ? "text-success" : "text-danger")}>
            {up ? "+" : "-"}
            {formatPercent(Math.abs(trend), 0)}
          </span>
        )}
      </div>
    </div>
  );
}
