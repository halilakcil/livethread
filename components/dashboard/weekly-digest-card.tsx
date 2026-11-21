"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Lightbulb,
  ListChecks,
  RefreshCw,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Skeleton, Textarea } from "@/components/ui/primitives";
import { ScheduleModal } from "@/components/schedule/schedule-modal";
import { useI18n } from "@/lib/i18n";
import { useSchedule } from "@/lib/schedule/store";
import { useDrafts, useSettings, useUi } from "@/lib/store";
import type { ThreadPost } from "@/lib/threads/types";
import { cn, formatNumber, THREADS_CHAR_LIMIT } from "@/lib/utils";

interface DigestResponse {
  hasData: boolean;
  message?: string;
  stats?: {
    postCount: number;
    totalViews: number;
    totalLikes: number;
    totalReplies: number;
    totalReposts: number;
    topPost: {
      text: string;
      likes: number;
      replies: number;
      permalink?: string;
    };
  };
  analysis?: {
    summary: string;
    winningThemes: string[];
    actionSteps: string[];
  };
}

export interface StrategyPostSuggestion {
  id: string;
  title: string;
  angle: string;
  hook: string;
  content: string;
  whyItWorks: string;
  suggestedCategory: string;
  suggestedIsoTime: string;
  suggestedTime: string;
  suggestedTimeReason: string;
}

function getCategoryTone(cat?: string): "accent" | "warning" | "default" | "success" {
  if (!cat) return "default";
  const lower = cat.toLowerCase();
  if (lower.includes("fizik") || lower.includes("bilim") || lower.includes("science")) return "accent";
  if (lower.includes("psikoloji") || lower.includes("zihin") || lower.includes("neuro") || lower.includes("biliş")) return "warning";
  if (lower.includes("felsefe") || lower.includes("deney") || lower.includes("tartışma") || lower.includes("düşünce")) return "success";
  return "default";
}

