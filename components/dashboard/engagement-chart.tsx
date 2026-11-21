"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/primitives";
import { useSettings } from "@/lib/store";
import type { ThreadPost } from "@/lib/threads/types";
import { formatNumber } from "@/lib/utils";

export function EngagementChart({ posts }: { posts: ThreadPost[] | null }) {
  const rawTheme = useSettings((s) => s.theme);
  const isLight = rawTheme === "light";

  const data = React.useMemo(
    () =>
      (posts ?? [])
        .filter((p) => p.metrics)
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((p) => ({
          date: new Date(p.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          views: p.metrics!.views,
          engagement: p.metrics!.likes + p.metrics!.replies + p.metrics!.reposts + p.metrics!.quotes,
        })),
    [posts],
  );

  const viewsColor = "#0095f6";
  const engColor = isLight ? "#0f0f0f" : "#f5f5f5";
  const grid = isLight ? "#efefef" : "#1a1a1a";
  const tick = isLight ? "#8e8e8e" : "#737373";
  const tipBg = isLight ? "#ffffff" : "#121212";
  const tipBorder = isLight ? "#e6e6e6" : "#262626";

  return (
    <section className="rounded-[1.25rem] border border-border bg-elevated p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">Gönderi eğrisi</h2>
        <div className="flex gap-3 text-[11px] font-semibold text-fg-subtle">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand" /> İzlenme
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-fg" /> Etkileşim
          </span>
        </div>
      </div>
      {!posts ? (
        <Skeleton className="h-52 w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-fg-subtle">Insight verisi yok.</div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -12, right: 4, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={viewsColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={viewsColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={engColor} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={engColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis yAxisId="v" tick={{ fill: tick, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <YAxis yAxisId="e" orientation="right" hide />
              <Tooltip
                contentStyle={{ background: tipBg, border: `1px solid ${tipBorder}`, borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: tick }}
                formatter={(v: number, name: string) => [formatNumber(v), name === "views" ? "İzlenme" : "Etkileşim"]}
              />
              <Area yAxisId="v" type="monotone" dataKey="views" stroke={viewsColor} strokeWidth={2.25} fill="url(#gViews)" />
              <Area yAxisId="e" type="monotone" dataKey="engagement" stroke={engColor} strokeWidth={1.75} fill="url(#gEng)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
