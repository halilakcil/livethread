"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  LayoutList,
  MessageCircle,
  Repeat2,
  Rows3,
  Search,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { engagementRate } from "@/components/dashboard/use-posts";
import { Avatar, Button, Skeleton } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n";
import { MOCK_USER } from "@/lib/mock/data";
import { useSettings, useUi } from "@/lib/store";
import type { ThreadPost } from "@/lib/threads/types";
import { cn, formatNumber, formatPercent, timeAgo } from "@/lib/utils";

export type SortKey = "views" | "likes" | "replies" | "recent";
type FilterType = "all" | "flood" | "single";
type ViewMode = "feed" | "compact";

function isFloodPost(p: ThreadPost): boolean {
  return (p.replies && p.replies.length > 0) || Boolean(p.has_replies);
}

function sortPosts(posts: ThreadPost[], key: SortKey): ThreadPost[] {
  const arr = posts.slice();
  if (key === "recent") {
    return arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  return arr.sort((a, b) => (b.metrics?.[key] ?? -1) - (a.metrics?.[key] ?? -1));
}

function MetricRow({ post }: { post: ThreadPost }) {
  const { t } = useI18n();
  const rate = post.metrics ? engagementRate(post.metrics) : 0;
  return (
    <div className="flex flex-wrap items-center gap-3.5 text-xs text-fg-subtle">
      <span className="inline-flex items-center gap-1.5" title={t("views")}>
        <Eye className="h-3.5 w-3.5" /> {formatNumber(post.metrics?.views)}
      </span>
      <span className="inline-flex items-center gap-1.5 text-like" title={t("likes")}>
        <Heart className="h-3.5 w-3.5" /> {formatNumber(post.metrics?.likes)}
      </span>
      <span className="inline-flex items-center gap-1.5" title={t("replies")}>
        <MessageCircle className="h-3.5 w-3.5" /> {formatNumber(post.metrics?.replies)}
      </span>
      {Boolean(post.metrics?.reposts) && (
        <span className="inline-flex items-center gap-1.5" title={t("engagement")}>
          <Repeat2 className="h-3.5 w-3.5" /> {formatNumber(post.metrics?.reposts)}
        </span>
      )}
      {rate > 0 && (
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted">
          {formatPercent(rate, 1)}
        </span>
      )}
    </div>
  );
}

function FloodChain({
  replies,
  totalParts,
}: {
  replies: ThreadPost[];
  totalParts: number;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-3 space-y-0">
      {replies.map((reply, index) => (
        <div key={reply.id} className="relative flex gap-3 pl-1">
          <div className="relative flex w-9 shrink-0 flex-col items-center">
            <div className="absolute top-0 bottom-0 w-px bg-border" />
            <div className="relative z-[1] mt-2 h-2 w-2 rounded-full bg-brand" />
          </div>
          <div className="min-w-0 flex-1 pb-4">
            <div className="text-[11px] font-medium text-fg-subtle">
              {t("partOf")} {index + 2} / {totalParts}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
              {reply.text || <span className="italic text-fg-subtle">({t("mediaPost")})</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ArchivePost({
  post,
  username,
  avatarUrl,
  viewMode,
  isExpanded,
  copiedId,
  onToggleChain,
  onCopy,
  onOpenStudio,
}: {
  post: ThreadPost;
  username: string;
  avatarUrl?: string;
  viewMode: ViewMode;
  isExpanded: boolean;
  copiedId: string | null;
  onToggleChain: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  onOpenStudio: (post: ThreadPost) => void;
}) {
  const { t } = useI18n();
  const childPosts: ThreadPost[] = post.replies || [];
  const isFlood = isFloodPost(post);
  const partCount = 1 + childPosts.length;
  const isCompact = viewMode === "compact";

  return (
    <article
      className={cn(
        "border-b border-border last:border-b-0 transition-colors hover:bg-surface-2/35",
        isCompact ? "px-4 py-3.5" : "px-4 py-5 sm:px-5",
      )}
    >
      <div className={cn("flex", isCompact ? "gap-0" : "gap-3")}>
        {!isCompact && <Avatar name={username} src={avatarUrl} size="sm" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {!isCompact && <span className="font-semibold text-fg">@{username}</span>}
            <span className="text-fg-subtle text-xs">{timeAgo(post.timestamp)}</span>
            {isFlood && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                Flood · {partCount}
              </span>
            )}
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                title={t("openOnThreads")}
                className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <p
            className={cn(
              "mt-1.5 whitespace-pre-wrap text-fg leading-relaxed",
              isCompact ? "line-clamp-2 text-sm" : "text-[15px]",
            )}
          >
            {post.text || <span className="italic text-fg-subtle">({t("mediaPost")})</span>}
          </p>

          {isFlood && childPosts.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onToggleChain(post.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                {isExpanded ? t("hideChain") : `${t("showChain")} · ${childPosts.length}`}
              </button>
              {isExpanded && !isCompact && <FloodChain replies={childPosts} totalParts={partCount} />}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <MetricRow post={post} />
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onCopy(post.text || "", post.id)}
                title={t("copy")}
              >
                {copiedId === post.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === post.id ? t("copied") : t("copy")}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => onOpenStudio(post)}>
                <Wand2 className="h-3.5 w-3.5" />
                {t("openInStudio")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PostsTable({ posts }: { posts: ThreadPost[] | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const openStudio = useUi((s) => s.openStudio);
  const mockMode = useSettings((s) => s.mockMode);
  const user = useSettings((s) => (s.mockMode ? MOCK_USER : s.user));
  const username = user?.username || "you";
  const avatarUrl = user?.threads_profile_picture_url;

  const [viewMode, setViewMode] = React.useState<ViewMode>("feed");
  const [sort, setSort] = React.useState<SortKey>("views");
  const [query, setQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<FilterType>("all");
  const [expandedChains, setExpandedChains] = React.useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const floodCount = React.useMemo(
    () => (posts ?? []).filter((p) => isFloodPost(p)).length,
    [posts],
  );
  const singleCount = (posts?.length ?? 0) - floodCount;

  const filteredPosts = React.useMemo(() => {
    if (!posts) return null;
    const q = query.trim().toLowerCase();
    let filtered = q ? posts.filter((p) => (p.text ?? "").toLowerCase().includes(q)) : posts;
    if (filterType === "flood") {
      filtered = filtered.filter((p) => isFloodPost(p));
    } else if (filterType === "single") {
      filtered = filtered.filter((p) => !isFloodPost(p));
    }
    return sortPosts(filtered, sort);
  }, [posts, sort, query, filterType]);

  function toggleChain(id: string) {
    setExpandedChains((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(t("postCopied"));
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  function handleOpenStudio(p: ThreadPost) {
    const childPosts: ThreadPost[] = p.replies || [];
    const fullText = [p.text, ...childPosts.map((r) => r.text)].filter(Boolean).join("\n\n");
    openStudio({
      text: fullText,
      permalink: p.permalink,
      metrics: p.metrics,
      origin: "dashboard",
    });
    router.push("/studio");
  }

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: t("archiveAll"), count: posts?.length ?? 0 },
    { id: "flood", label: t("archiveFloods"), count: floodCount },
    { id: "single", label: t("archiveSingles"), count: singleCount },
  ];

  const sorts: { value: SortKey; label: string }[] = [
    { value: "views", label: t("sortViews") },
    { value: "likes", label: t("sortLikes") },
    { value: "replies", label: t("sortReplies") },
    { value: "recent", label: t("sortRecent") },
  ];

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 -mx-1 space-y-3 rounded-[1.25rem] border border-border bg-elevated/95 px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-colors cursor-pointer",
                filterType === f.id
                  ? "bg-accent text-accent-text border-transparent"
                  : "bg-transparent text-fg-muted border-border hover:text-fg hover:bg-surface-2",
              )}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-0.5 rounded-full border border-border p-0.5">
            <button
              type="button"
              title={t("feedView")}
              onClick={() => setViewMode("feed")}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer",
                viewMode === "feed" ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={t("compactView")}
              onClick={() => setViewMode("compact")}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer",
                viewMode === "compact" ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg",
              )}
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("archiveSearch")}
              className="h-10 w-full rounded-full border border-border bg-surface-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {sorts.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  sort === s.value
                    ? "bg-brand/15 text-brand"
                    : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!filteredPosts ? (
        <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-5">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-[1.25rem] border border-border bg-elevated px-6 py-16 text-center">
          <p className="text-sm text-fg-muted">{query ? t("archiveNoMatch") : t("archiveEmpty")}</p>
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
          {filteredPosts.map((p) => (
            <ArchivePost
              key={p.id}
              post={p}
              username={username}
              avatarUrl={avatarUrl}
              viewMode={viewMode}
              isExpanded={!!expandedChains[p.id]}
              copiedId={copiedId}
              onToggleChain={toggleChain}
              onCopy={handleCopy}
              onOpenStudio={handleOpenStudio}
            />
          ))}
        </div>
      )}

      {mockMode && filteredPosts && filteredPosts.length > 0 && (
        <p className="text-center text-[11px] text-fg-subtle">Demo · {filteredPosts.length} {t("posts")}</p>
      )}
    </div>
  );
}
