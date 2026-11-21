"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Languages,
  MessageCircle,
  Plus,
  Repeat2,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Input, Skeleton, Textarea } from "@/components/ui/primitives";
import { Dialog, Sheet } from "@/components/ui/overlay";
import { ScheduleModal } from "@/components/schedule/schedule-modal";
import { HookScorer } from "@/components/studio/hook-scorer";
import { publishPosts, rewriteText } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { REWRITE_MODES, type RewriteMode } from "@/lib/llm/prompts";
import type { VerificationResult } from "@/lib/llm/verifier";
import {
  useDrafts,
  useSettings,
  useUi,
  type ContentLanguage,
  type Draft,
  type StudioSource,
} from "@/lib/store";
import { cn, formatNumber, THREADS_CHAR_LIMIT } from "@/lib/utils";

type Results = Partial<Record<RewriteMode, string[]>>;

function CharCount({ text }: { text: string }) {
  const n = text.length;
  const over = n > THREADS_CHAR_LIMIT;
  return (
    <span className={cn("text-[11px] tabular-nums font-mono", over ? "font-bold text-danger" : "text-fg-subtle")}>
      {n}/{THREADS_CHAR_LIMIT}
    </span>
  );
}

export function StudioWorkspace({
  source,
  draft,
  preferredMode,
  embedded = false,
}: {
  source: StudioSource | null;
  draft?: Draft | null;
  preferredMode?: RewriteMode | null;
  /** When true, omit outer chrome (used inside Sheet which already has a header). */
  embedded?: boolean;
}) {
  const { t, locale } = useI18n();
  const llmKey = useSettings((s) => s.llmKey);
  const mockMode = useSettings((s) => s.mockMode);
  const savedContentLanguage = useSettings((s) => s.contentLanguage);
  const saveDraft = useDrafts((s) => s.save);
  const markPublished = useDrafts((s) => s.markPublished);

  const [original, setOriginal] = React.useState("");
  const [mode, setMode] = React.useState<RewriteMode>("rewrite");
  const [instructions, setInstructions] = React.useState("");
  const [outputLanguage, setOutputLanguage] = React.useState<ContentLanguage>("tr");
  const [results, setResults] = React.useState<Results>({});
  const [selectedHook, setSelectedHook] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [draftId, setDraftId] = React.useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [verification, setVerification] = React.useState<VerificationResult | null>(null);
  const sessionKey = `${draft?.id ?? "new"}:${source?.text ?? ""}:${source?.origin ?? ""}:${preferredMode ?? ""}`;
  const sessionKeyRef = React.useRef<string | null>(null);

  // Rehydrate only when the opened source/draft session changes — not on parent re-renders.
  React.useEffect(() => {
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;
    setOriginal(source?.text ?? "");
    setInstructions("");
    setSelectedHook(0);
    setConfirmOpen(false);
    setVerification(null);
    setOutputLanguage(savedContentLanguage === "en" ? "en" : "tr");
    if (draft) {
      setMode(draft.mode);
      setResults({ [draft.mode]: draft.posts });
      setDraftId(draft.id);
    } else {
      setMode(preferredMode ?? "rewrite");
      setResults({});
      setDraftId(undefined);
    }
    // source/draft/preferredMode are read from the session that sessionKey identifies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  React.useEffect(() => {
    setOutputLanguage(savedContentLanguage === "en" ? "en" : "tr");
  }, [savedContentLanguage]);

  const modeLabel = (id: RewriteMode): string => {
    if (id === "hooks") return t("studioModeHooks");
    if (id === "thread") return t("studioModeFlood");
    return t("studioModeRewrite");
  };

  const items = results[mode];
  const postsToShip: string[] = !items ? [] : mode === "hooks" ? [items[selectedHook] ?? ""] : items;
  const tooLong = postsToShip.some((p) => p.length > THREADS_CHAR_LIMIT);
  const isThread = mode === "thread";
  const threadCountValid = !isThread || (postsToShip.length >= 3 && postsToShip.length <= 6);
  const canShip = postsToShip.length > 0 && postsToShip.every((p) => p.trim()) && !tooLong && threadCountValid;

  async function generate() {
    if (!original.trim()) {
      toast.error(locale === "en" ? "Add source text first" : "Önce kaynak metin ekleyin");
      return;
    }
    const generateMode: RewriteMode = mode;
    setLoading(true);
    try {
      const res = await rewriteText(original, generateMode, instructions, outputLanguage);
      setResults((r) => ({ ...r, [generateMode]: res.items }));
      setMode(generateMode);
      setVerification(res.verification ?? null);
      setSelectedHook(0);
      setDraftId(undefined);
    } catch (e) {
      toast.error(locale === "en" ? "Rewrite failed" : "Üretim başarısız", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  function updateItem(i: number, value: string) {
    setResults((r) => ({ ...r, [mode]: (r[mode] ?? []).map((x, idx) => (idx === i ? value : x)) }));
  }

  function addThreadPost() {
    setResults((r) => ({ ...r, thread: [...(r.thread ?? []), ""] }));
  }

  function removeThreadPost(i: number) {
    setResults((r) => ({ ...r, thread: (r.thread ?? []).filter((_, idx) => idx !== i) }));
  }

  function applyHookToRewrite() {
    const hook = items?.[selectedHook];
    if (!hook) return;
    const base = results.rewrite?.[0] ?? original;
    const body = base.split("\n").slice(1).join("\n").trim();
    setResults((r) => ({ ...r, rewrite: [`${hook}\n\n${body}`.trim()] }));
    setMode("rewrite");
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy"));
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  function onSave() {
    const d = saveDraft({ id: draftId, mode, posts: postsToShip, source: source ?? undefined });
    setDraftId(d.id);
    toast.success(draftId ? t("updateDraft") : t("saveDraft"));
  }

  async function onPublish() {
    setPublishing(true);
    try {
      const res = await publishPosts(postsToShip);
      const d = saveDraft({ id: draftId, mode, posts: postsToShip, source: source ?? undefined });
      markPublished(d.id, res.permalink);
      setDraftId(d.id);
      setConfirmOpen(false);
      toast.success(res.simulated ? "Demo publish" : t("publish"), {
        action: res.permalink ? { label: t("open"), onClick: () => window.open(res.permalink, "_blank") } : undefined,
      });
    } catch (e) {
      toast.error("Publish failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className={cn(!embedded && "rounded-[1.25rem] border border-border bg-elevated overflow-hidden")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-1.5">
          {REWRITE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.description}
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-colors cursor-pointer",
                mode === m.id
                  ? "bg-accent text-accent-text border-transparent"
                  : "bg-transparent text-fg-muted border-border hover:text-fg hover:bg-surface-2",
              )}
            >
              {modeLabel(m.id)}
              {results[m.id] ? <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" /> : null}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-full border border-border p-0.5">
            <Languages className="ml-2 h-3.5 w-3.5 text-fg-subtle" />
            {(["tr", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setOutputLanguage(lang)}
                className={cn(
                  "rounded-full px-2.5 h-7 text-xs font-semibold cursor-pointer",
                  outputLanguage === lang ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg",
                )}
              >
                {lang === "tr" ? "TR" : "EN"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="brand" onClick={() => void generate()} loading={loading}>
            {!loading && <Sparkles className="h-3.5 w-3.5" />}
            {items ? t("regenerate") : t("generate")}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 lg:divide-x divide-border">
        <section className="flex flex-col p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">{t("original")}</h3>
            <div className="flex items-center gap-2">
              {source?.author && <Badge>@{source.author}</Badge>}
              {source?.permalink && (
                <a href={source.permalink} target="_blank" rel="noreferrer" className="text-fg-subtle hover:text-fg">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
          <Textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            rows={12}
            placeholder={t("studioPlaceholder")}
            className="min-h-[240px] flex-1 resize-y border-0 bg-surface-2 text-[15px] leading-relaxed focus:ring-brand/20"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            {source?.metrics ? (
              <div className="flex flex-wrap gap-3 text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {formatNumber(source.metrics.views)}
                </span>
                <span className="inline-flex items-center gap-1 text-like">
                  <Heart className="h-3.5 w-3.5" /> {formatNumber(source.metrics.likes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" /> {formatNumber(source.metrics.replies)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Repeat2 className="h-3.5 w-3.5" /> {formatNumber(source.metrics.reposts)}
                </span>
              </div>
            ) : (
              <span />
            )}
            <CharCount text={original} />
          </div>
          <Input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t("optionalTone")}
            className="mt-3"
            onKeyDown={(e) => e.key === "Enter" && !loading && void generate()}
          />
        </section>

        <section className="flex flex-col border-t border-border p-4 sm:p-5 lg:border-t-0">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">{t("rewritten")}</h3>
          {verification && (
            <div
              className={cn(
                "mb-3 flex items-start gap-2.5 rounded-2xl border p-3 text-xs",
                verification.passed
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">%{verification.score}</div>
                <p className="mt-0.5 leading-relaxed opacity-90">{verification.reasoning}</p>
              </div>
            </div>
          )}
          <div className="min-h-[240px] flex-1">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: mode === "rewrite" ? 1 : 3 }).map((_, i) => (
                  <Skeleton key={i} className={mode === "hooks" ? "h-14" : "h-28"} />
                ))}
              </div>
            ) : !items ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center px-4">
                <Sparkles className="mb-2 h-5 w-5 text-fg-subtle" />
                <p className="text-sm font-medium text-fg-muted">{t("pickFormat")}</p>
                <p className="mt-1 text-xs text-fg-subtle">{REWRITE_MODES.find((m) => m.id === mode)?.description}</p>
              </div>
            ) : mode === "hooks" ? (
              <div className="space-y-2">
                {items.map((hook, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedHook(i)}
                    className={cn(
                      "group flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors",
                      selectedHook === i ? "border-brand bg-brand/5" : "border-border hover:border-border-strong",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        selectedHook === i ? "border-brand bg-brand text-brand-fg" : "border-border-strong",
                      )}
                    >
                      {selectedHook === i && <Check className="h-3 w-3" />}
                    </div>
                    <Textarea
                      value={hook}
                      onChange={(e) => updateItem(i, e.target.value)}
                      rows={2}
                      className="resize-none border-0 bg-transparent p-0 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyText(hook);
                      }}
                      className="cursor-pointer p-1 text-fg-subtle opacity-0 hover:text-fg group-hover:opacity-100"
                      aria-label={t("copy")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={applyHookToRewrite}>
                  {t("studioOpenRewrite")} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <HookScorer hooks={items} selectedIndex={selectedHook} onSelectHook={(_, idx) => setSelectedHook(idx)} />
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((post, i) => (
                  <div key={i} className="rounded-2xl bg-surface-2/60 p-3.5">
                    {mode === "thread" && (
                      <div className="mb-2 flex items-center justify-between">
                        <Badge tone="accent">
                          {i + 1}/{items.length}
                        </Badge>
                        {items.length > 3 && (
                          <button
                            type="button"
                            onClick={() => removeThreadPost(i)}
                            className="cursor-pointer p-1 text-fg-subtle hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    <Textarea
                      value={post}
                      onChange={(e) => updateItem(i, e.target.value)}
                      rows={mode === "thread" ? 4 : 10}
                      className="border-0 bg-transparent p-0 text-[15px] leading-relaxed focus:ring-0"
                    />
                    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
                      <button
                        type="button"
                        onClick={() => void copyText(post)}
                        className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-fg-subtle hover:text-fg"
                      >
                        <Copy className="h-3 w-3" /> {t("copy")}
                      </button>
                      <CharCount text={post} />
                    </div>
                  </div>
                ))}
                {mode === "thread" && items.length < 6 && (
                  <Button variant="ghost" size="sm" onClick={addThreadPost}>
                    <Plus className="h-3.5 w-3.5" /> + ({items.length}/6)
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
        <div className="text-xs text-fg-subtle">
          {!llmKey && mockMode && "Demo"}
          {!llmKey && !mockMode && <span className="text-warning">LLM key missing</span>}
          {tooLong && <span className="text-danger"> &gt;{THREADS_CHAR_LIMIT}</span>}
          {isThread && postsToShip.length > 0 && !threadCountValid && (
            <span className="text-warning"> Flood: 3–6</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canShip}
            onClick={() => void copyText(postsToShip.join("\n\n---\n\n"))}
          >
            <Copy className="h-3.5 w-3.5" /> {t("copy")}
          </Button>
          <Button variant="secondary" size="sm" disabled={!canShip} onClick={onSave}>
            <Save className="h-3.5 w-3.5" /> {draftId ? t("updateDraft") : t("saveDraft")}
          </Button>
          <Button variant="outline" size="sm" disabled={!canShip} onClick={() => setScheduleOpen(true)}>
            <CalendarIcon className="h-3.5 w-3.5" /> {t("schedule")}
          </Button>
          <Button variant="brand" size="sm" disabled={!canShip} onClick={() => setConfirmOpen(true)}>
            <Send className="h-3.5 w-3.5" /> {t("publish")}
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onClose={() => !publishing && setConfirmOpen(false)}>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          {t("publish")}
          <Badge tone={mockMode ? "warning" : "accent"}>{mockMode ? t("demo") : "Live"}</Badge>
        </h3>
        <div className="mt-4 max-h-[320px] space-y-4 overflow-y-auto rounded-2xl border border-border bg-surface-2 p-4">
          {postsToShip.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="text-xs font-semibold">
                @{source?.author || "you"}
                {postsToShip.length > 1 && (
                  <span className="ml-2 font-mono text-fg-subtle">
                    {i + 1}/{postsToShip.length}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{p}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={publishing}>
            {t("cancel")}
          </Button>
          <Button variant="brand" onClick={() => void onPublish()} loading={publishing}>
            <Send className="h-4 w-4" /> {t("publish")}
          </Button>
        </div>
      </Dialog>

      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} posts={postsToShip} mode={mode} />
    </div>
  );
}

export function RewriteDrawer() {
  return null;
}
