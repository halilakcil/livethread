"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Heart,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Avatar, Button, Skeleton, Textarea } from "@/components/ui/primitives";
import {
  REPLY_TONES,
  type CommentIntent,
  type CommentIntentType,
  type ReplyTone,
} from "@/lib/inbox/reply-tones";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useSettings } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

interface CommentItem {
  id: string;
  postId: string;
  postText: string;
  commentId: string;
  commentText: string;
  username: string;
  timestamp: string;
  permalink?: string;
  likeCount?: number;
  profilePictureUrl?: string;
  isVerified?: boolean;
  isNestedReply?: boolean;
  repliedToId?: string;
  repliedToText?: string;
  repliedToUsername?: string;
  isReplyToAuthor?: boolean;
  dialogueTrail?: {
    id: string;
    username: string;
    text: string;
    timestamp: string;
    isAuthor: boolean;
  }[];
  hasAuthorReplied?: boolean;
  authorReplyText?: string;
  authorReplyTimestamp?: string;
}

type InboxFilter = "all" | "pending" | "replied";

const MAX_REPLY_LENGTH = 500;

const INTENT_LABEL: Record<CommentIntentType, TranslationKey> = {
  civil: "inboxIntentCivil",
  bait: "inboxIntentBait",
  hostile: "inboxIntentHostile",
  curious: "inboxIntentCurious",
  praise: "inboxIntentPraise",
  neutral: "inboxIntentNeutral",
};

function intentToneClass(type: CommentIntentType): string {
  if (type === "bait" || type === "hostile") return "border-danger/30 bg-danger/10 text-danger";
  if (type === "civil" || type === "praise") return "border-success/30 bg-success/10 text-success";
  if (type === "curious") return "border-brand/30 bg-brand/10 text-brand";
  return "border-border bg-surface-2 text-fg-muted";
}

