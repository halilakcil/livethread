"use client";

import * as React from "react";
import { Award, BarChart2, CheckCircle2, Flame, Sparkles, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Skeleton } from "@/components/ui/primitives";
import { useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

export interface HookScoreItem {
  hook: string;
  overallScore: number;
  curiosity: number;
  clarity: number;
  engagement: number;
  feedback: string;
  isWinner: boolean;
}

interface HookScorerProps {
  hooks: string[];
  onSelectHook?: (selectedHookText: string, index: number) => void;
  selectedIndex?: number;
}

export function HookScorer({ hooks, onSelectHook, selectedIndex = 0 }: HookScorerProps) {
  const llmKey = useSettings((s) => s.llmKey);
  const llmProvider = useSettings((s) => s.llmProvider);
  const llmModel = useSettings((s) => s.llmModel);

  const [loading, setLoading] = React.useState(false);
  const [scores, setScores] = React.useState<HookScoreItem[] | null>(null);
  const [summary, setSummary] = React.useState<string | null>(null);

  async function handleScoreHooks() {
    if (hooks.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/score-hooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-key": llmKey,
          "x-llm-provider": llmProvider,
          "x-llm-model": llmModel,
        },
        body: JSON.stringify({ hooks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Kancalar skorlanamadı.");
      setScores(data.scores || []);
      setSummary(data.summary || null);
      toast.success("Kancalar başarıyla puanlandı ve karşılaştırıldı!");
    } catch (err: any) {
      toast.error("Skorlama başarısız", { description: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  if (hooks.length === 0) return null;

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-brand" /> A/B Kanca Skorlama & Analiz
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleScoreHooks}
          loading={loading}
          className="text-xs"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          {scores ? "Yeniden Skorla" : "Kancaları Skorla & Karşılaştır"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2 rounded-xl border border-border bg-surface/40 p-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {summary && !loading && (
        <div className="rounded-xl border border-brand/25 bg-brand/10 p-3 text-xs text-brand leading-relaxed">
          💡 <strong>Stratejist Özeti:</strong> {summary}
        </div>
      )}

      {scores && !loading && (
        <div className="grid gap-2.5">
          {scores.map((item, idx) => {
            const isSelected = selectedIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => onSelectHook && onSelectHook(item.hook, idx)}
                className={cn(
                  "rounded-xl border p-3.5 transition-all cursor-pointer relative",
                  item.isWinner
                    ? "border-amber-500/50 bg-amber-950/10 shadow-sm"
                    : "border-border/80 bg-surface/60 hover:border-zinc-700",
                  isSelected && "ring-1 ring-white"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-zinc-300 font-mono">
                      {idx + 1}
                    </span>
                    {item.isWinner && (
                      <Badge tone="warning" className="gap-1 text-[11px] font-semibold py-0.5">
                        <Award className="h-3 w-3" /> En Yüksek Potansiyel
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Skor:</span>
                    <span
                      className={cn(
                        "text-sm font-bold font-mono",
                        item.overallScore >= 85 ? "text-emerald-400" : "text-amber-400"
                      )}
                    >
                      {item.overallScore}/100
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-200 font-medium leading-relaxed mb-2.5">
                  &ldquo;{item.hook}&rdquo;
                </p>

                {/* Sub-scores */}
                <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-2 text-[10px] text-zinc-400">
                  <div>
                    <span className="block text-zinc-500">Merak Açığı</span>
                    <span className="font-mono font-semibold text-zinc-200">%{item.curiosity}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">Netlik</span>
                    <span className="font-mono font-semibold text-zinc-200">%{item.clarity}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">Yorum İsteği</span>
                    <span className="font-mono font-semibold text-zinc-200">%{item.engagement}</span>
                  </div>
                </div>

                {item.feedback && (
                  <p className="mt-2 text-[11px] text-zinc-400 leading-normal italic">
                    &bull; {item.feedback}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
