"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ExternalLink,
  Eye,
  Heart,
  Import,
  Info,
  MessageCircle,
  Repeat2,
  Search,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Avatar, Badge, Button, Skeleton } from "@/components/ui/primitives";
import { searchOrganicPosts } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { useSettings, useUi } from "@/lib/store";
import { useTuning } from "@/lib/tuning/store";
import type { ThreadPost } from "@/lib/threads/types";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

interface AnyPlatformPost extends ThreadPost {
  platform?: "threads" | "x";
}

interface MultiCategoryItem {
  id: string;
  scores: Record<string, number>;
  primaryCategory: string;
  summary: string;
}

type PlatformFilter = "threads" | "x" | "all";

function DiscoverPost({
  post,
  analysis,
  categoryNames,
  onImport,
}: {
  post: AnyPlatformPost;
  analysis?: MultiCategoryItem;
  categoryNames: Record<string, string>;
  onImport: () => void;
}) {
  const { t } = useI18n();
  const m = post.metrics;
  const isX = post.platform === "x" || Boolean(post.permalink?.includes("x.com"));
  const topScores = analysis?.scores
    ? Object.entries(analysis.scores)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];
  const username = post.username ?? "unknown";

  return (
    <article className="border-b border-border last:border-b-0 px-4 py-5 sm:px-5 transition-colors hover:bg-surface-2/35">
      <div className="flex gap-3">
        <Avatar name={username} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-fg">@{username}</span>
            {post.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" />}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                isX ? "bg-surface-2 text-fg-muted" : "bg-brand/10 text-brand",
              )}
            >
              {isX ? "X" : "Threads"}
            </span>
            <span className="text-xs text-fg-subtle">{timeAgo(post.timestamp)}</span>
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                title={isX ? t("openOnX") : t("openOnThreads")}
                className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-fg line-clamp-8">
            {post.text || (
              <span className="italic text-fg-subtle">({post.media_type?.toLowerCase() || t("mediaPost")})</span>
            )}
          </p>

          {topScores.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fg-subtle">
                <Sparkles className="h-2.5 w-2.5 text-brand" /> AI
              </span>
              {topScores.map(([catId, score]) => {
                const name = categoryNames[catId] || catId;
                const isHigh = score >= 60;
                return (
                  <span
                    key={catId}
                    title={`${name}: %${score}`}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isHigh ? "bg-brand/15 text-brand" : "bg-surface-2 text-fg-muted",
                    )}
                  >
                    {name} %{score}
                  </span>
                );
              })}
            </div>
          )}

          {analysis?.summary && (
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">{analysis.summary}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {m ? (
              <div className="flex flex-wrap items-center gap-3.5 text-xs text-fg-subtle">
                {Boolean(m.views) && (
                  <span className="inline-flex items-center gap-1.5" title={t("views")}>
                    <Eye className="h-3.5 w-3.5" /> {formatNumber(m.views)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-like" title={t("likes")}>
                  <Heart className="h-3.5 w-3.5" /> {formatNumber(m.likes)}
                </span>
                <span className="inline-flex items-center gap-1.5" title={t("replies")}>
                  <MessageCircle className="h-3.5 w-3.5" /> {formatNumber(m.replies)}
                </span>
                <span className="inline-flex items-center gap-1.5" title={t("engagement")}>
                  <Repeat2 className="h-3.5 w-3.5" /> {formatNumber(m.reposts)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-fg-subtle">{t("discoverNoStats")}</span>
            )}
            <Button type="button" size="sm" variant="brand" onClick={onImport} disabled={!post.text}>
              <Import className="h-3.5 w-3.5" />
              {t("discoverImport")}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DiscoverPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = React.useState("bilim");
  const [platform, setPlatform] = React.useState<PlatformFilter>("threads");
  const [limit, setLimit] = React.useState(20);
  const [results, setResults] = React.useState<AnyPlatformPost[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [scoring, setScoring] = React.useState(false);
  const [lastQuery, setLastQuery] = React.useState("");
  const [analysisMap, setAnalysisMap] = React.useState<Record<string, MultiCategoryItem>>({});
  const [selectedFilterCategory, setSelectedFilterCategory] = React.useState<string>("auto");
  const [showFilteredOut, setShowFilteredOut] = React.useState(false);

  const { addImport, openStudio } = useUi();
  const threadsSession = useSettings((s) => s.threadsSessionCookie);
  const xAuthToken = useSettings((s) => s.xAuthToken);
  const hasCredentials = Boolean(threadsSession || xAuthToken);
  const { categories, globalAiFilterEnabled, setGlobalAiFilter } = useTuning();

  const categoryNames = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  const targetCategory = React.useMemo(() => {
    if (selectedFilterCategory === "all") return null;
    if (selectedFilterCategory !== "auto") {
      return categories.find((c) => c.id === selectedFilterCategory) || null;
    }
    const cleanQ = (lastQuery || q).toLowerCase().trim().replace(/^#/, "");
    return (
      categories.find(
        (c) =>
          c.id.toLowerCase() === cleanQ ||
          c.name.toLowerCase() === cleanQ ||
          c.tags.some((tag) => tag.toLowerCase() === cleanQ),
      ) || null
    );
  }, [selectedFilterCategory, lastQuery, q, categories]);

  async function run() {
    const term = q.trim().replace(/^#/, "");
    if (!term) {
      toast.error(t("discoverNeedQuery"));
      return;
    }
    setLoading(true);
    setAnalysisMap({});
    setShowFilteredOut(false);
    try {
      const data = await searchOrganicPosts({ query: term, platform, limit });
      const mapped: AnyPlatformPost[] = data.posts.map((p: {
        id: string;
        text?: string;
        timestamp: string;
        permalink?: string;
        author: { username?: string; verified?: boolean };
        metrics?: ThreadPost["metrics"];
        platform?: "threads" | "x";
      }) => ({
        id: p.id,
        text: p.text,
        timestamp: p.timestamp,
        permalink: p.permalink,
        username: p.author.username,
        is_verified: p.author.verified,
        metrics: p.metrics,
        platform: p.platform,
      }));
      setResults(mapped);
      setLastQuery(term);
      if (globalAiFilterEnabled && mapped.length > 0) {
        setScoring(true);
        try {
          const res = await fetch("/api/ai/tune-filter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              posts: mapped,
              categories: categories.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                threshold: c.threshold,
                tags: c.tags,
              })),
            }),
          });
          const scoreData = await res.json();
          if (scoreData.results && Array.isArray(scoreData.results)) {
            const map: Record<string, MultiCategoryItem> = {};
            for (const item of scoreData.results as MultiCategoryItem[]) {
              map[item.id] = item;
            }
            setAnalysisMap(map);
            toast.success(t("discoverScored"));
          }
        } catch (sErr) {
          console.warn("[Discover] Multi-category score error:", sErr);
        } finally {
          setScoring(false);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("discoverSearchFailed"), { description: msg });
    } finally {
      setLoading(false);
    }
  }

  function importPost(p: ThreadPost) {
    const source = {
      text: p.text ?? "",
      author: p.username,
      permalink: p.permalink,
      metrics: p.metrics,
      origin: "discover" as const,
    };
    addImport(source);
    openStudio(source);
    router.push("/studio");
  }

  const displayResults = React.useMemo(() => {
    if (!results) return null;
    if (!globalAiFilterEnabled || !targetCategory || showFilteredOut || Object.keys(analysisMap).length === 0) {
      return results;
    }
    const catId = targetCategory.id;
    const threshold = targetCategory.threshold;
    return results.filter((p) => {
      const analysis = analysisMap[p.id];
      if (!analysis) return true;
      const score = analysis.scores?.[catId] ?? 0;
      return score >= threshold;
    });
  }, [results, globalAiFilterEnabled, targetCategory, showFilteredOut, analysisMap]);

  const filteredCount = results && displayResults ? results.length - displayResults.length : 0;

  const platforms: { id: PlatformFilter; label: string }[] = [
    { id: "threads", label: t("discoverPlatformThreads") },
    { id: "x", label: t("discoverPlatformX") },
    { id: "all", label: t("discoverPlatformAll") },
  ];

  return (
    <>
      <PageHeader
        title={t("discoverTitle")}
        description={t("discoverDesc")}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/tuning">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("discoverTuningLink")}
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <SettingsIcon className="h-3.5 w-3.5" />
                {t("discoverAccountsLink")}
              </Button>
            </Link>
          </div>
        }
      />

      {!hasCredentials && (
        <div className="mb-5 flex flex-col gap-3 rounded-[1.25rem] border border-warning/30 bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold text-fg">{t("discoverNoSession")}</p>
              <p className="mt-0.5 text-xs text-fg-muted leading-relaxed">{t("discoverNoSessionDesc")}</p>
            </div>
          </div>
          <Link href="/settings">
            <Button size="sm" variant="primary" className="shrink-0">
              {t("discoverSetupSession")}
            </Button>
          </Link>
        </div>
      )}

      <div className="sticky top-14 z-10 mb-4 space-y-3 rounded-[1.25rem] border border-border bg-elevated/95 px-3 py-3 backdrop-blur-md sm:px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("discoverSearch")}
              className="h-10 w-full rounded-full border border-border bg-surface-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition"
            />
          </div>
          <Button type="submit" loading={loading} variant="brand" size="md" className="shrink-0">
            {!loading && <Search className="h-4 w-4" />}
            {t("discoverSearchLive")}
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-colors cursor-pointer",
                platform === p.id
                  ? "bg-accent text-accent-text border-transparent"
                  : "bg-transparent text-fg-muted border-border hover:text-fg hover:bg-surface-2",
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="flex gap-1 overflow-x-auto">
            {[10, 20, 30].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  limit === n ? "bg-brand/15 text-brand" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {n} {t("discoverCount")}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setGlobalAiFilter(!globalAiFilterEnabled)}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              globalAiFilterEnabled
                ? "border-brand/30 bg-brand/10 text-brand"
                : "border-border text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Sparkles className="h-3 w-3" />
            {globalAiFilterEnabled ? t("discoverAiOn") : t("discoverAiOff")}
          </button>
        </div>

        {globalAiFilterEnabled && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setSelectedFilterCategory("auto")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                selectedFilterCategory === "auto"
                  ? "bg-surface-2 text-fg"
                  : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
              )}
            >
              {t("discoverFilterAuto")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilterCategory("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                selectedFilterCategory === "all"
                  ? "bg-surface-2 text-fg"
                  : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
              )}
            >
              {t("discoverFilterAll")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedFilterCategory(c.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  selectedFilterCategory === c.id
                    ? "bg-brand/15 text-brand"
                    : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                {c.name} ≥%{c.threshold}
              </button>
            ))}
            {targetCategory && (
              <Badge tone="accent" className="ml-auto font-mono text-[10px]">
                {t("discoverTarget")}: {targetCategory.name} ≥%{targetCategory.threshold}
              </Badge>
            )}
          </div>
        )}
      </div>

      {targetCategory && filteredCount > 0 && results && (
        <div className="mb-4 flex flex-col gap-2 rounded-[1.25rem] border border-brand/25 bg-brand/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-brand leading-relaxed">
            <strong>{targetCategory.name}</strong> %{targetCategory.threshold} {t("discoverFilteredBanner")}{" "}
            <strong>{filteredCount}</strong>
            {" · "}
            {displayResults?.length} {t("posts")}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFilteredOut(!showFilteredOut)}
            className="text-brand shrink-0"
          >
            {showFilteredOut ? t("discoverHideCulled") : `${t("discoverShowCulled")} (${filteredCount})`}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden divide-y divide-border">
          {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
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
      ) : displayResults === null ? (
        <div className="rounded-[1.25rem] border border-dashed border-border px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-brand">
            <Search className="h-5 w-5" />
          </div>
          <p className="font-display text-base font-bold text-fg">{t("discoverEmptyTitle")}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted leading-relaxed">{t("discoverEmptyDesc")}</p>
        </div>
      ) : displayResults.length === 0 ? (
        <div className="rounded-[1.25rem] border border-border bg-elevated px-6 py-16 text-center">
          <p className="text-sm text-fg-muted">{t("discoverNoResults")}</p>
          <button
            type="button"
            onClick={() => setShowFilteredOut(true)}
            className="mt-3 text-sm font-semibold text-brand hover:underline cursor-pointer"
          >
            {t("discoverShowRaw")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-fg-subtle">
            <span>
              “{lastQuery}” {t("discoverResultsFor")} {displayResults.length} {t("discoverOrganic")}
            </span>
            {scoring && (
              <span className="inline-flex items-center gap-1.5 text-brand">
                <Sparkles className="h-3 w-3 animate-pulse" />
                {t("discoverScoring")}
              </span>
            )}
          </div>
          <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
            {displayResults.map((p) => (
              <DiscoverPost
                key={p.id}
                post={p}
                analysis={analysisMap[p.id]}
                categoryNames={categoryNames}
                onImport={() => importPost(p)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