export function WeeklyDigestCard({ posts }: { posts: ThreadPost[] }) {
  const router = useRouter();
  const { locale } = useI18n();
  const isEn = locale === "en";
  const llmKey = useSettings((s) => s.llmKey);
  const llmProvider = useSettings((s) => s.llmProvider);
  const llmModel = useSettings((s) => s.llmModel);
  const contentLanguage = useSettings((s) => (s.contentLanguage === "en" ? "en" : "tr"));

  const { openStudio } = useUi();
  const { save: saveDraft } = useDrafts();
  const schedule = useSchedule((s) => s.schedule);

  const [loading, setLoading] = React.useState(false);
  const [digest, setDigest] = React.useState<DigestResponse | null>(null);
  const [loadingStrategy, setLoadingStrategy] = React.useState(false);
  const [strategyPosts, setStrategyPosts] = React.useState<StrategyPostSuggestion[]>([]);
  const [activeFocusItem, setActiveFocusItem] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [selectedPostToSchedule, setSelectedPostToSchedule] = React.useState<{
    content: string;
    isoTime?: string;
  } | null>(null);

  async function generateDigest() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/weekly-digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-key": llmKey,
          "x-llm-provider": llmProvider,
          "x-llm-model": llmModel,
        },
        body: JSON.stringify({ posts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || (isEn ? "Could not build report." : "Haftalık rapor üretilemedi."));
      setDigest(data);
      setStrategyPosts([]);
      if (data.hasData) {
        toast.success(isEn ? "Weekly report ready." : "Haftalık performans raporu hazır.");
      }
    } catch (err: unknown) {
      toast.error(isEn ? "Report failed" : "Rapor oluşturulamadı", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateStrategyPosts(focusItem?: string) {
    if (!digest?.analysis) {
      toast.error(isEn ? "Generate the report first." : "Önce haftalık analizi oluşturun.");
      return;
    }
    setLoadingStrategy(true);
    setActiveFocusItem(focusItem || null);
    try {
      const res = await fetch("/api/ai/strategy-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-key": llmKey,
          "x-llm-provider": llmProvider,
          "x-llm-model": llmModel,
        },
        body: JSON.stringify({
          analysis: digest.analysis,
          topPost: digest.stats?.topPost,
          focusItem: focusItem || undefined,
          posts,
          language: contentLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || (isEn ? "Could not draft posts." : "Stratejik gönderiler üretilemedi."));
      if (data.posts && Array.isArray(data.posts)) {
        setStrategyPosts(data.posts);
        toast.success(isEn ? "3 strategy posts ready." : "3 stratejik gönderi hazır.");
      }
    } catch (err: unknown) {
      toast.error(isEn ? "Draft failed" : "Gönderiler üretilemedi", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingStrategy(false);
    }
  }

  function handleUpdatePostContent(id: string, newContent: string) {
    setStrategyPosts((prev) => prev.map((p) => (p.id === id ? { ...p, content: newContent } : p)));
  }

  function handleQuickSchedule(post: StrategyPostSuggestion) {
    try {
      schedule({
        mode: "rewrite",
        posts: [post.content],
        scheduledFor: post.suggestedIsoTime,
      });
      toast.success(isEn ? `Scheduled for ${post.suggestedTime}` : `${post.suggestedTime} için planlandı.`);
    } catch (err: unknown) {
      toast.error(isEn ? "Schedule failed" : "Zamanlama yapılamadı", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function handleOpenScheduleCustom(post: StrategyPostSuggestion) {
    setSelectedPostToSchedule({ content: post.content, isoTime: post.suggestedIsoTime });
    setScheduleModalOpen(true);
  }

  function handleOpenStudio(post: StrategyPostSuggestion) {
    openStudio({
      text: post.content,
      author: isEn ? "Weekly strategy" : "Haftalık Strateji",
      origin: "dashboard",
    });
    router.push("/studio");
  }

  function handleSaveDraft(post: StrategyPostSuggestion) {
    saveDraft({
      mode: "rewrite",
      posts: [post.content],
      source: {
        text: post.content,
        author: isEn ? "Weekly strategy" : "Haftalık Strateji",
        origin: "dashboard",
      },
    });
    toast.success(isEn ? "Saved to drafts." : "Taslaklara eklendi.");
  }

  async function handleCopy(post: StrategyPostSuggestion) {
    try {
      await navigator.clipboard.writeText(post.content);
      setCopiedId(post.id);
      toast.success(isEn ? "Copied." : "Kopyalandı.");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(isEn ? "Copy failed." : "Kopyalanamadı.");
    }
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight">
              {isEn ? "Weekly growth brief" : "Haftalık büyüme özeti"}
            </h3>
            <p className="mt-0.5 text-sm text-fg-muted">
              {isEn
                ? "Last 7 days of performance, themes, and next drafts."
                : "Son 7 günün performansı, temalar ve sonraki taslaklar."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {digest?.analysis && (
              <Button
                size="sm"
                variant="brand"
                onClick={() => generateStrategyPosts()}
                loading={loadingStrategy && !activeFocusItem}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isEn ? "Draft 3 posts" : "3 gönderi üret"}
              </Button>
            )}
            <Button size="sm" variant={digest ? "outline" : "brand"} onClick={generateDigest} loading={loading}>
              {digest ? <RefreshCw className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              {digest ? (isEn ? "Refresh report" : "Raporu yenile") : isEn ? "Build report" : "Raporu oluştur"}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="space-y-3 rounded-[1.25rem] border border-border bg-elevated p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {!loading && !digest && (
          <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border bg-elevated px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg">
              <Lightbulb className="h-5 w-5" />
            </div>
            <p className="font-display text-base font-bold">
              {isEn ? "No brief yet" : "Henüz rapor yok"}
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-fg-muted leading-relaxed">
              {isEn
                ? "Build a weekly brief from your last 7 days, then turn themes into ready drafts."
                : "Son 7 günden bir özet çıkar; temaları hazır gönderi taslaklarına dönüştür."}
            </p>
            <Button className="mt-5" variant="brand" onClick={generateDigest} loading={loading}>
              <FileText className="h-4 w-4" />
              {isEn ? "Build report" : "Raporu oluştur"}
            </Button>
          </div>
        )}

        {!loading && digest && !digest.hasData && (
          <div className="rounded-[1.25rem] border border-border bg-elevated px-5 py-6 text-sm text-fg-muted">
            {digest.message}
          </div>
        )}

        {!loading && digest?.hasData && digest.stats && digest.analysis && (
          <div className="space-y-4">
            {/* Week stats */}
            <div className="stat-rail">
              <MiniStat label={isEn ? "Posts" : "Gönderi"} value={String(digest.stats.postCount)} />
              <MiniStat label={isEn ? "Views" : "İzlenme"} value={formatNumber(digest.stats.totalViews)} />
              <MiniStat label={isEn ? "Likes" : "Beğeni"} value={formatNumber(digest.stats.totalLikes)} />
              <MiniStat label={isEn ? "Replies" : "Yanıt"} value={formatNumber(digest.stats.totalReplies)} />
            </div>

            {/* Top post */}
            {digest.stats.topPost && (
              <section className="rounded-[1.25rem] border border-border bg-elevated p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-warning" />
                    <h4 className="text-sm font-semibold">
                      {isEn ? "Best post this week" : "Haftanın en iyi gönderisi"}
                    </h4>
                  </div>
                  {digest.stats.topPost.permalink && (
                    <a
                      href={digest.stats.topPost.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg"
                    >
                      Threads <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
                  {digest.stats.topPost.text}
                </p>
                <div className="mt-3 flex gap-3 text-xs text-fg-subtle font-mono">
                  <span>{formatNumber(digest.stats.topPost.likes)} {isEn ? "likes" : "beğeni"}</span>
                  <span>·</span>
                  <span>{formatNumber(digest.stats.topPost.replies)} {isEn ? "replies" : "yanıt"}</span>
                </div>
              </section>
            )}

            {/* Summary */}
            <section className="rounded-[1.25rem] border border-border bg-elevated p-5">
              <h4 className="mb-2 text-sm font-semibold">{isEn ? "Strategist note" : "Stratejist notu"}</h4>
              <p className="text-sm leading-relaxed text-fg-muted">{digest.analysis.summary}</p>
            </section>

            {/* Themes + actions as clean lists */}
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Lightbulb className="h-4 w-4 text-fg-muted" />
                  <h4 className="text-sm font-semibold">{isEn ? "Winning themes" : "Öne çıkan temalar"}</h4>
                </div>
                <ul className="divide-y divide-border">
                  {digest.analysis.winningThemes.map((theme, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[11px] font-bold font-mono text-fg-muted">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-fg">{theme}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loadingStrategy}
                        onClick={() => generateStrategyPosts(theme)}
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        {isEn ? "Write" : "Yaz"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <ListChecks className="h-4 w-4 text-fg-muted" />
                  <h4 className="text-sm font-semibold">{isEn ? "Next week actions" : "Gelecek hafta aksiyonları"}</h4>
                </div>
                <ul className="divide-y divide-border">
                  {digest.analysis.actionSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[11px] font-bold font-mono text-fg-muted">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-relaxed text-fg">{step}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        disabled={loadingStrategy}
                        onClick={() => generateStrategyPosts(step)}
                      >
                        {isEn ? "Apply" : "Uygula"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {loadingStrategy && (
              <section className="rounded-[1.25rem] border border-border bg-elevated p-5 space-y-3">
                <p className="text-sm text-fg-muted">
                  {activeFocusItem
                    ? isEn
                      ? `Drafting around “${activeFocusItem.slice(0, 48)}…”`
                      : `“${activeFocusItem.slice(0, 48)}…” için yazılıyor…`
                    : isEn
                      ? "Drafting 3 optimized posts…"
                      : "3 optimize gönderi hazırlanıyor…"}
                </p>
                <div className="space-y-3">
                  <Skeleton className="h-36 w-full" />
                  <Skeleton className="h-36 w-full" />
                  <Skeleton className="h-36 w-full" />
                </div>
              </section>
            )}

            {!loadingStrategy && strategyPosts.length > 0 && (
              <section className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
                <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">
                      {isEn ? "Suggested posts" : "Önerilen gönderiler"}
                    </h4>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {isEn ? "Edit inline, then schedule or open in Studio." : "Metni düzenle, zamanla veya Stüdyo’da aç."}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => generateStrategyPosts()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isEn ? "New ideas" : "Yeni fikirler"}
                  </Button>
                </div>

                <div className="divide-y divide-border">
                  {strategyPosts.map((post, idx) => (
                    <article key={post.id || idx} className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-fg-subtle">#{idx + 1}</span>
                            <h5 className="text-sm font-semibold text-fg">{post.title}</h5>
                            {post.suggestedCategory && (
                              <Badge tone={getCategoryTone(post.suggestedCategory)}>{post.suggestedCategory}</Badge>
                            )}
                          </div>
                          {post.angle && <p className="text-xs text-fg-muted">{post.angle}</p>}
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-fg-muted">
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span className="font-semibold text-fg">{post.suggestedTime}</span>
                        </div>
                      </div>

                      {post.suggestedTimeReason && (
                        <p className="text-xs text-fg-subtle leading-relaxed">{post.suggestedTimeReason}</p>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-fg-subtle">
                          <span>{isEn ? "Post text" : "Gönderi metni"}</span>
                          <span
                            className={cn(
                              "font-mono tabular-nums",
                              post.content.length > THREADS_CHAR_LIMIT ? "text-danger font-semibold" : "",
                            )}
                          >
                            {post.content.length}/{THREADS_CHAR_LIMIT}
                          </span>
                        </div>
                        <Textarea
                          value={post.content}
                          onChange={(e) => handleUpdatePostContent(post.id, e.target.value)}
                          rows={5}
                          className="bg-surface-2 border-0 focus:ring-brand/20 text-sm leading-relaxed"
                        />
                      </div>

                      {post.whyItWorks && (
                        <p className="text-xs text-fg-muted leading-relaxed">
                          <span className="font-semibold text-fg">{isEn ? "Why it works: " : "Neden işe yarar: "}</span>
                          {post.whyItWorks}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button size="sm" variant="brand" onClick={() => handleQuickSchedule(post)}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          {isEn ? `Schedule · ${post.suggestedTime}` : `Zamanla · ${post.suggestedTime}`}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleOpenStudio(post)}>
                          <Wand2 className="h-3.5 w-3.5" />
                          {isEn ? "Studio" : "Stüdyo"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenScheduleCustom(post)}>
                          {isEn ? "Custom time" : "Özel saat"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleSaveDraft(post)}>
                          {isEn ? "Draft" : "Taslak"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCopy(post)}>
                          {copiedId === post.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === post.id ? (isEn ? "Copied" : "Kopyalandı") : isEn ? "Copy" : "Kopyala"}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {selectedPostToSchedule && (
        <ScheduleModal
          open={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            setSelectedPostToSchedule(null);
          }}
          posts={[selectedPostToSchedule.content]}
          mode="rewrite"
          initialDate={selectedPostToSchedule.isoTime}
          onScheduled={() => {
            setScheduleModalOpen(false);
            setSelectedPostToSchedule(null);
            toast.success(isEn ? "Scheduled." : "Takvime planlandı.");
          }}
        />
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</div>
      <div className="mt-1.5 font-display text-xl font-bold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
