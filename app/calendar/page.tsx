"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge, Button, Skeleton } from "@/components/ui/primitives";
import { fetchMyPosts } from "@/lib/api-client";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useSchedule, type ScheduledPost } from "@/lib/schedule/store";
import { useSettings, useUi } from "@/lib/store";
import type { ThreadPost } from "@/lib/threads/types";
import { cn, timeAgo } from "@/lib/utils";

type CalendarTab = "queue" | "heatmap" | "history";

const DAY_KEYS: TranslationKey[] = [
  "calendarDayMon",
  "calendarDayTue",
  "calendarDayWed",
  "calendarDayThu",
  "calendarDayFri",
  "calendarDaySat",
  "calendarDaySun",
];

function formatScheduleDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === "en" ? "en-US" : "tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function heatClass(intensity: number): string {
  if (intensity === 0) return "bg-surface-2 border border-border";
  if (intensity < 0.3) return "bg-brand/20 border border-brand/15";
  if (intensity < 0.7) return "bg-brand/55";
  return "bg-brand shadow-[0_0_0_1px_rgba(0,0,0,0.08)]";
}

function QueueItem({
  item,
  locale,
  publishingId,
  onPublish,
  onCancel,
}: {
  item: ScheduledPost;
  locale: string;
  publishingId: string | null;
  onPublish: (item: ScheduledPost) => void;
  onCancel: (id: string) => void;
}) {
  const { t } = useI18n();
  const targetDate = new Date(item.scheduledFor);
  const isDue = targetDate.getTime() <= Date.now();
  const isFlood = item.mode === "thread" || item.posts.length > 1;

  return (
    <article className="border-b border-border last:border-b-0 px-4 py-5 sm:px-5 transition-colors hover:bg-surface-2/35">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isDue ? "bg-warning/15 text-warning" : "bg-surface-2 text-fg-muted",
          )}
        >
          <Clock className="h-3 w-3" />
          {isDue ? t("calendarDue") : formatScheduleDate(item.scheduledFor, locale)}
        </span>
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
          {isFlood ? `${t("calendarFlood")} · ${item.posts.length}` : t("calendarSingle")}
        </span>
        {item.status === "publishing" && (
          <Badge tone="accent" className="text-[10px]">
            …
          </Badge>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {item.posts.slice(0, 2).map((text, index) => (
          <p key={index} className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg line-clamp-4">
            {isFlood && (
              <span className="mr-1.5 font-mono text-[11px] font-semibold text-fg-subtle">
                [{index + 1}]
              </span>
            )}
            {text}
          </p>
        ))}
        {item.posts.length > 2 && (
          <p className="text-xs text-fg-subtle">
            +{item.posts.length - 2} {t("calendarMoreParts")}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => onCancel(item.id)}>
          <Trash2 className="h-3.5 w-3.5" />
          {t("calendarCancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="brand"
          loading={publishingId === item.id}
          onClick={() => onPublish(item)}
        >
          <Send className="h-3.5 w-3.5" />
          {t("calendarPublishNow")}
        </Button>
      </div>
    </article>
  );
}

function HistoryItem({ item }: { item: ScheduledPost }) {
  const { t } = useI18n();
  const isPublished = item.status === "published";

  return (
    <article className="border-b border-border last:border-b-0 px-4 py-5 sm:px-5 transition-colors hover:bg-surface-2/35">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isPublished ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
          )}
        >
          {isPublished ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {isPublished ? t("calendarStatusPublished") : t("calendarStatusFailed")}
        </span>
        <span className="text-xs text-fg-subtle">
          {item.publishedAt ? timeAgo(item.publishedAt) : timeAgo(item.scheduledFor)}
        </span>
        {(item.mode === "thread" || item.posts.length > 1) && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
            {t("calendarFlood")} · {item.posts.length}
          </span>
        )}
        {item.permalink && (
          <a
            href={item.permalink}
            target="_blank"
            rel="noreferrer"
            title={t("openOnThreads")}
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[15px] leading-relaxed text-fg">{item.posts[0]}</p>
      {item.error && <p className="mt-2 font-mono text-xs text-danger">{item.error}</p>}
    </article>
  );
}

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { items, publishItem, cancel, checkDuePosts } = useSchedule();
  const { openStudio } = useUi();
  const mockMode = useSettings((s) => s.mockMode);
  const threadsToken = useSettings((s) => s.threadsToken);

  function goWrite() {
    openStudio({ text: "", origin: "manual" });
    router.push("/studio");
  }

  const [activeTab, setActiveTab] = React.useState<CalendarTab>("queue");
  const [posts, setPosts] = React.useState<ThreadPost[]>([]);
  const [loadingPosts, setLoadingPosts] = React.useState(true);
  const [publishingId, setPublishingId] = React.useState<string | null>(null);
  const [checkingQueue, setCheckingQueue] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoadingPosts(true);
      try {
        const res = await fetchMyPosts(100);
        if (active) setPosts(res.posts);
      } catch (err) {
        console.warn("Could not fetch real posts for calendar:", err);
      } finally {
        if (active) setLoadingPosts(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [threadsToken, mockMode]);

  async function handlePublishNow(item: ScheduledPost) {
    setPublishingId(item.id);
    try {
      const ok = await publishItem(item.id);
      if (ok) toast.success(t("calendarPublishedOk"));
      else toast.error(t("calendarPublishFail"));
    } finally {
      setPublishingId(null);
    }
  }

  function handleCancel(id: string) {
    if (!confirm(t("calendarCancelConfirm"))) return;
    cancel(id);
    toast.info(t("calendarCancelled"));
  }

  async function handleCheckQueue() {
    setCheckingQueue(true);
    try {
      const count = await checkDuePosts();
      if (count > 0) toast.success(`${count} ${t("calendarDuePublished")}`);
      else toast.info(t("calendarNothingDue"));
    } finally {
      setCheckingQueue(false);
    }
  }

  const heatmapData = React.useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxScore = 0;
    for (const post of posts) {
      if (!post.timestamp) continue;
      const d = new Date(post.timestamp);
      const dayIdx = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      const interactions =
        (post.metrics?.likes ?? 0) * 2 +
        (post.metrics?.replies ?? 0) * 3 +
        (post.metrics?.reposts ?? 0) * 4;
      grid[dayIdx][hour] += Math.max(interactions, 1);
      counts[dayIdx][hour] += 1;
      if (grid[dayIdx][hour] > maxScore) maxScore = grid[dayIdx][hour];
    }
    return { grid, counts, maxScore, totalPosts: posts.length };
  }, [posts]);

  const scheduledPending = items.filter((x) => x.status === "scheduled" || x.status === "publishing");
  const pastItems = items.filter((x) => x.status === "published" || x.status === "failed");

  const tabs: { id: CalendarTab; label: string; count?: number }[] = [
    { id: "queue", label: t("calendarQueue"), count: scheduledPending.length },
    { id: "heatmap", label: t("calendarHeatmap") },
    { id: "history", label: t("calendarHistory"), count: pastItems.length },
  ];

  return (
    <>
      <PageHeader
        title={t("calendarTitle")}
        description={t("calendarDesc")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" loading={checkingQueue} onClick={() => void handleCheckQueue()}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t("calendarCheckQueue")}
            </Button>
            <Button variant="brand" size="sm" onClick={goWrite}>
              <Plus className="h-3.5 w-3.5" />
              {t("calendarPlanNew")}
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
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
            {tab.count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "queue" && (
        <div>
          {scheduledPending.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
                <Clock className="h-5 w-5" />
              </div>
              <p className="font-display text-base font-bold text-fg">{t("calendarQueueEmptyTitle")}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted leading-relaxed">
                {t("calendarQueueEmptyDesc")}
              </p>
              <Button size="sm" variant="brand" className="mt-5" onClick={goWrite}>
                <Sparkles className="h-3.5 w-3.5" />
                {t("calendarOpenStudio")}
              </Button>
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
              {scheduledPending.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  locale={locale}
                  publishingId={publishingId}
                  onPublish={(i) => void handlePublishNow(i)}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "heatmap" && (
        <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h3 className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
                <Flame className="h-4 w-4 text-brand" />
                {t("calendarHeatTitle")}
              </h3>
              <p className="mt-1 text-sm text-fg-muted leading-relaxed">{t("calendarHeatDesc")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-fg-muted tabular-nums">
              {heatmapData.totalPosts} {t("calendarAnalyzed")}
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {loadingPosts ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : heatmapData.totalPosts === 0 ? (
              <div className="px-2 py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-fg">{t("calendarHeatEmptyTitle")}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-fg-muted leading-relaxed">
                  {t("calendarHeatEmptyDesc")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[640px] space-y-1.5">
                  <div className="grid grid-cols-[2.75rem_repeat(24,minmax(0,1fr))] gap-1 text-center text-[10px] font-mono text-fg-subtle">
                    <span className="text-left font-sans text-[10px]">{t("calendarDayHour")}</span>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <span key={h}>{h % 3 === 0 ? h : ""}</span>
                    ))}
                  </div>
                  {DAY_KEYS.map((dayKey, dayIdx) => (
                    <div
                      key={dayKey}
                      className="grid grid-cols-[2.75rem_repeat(24,minmax(0,1fr))] gap-1 items-center"
                    >
                      <span className="text-[11px] font-semibold text-fg-muted">{t(dayKey)}</span>
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const val = heatmapData.grid[dayIdx][hour];
                        const count = heatmapData.counts[dayIdx][hour];
                        const intensity = heatmapData.maxScore > 0 ? val / heatmapData.maxScore : 0;
                        return (
                          <div
                            key={hour}
                            title={`${t(dayKey)} ${hour}:00 · ${count} · ${val}`}
                            className={cn("h-5 rounded-sm transition-opacity hover:opacity-80", heatClass(intensity))}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center justify-end gap-2 pt-3 text-[11px] text-fg-subtle">
                    <span>{t("calendarLowEngagement")}</span>
                    <span className={cn("h-3 w-3 rounded-sm", heatClass(0))} />
                    <span className={cn("h-3 w-3 rounded-sm", heatClass(0.2))} />
                    <span className={cn("h-3 w-3 rounded-sm", heatClass(0.5))} />
                    <span className={cn("h-3 w-3 rounded-sm", heatClass(1))} />
                    <span>{t("calendarHighEngagement")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div>
          {pastItems.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border px-6 py-16 text-center">
              <p className="font-display text-base font-bold text-fg">{t("calendarHistoryEmptyTitle")}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted leading-relaxed">
                {t("calendarHistoryEmptyDesc")}
              </p>
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
              {pastItems.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