function CommentThread({
  comment,
  isReplied,
  isEditing,
  replyText,
  suggestions,
  intent,
  selectedTone,
  generatingFor,
  sendingFor,
  onSmartReply,
  onManualReply,
  onSelectTone,
  onSelectSuggestion,
  onChangeReply,
  onCancel,
  onSend,
}: {
  comment: CommentItem;
  isReplied: boolean;
  isEditing: boolean;
  replyText: string;
  suggestions: string[];
  intent?: CommentIntent;
  selectedTone: ReplyTone;
  generatingFor: string | null;
  sendingFor: string | null;
  onSmartReply: (tone?: ReplyTone) => void;
  onManualReply: () => void;
  onSelectTone: (tone: ReplyTone) => void;
  onSelectSuggestion: (text: string) => void;
  onChangeReply: (text: string) => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  const { t } = useI18n();
  const isGenerating = generatingFor === comment.id;
  const isSending = sendingFor === comment.id;
  const overLimit = replyText.length > MAX_REPLY_LENGTH;
  const isRisky = intent?.type === "bait" || intent?.type === "hostile";

  return (
    <article
      className={cn(
        "border-b border-border last:border-b-0 px-4 py-5 sm:px-5 transition-colors",
        isEditing ? "bg-brand/[0.04]" : "hover:bg-surface-2/35",
      )}
    >
      <div className="flex gap-3">
        <Avatar name={comment.username} src={comment.profilePictureUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-fg">@{comment.username}</span>
            {comment.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" />}
            <span className="text-xs text-fg-subtle">{timeAgo(comment.timestamp)}</span>
            {Boolean(comment.likeCount) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-like">
                <Heart className="h-3 w-3" /> {comment.likeCount}
              </span>
            )}
            {comment.isNestedReply && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">
                ↳ {comment.isReplyToAuthor ? "Yanıtınıza Cevap" : `@${comment.repliedToUsername || "yorum"}'a Yanıt`}
              </span>
            )}
            {isReplied && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                <CheckCircle2 className="h-3 w-3" /> {t("inboxReplied")}
              </span>
            )}
            {comment.permalink && (
              <a
                href={comment.permalink}
                target="_blank"
                rel="noreferrer"
                title={t("openOnThreads")}
                className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-fg">{comment.commentText}</p>

          {/* Conversation Trail / Silsile */}
          {comment.dialogueTrail && comment.dialogueTrail.length > 1 ? (
            <div className="mt-3 rounded-xl border border-border/80 bg-surface-2/40 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-fg-subtle border-b border-border/50 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3 text-brand" /> Konuşma Silsilesi ({comment.dialogueTrail.length} Mesaj)
                </span>
                {comment.postText && (
                  <span className="line-clamp-1 max-w-[200px] text-[10px] text-fg-muted font-normal">
                    Thread: {comment.postText.slice(0, 35)}...
                  </span>
                )}
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-brand/30">
                {comment.dialogueTrail.slice(0, -1).map((m, idx) => (
                  <div key={m.id || idx} className="text-xs">
                    <span className={cn("font-semibold block text-[11px]", m.isAuthor ? "text-brand" : "text-fg-subtle")}>
                      {m.isAuthor ? "Sizin Yanıtınız:" : `@${m.username}:`}
                    </span>
                    <p className="mt-0.5 italic text-fg-muted line-clamp-2">&quot;{m.text}&quot;</p>
                  </div>
                ))}
              </div>
            </div>
          ) : comment.isNestedReply && comment.repliedToText ? (
            <div className="mt-3 rounded-xl border border-border/70 bg-surface-2/40 p-3 text-xs">
              <div className="text-[11px] font-semibold text-fg-subtle">
                {comment.isReplyToAuthor ? "Sizin Yanıtınıza Yapılan Yorum:" : `@${comment.repliedToUsername || "kullanıcı"} Yorumuna Yanıt:`}
              </div>
              <p className="mt-1 line-clamp-2 italic text-fg-muted">&quot;{comment.repliedToText}&quot;</p>
              {comment.postText && (
                <div className="mt-1.5 text-[10px] text-fg-subtle">
                  Ana Gönderi: <span className="text-fg-muted">{comment.postText.slice(0, 80)}...</span>
                </div>
              )}
            </div>
          ) : comment.postText ? (
            <div className="mt-3 border-l-2 border-border pl-3">
              <div className="text-[11px] font-semibold text-fg-subtle">{t("inboxOnYourPost")}</div>
              <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-fg-muted">{comment.postText}</p>
            </div>
          ) : null}

          {isReplied && comment.authorReplyText && (
            <div className="mt-3 rounded-xl border border-success/30 bg-success/5 p-3 text-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-success">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sizin Yanıtınız
                </span>
                {comment.authorReplyTimestamp && (
                  <span className="text-[10px] text-fg-subtle font-normal">
                    {timeAgo(comment.authorReplyTimestamp)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-fg leading-relaxed">{comment.authorReplyText}</p>
            </div>
          )}

          {!isEditing ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={isGenerating}
                disabled={isGenerating}
                onClick={() => onSmartReply()}
              >
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                {t("inboxSmartReply")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onManualReply}>
                {t("inboxManualReply")}
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-3 rounded-[1.25rem] border border-border bg-elevated p-3.5 sm:p-4">
              {intent && (
                <div className={cn("rounded-2xl border px-3.5 py-3", intentToneClass(intent.type))}>
                  <div className="flex items-start gap-2.5">
                    {isRisky ? (
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span>{t("inboxIntentLabel")}</span>
                        <span className="rounded-full bg-bg/40 px-2 py-0.5">{t(INTENT_LABEL[intent.type])}</span>
                        <span className="text-[10px] font-medium opacity-80">
                          {t("inboxIntentSuggested")}:{" "}
                          {t(
                            REPLY_TONES.find((x) => x.id === intent.suggestedTone)?.labelKey ??
                              "inboxToneWarm",
                          )}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-95">{intent.summary}</p>
                      {(intent.type === "bait" || intent.type === "hostile") && (
                        <p className="text-[11px] font-medium opacity-90">{t("inboxIntentBaitAdvice")}</p>
                      )}
                      {intent.type === "civil" && (
                        <p className="text-[11px] font-medium opacity-90">{t("inboxIntentCivilAdvice")}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-fg-muted">{t("inboxToneLabel")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {REPLY_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        onSelectTone(tone.id);
                        onSmartReply(tone.id);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50",
                        selectedTone === tone.id
                          ? "border-transparent bg-accent text-accent-text"
                          : "border-border text-fg-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      {t(tone.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {isGenerating && (
                <div className="flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand/10 px-3.5 py-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-brand" />
                  <div>
                    <p className="text-sm font-semibold text-fg">{t("inboxGenerating")}</p>
                    <p className="mt-0.5 text-xs text-fg-muted leading-relaxed">{t("inboxGeneratingDesc")}</p>
                  </div>
                </div>
              )}

              {!isGenerating && suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand">
                      <Sparkles className="h-3 w-3" /> {t("inboxSuggestions")}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSmartReply(selectedTone)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted hover:text-fg transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" /> {t("inboxRegenerate")}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {suggestions.map((suggestion, index) => {
                      const isSelected = replyText === suggestion;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => onSelectSuggestion(suggestion)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-sm leading-relaxed transition-colors cursor-pointer",
                            isSelected
                              ? "border-brand/40 bg-brand/10 text-fg"
                              : "border-border bg-surface-2/50 text-fg-muted hover:border-border-strong hover:text-fg",
                          )}
                        >
                          <span>{suggestion}</span>
                          {isSelected && (
                            <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                              {t("inboxSelected")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Textarea
                  value={replyText}
                  onChange={(e) => onChangeReply(e.target.value)}
                  disabled={isGenerating}
                  placeholder={isGenerating ? t("inboxWaitingAi") : `@${comment.username} · ${t("inboxPlaceholder")}`}
                  rows={3}
                  className="min-h-[5.5rem] text-[15px] leading-relaxed"
                />
                <div className="flex items-center justify-between gap-2 text-[11px] text-fg-subtle">
                  <span>{t("inboxRuleHint")}</span>
                  <span className={cn("tabular-nums", overLimit && "font-bold text-danger")}>
                    {replyText.length}/{MAX_REPLY_LENGTH}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={isGenerating} onClick={onCancel}>
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="brand"
                  loading={isSending}
                  disabled={isGenerating || !replyText.trim() || overLimit}
                  onClick={onSend}
                >
                  <Send className="h-3.5 w-3.5" />
                  {t("inboxSend")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function InboxPage() {
  const { t } = useI18n();
  const threadsToken = useSettings((s) => s.threadsToken);
  const threadsUserId = useSettings((s) => s.threadsUserId);
  const llmKey = useSettings((s) => s.llmKey);
  const llmProvider = useSettings((s) => s.llmProvider);
  const llmModel = useSettings((s) => s.llmModel);

  const [comments, setComments] = React.useState<CommentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<InboxFilter>("all");
  const [repliedMap, setRepliedMap] = React.useState<Record<string, boolean>>({});
  const [activeCommentId, setActiveCommentId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [smartSuggestions, setSmartSuggestions] = React.useState<Record<string, string[]>>({});
  const [intentMap, setIntentMap] = React.useState<Record<string, CommentIntent>>({});
  const [toneMap, setToneMap] = React.useState<Record<string, ReplyTone>>({});
  const [generatingFor, setGeneratingFor] = React.useState<string | null>(null);
  const [sendingFor, setSendingFor] = React.useState<string | null>(null);

  const loadComments = React.useCallback(async (opts?: { soft?: boolean }) => {
    const soft = Boolean(opts?.soft);
    if (!soft) setLoading(true);
    try {
      const res = await fetch("/api/threads/replies", {
        headers: {
          "x-threads-token": threadsToken,
          "x-threads-user-id": threadsUserId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || t("inboxLoadFail"));
      setComments(data.comments || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t("inboxLoadFail"), { description: message });
    } finally {
      setLoading(false);
    }
  }, [threadsToken, threadsUserId, t]);

  React.useEffect(() => {
    void loadComments();
  }, [threadsToken, threadsUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateSmartReply(c: CommentItem, tone?: ReplyTone) {
    const explicitTone = tone ?? toneMap[c.id];
    setGeneratingFor(c.id);
    setActiveCommentId(c.id);
    if (explicitTone) setToneMap((prev) => ({ ...prev, [c.id]: explicitTone }));
    const toastId = toast.loading(`@${c.username} ${t("inboxSmartLoading")}`);
    try {
      const res = await fetch("/api/ai/smart-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-key": llmKey,
          "x-llm-provider": llmProvider,
          "x-llm-model": llmModel,
        },
        body: JSON.stringify({
          parentText:
            c.isNestedReply && c.repliedToText
              ? `[SİZİN ÖNCEKİ YANITINIZ]: ${c.repliedToText}\n[ANA GÖNDERİ]: ${c.postText}`
              : c.postText,
          commentText: c.commentText,
          commenterName: c.username,
          dialogueTrail: c.dialogueTrail || [],
          ...(explicitTone ? { tone: explicitTone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || t("inboxSmartFail"));
      const list: string[] = data.replies || [];
      setSmartSuggestions((s) => ({ ...s, [c.id]: list }));
      if (data.intent) {
        const parsedIntent = data.intent as CommentIntent;
        setIntentMap((prev) => ({ ...prev, [c.id]: parsedIntent }));
        if (!explicitTone && parsedIntent.suggestedTone) {
          setToneMap((prev) => ({ ...prev, [c.id]: parsedIntent.suggestedTone }));
        }
      } else if (data.tone) {
        setToneMap((prev) => ({ ...prev, [c.id]: data.tone as ReplyTone }));
      }
      if (list.length > 0) setReplyText(list[0]);
      toast.success(t("inboxSmartReady"), { id: toastId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t("inboxSmartFail"), { id: toastId, description: message });
    } finally {
      setGeneratingFor(null);
    }
  }

  async function handleSendReply(c: CommentItem) {
    if (!replyText.trim()) {
      toast.error(t("inboxNeedText"));
      return;
    }
    setSendingFor(c.id);
    try {
      const res = await fetch("/api/threads/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-threads-token": threadsToken,
          "x-threads-user-id": threadsUserId,
        },
        body: JSON.stringify({
          replyToId: c.commentId,
          text: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || t("inboxSendFail"));
      setRepliedMap((r) => ({ ...r, [c.id]: true }));
      setComments((prev) =>
        prev.map((item) =>
          item.id === c.id
            ? {
                ...item,
                hasAuthorReplied: true,
                authorReplyText: replyText.trim(),
                authorReplyTimestamp: new Date().toISOString(),
              }
            : item,
        ),
      );
      setReplyText("");
      setActiveCommentId(null);
      toast.success(`@${c.username} ${t("inboxSent")}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t("inboxSendFail"), { description: message });
    } finally {
      setSendingFor(null);
    }
  }

  const isCommentReplied = React.useCallback(
    (c: CommentItem) => Boolean(c.hasAuthorReplied || repliedMap[c.id]),
    [repliedMap],
  );

  const pendingCount = comments.filter((c) => !isCommentReplied(c)).length;
  const repliedCount = comments.filter((c) => isCommentReplied(c)).length;

  const filteredComments = React.useMemo(() => {
    if (filter === "pending") return comments.filter((c) => !isCommentReplied(c));
    if (filter === "replied") return comments.filter((c) => isCommentReplied(c));
    return comments;
  }, [comments, filter, isCommentReplied]);

  const filters: { id: InboxFilter; label: string; count: number }[] = [
    { id: "all", label: t("inboxAll"), count: comments.length },
    { id: "pending", label: t("inboxPending"), count: pendingCount },
    { id: "replied", label: t("inboxReplied"), count: repliedCount },
  ];

  return (
    <>
      <PageHeader
        title={t("inboxTitle")}
        description={t("inboxDesc")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadComments({ soft: comments.length > 0 })}
            loading={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("refresh")}
          </Button>
        }
      />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer border",
              filter === f.id
                ? "bg-accent text-accent-text border-transparent"
                : "bg-transparent text-fg-muted border-border hover:text-fg hover:bg-surface-2",
            )}
          >
            {f.label}
            <span className="ml-1.5 tabular-nums opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-5">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-border px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
            <MessageSquare className="h-5 w-5" />
          </div>
          <p className="font-display text-base font-bold text-fg">{t("inboxEmptyTitle")}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted leading-relaxed">{t("inboxEmptyDesc")}</p>
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="rounded-[1.25rem] border border-border bg-elevated px-6 py-16 text-center">
          <p className="text-sm text-fg-muted">{t("inboxEmptyTitle")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="px-1 text-xs text-fg-subtle tabular-nums">
            {filteredComments.length} {t("inboxCount")}
          </p>
          <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden">
            {filteredComments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                isReplied={isCommentReplied(c)}
                isEditing={activeCommentId === c.id}
                replyText={activeCommentId === c.id ? replyText : ""}
                suggestions={smartSuggestions[c.id] || []}
                intent={intentMap[c.id]}
                selectedTone={toneMap[c.id] ?? "warm"}
                generatingFor={generatingFor}
                sendingFor={sendingFor}
                onSmartReply={(tone) => void generateSmartReply(c, tone)}
                onManualReply={() => {
                  setActiveCommentId(c.id);
                  setReplyText("");
                }}
                onSelectTone={(tone) => setToneMap((prev) => ({ ...prev, [c.id]: tone }))}
                onSelectSuggestion={setReplyText}
                onChangeReply={setReplyText}
                onCancel={() => {
                  setActiveCommentId(null);
                  setReplyText("");
                }}
                onSend={() => void handleSendReply(c)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
