"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/primitives";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import type { Totals } from "./use-posts";

/** Compact stat rail used by pages that still import MetricCards. */
export function MetricCards({
  totals,
  trends,
}: {
  totals: Totals | null;
  trends?: { views?: number; likes?: number; replies?: number; engagementRate?: number };
}) {
  if (!totals) {
    return (
      <div className="stat-rail">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>
    );
  }
  const cells = [
    { label: "İzlenme", value: formatNumber(totals.views), trend: trends?.views },
    { label: "Beğeni", value: formatNumber(totals.likes), trend: trends?.likes },
    { label: "Yanıt", value: formatNumber(totals.replies), trend: trends?.replies },
    { label: "Etkileşim", value: formatPercent(totals.engagementRate, 2), trend: trends?.engagementRate },
  ];
  return (
    <div className="stat-rail">
      {cells.map((c) => {
        const up = c.trend !== undefined && c.trend >= 0;
        return (
          <div key={c.label}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{c.label}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight tabular-nums">{c.value}</span>
              {c.trend !== undefined && (
                <span className={cn("text-[11px] font-bold tabular-nums", up ? "text-success" : "text-danger")}>
                  {up ? "+" : "-"}
                  {formatPercent(Math.abs(c.trend), 0)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
