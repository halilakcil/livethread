"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  TrendingUp,
  Globe,
  PieChart,
  ShieldCheck,
  Info,
  RefreshCw,
  Lock,
} from "lucide-react";
import { fetchAudienceInsights } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/store";
import type { UserAudienceInsights } from "@/lib/threads/types";
import { formatNumber, formatPercent, cn } from "@/lib/utils";
import { Badge, Button, Skeleton } from "@/components/ui/primitives";

export function AudienceView() {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const rawTheme = useSettings((s) => s.theme);
  const isLight = rawTheme === "light";

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<UserAudienceInsights | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAudienceInsights();
      setData(res.audience);
    } catch (err: any) {
      setError(err?.message || "Kitle verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Color scheme
  const brandColor = "#0095f6";
  const maleColor = "#3b82f6";
  const femaleColor = "#ec4899";
  const grid = isLight ? "#efefef" : "#1e1e1e";
  const tick = isLight ? "#8e8e8e" : "#737373";
  const tipBg = isLight ? "#ffffff" : "#141414";
  const tipBorder = isLight ? "#e5e5e5" : "#262626";

  const totalFollowers = data?.followersCount ?? 0;
  const netGain = (data?.dailyFollowersGrowth ?? []).reduce(
    (acc, p) => acc + (p.change || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top 4 Metrics Rail */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[1.25rem] border border-border bg-elevated p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            <span>{isEn ? "Followers" : "Takipçi"}</span>
            <Users className="h-4 w-4 text-brand" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <span className="font-display text-2xl font-bold tracking-tight tabular-nums">
                  {formatNumber(totalFollowers)}
                </span>
                {data?.followersTrend !== undefined && (
                  <span className="text-[11px] font-bold text-success">
                    +{formatPercent(data.followersTrend / 100, 1)}
                  </span>
                )}
              </>
            )}
          </div>
          <p className="mt-1 text-[11px] text-fg-subtle">
            {isEn ? "Total audience size" : "Toplam kitle büyüklüğü"}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-border bg-elevated p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            <span>{isEn ? "Net Growth (14d)" : "Net Artış (14 Gün)"}</span>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-success">
                +{formatNumber(netGain)}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-fg-subtle">
            {isEn ? "New followers gained" : "Son 14 günde yeni takipçi"}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-border bg-elevated p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            <span>{isEn ? "Engagement / Follower" : "Kitle Etkileşimi"}</span>
            <PieChart className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="font-display text-2xl font-bold tracking-tight tabular-nums">
                {formatPercent(data?.engagementPerFollower ?? 0.038, 1)}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-fg-subtle">
            {isEn ? "Interactions per follower" : "Takipçi başına etkileşim"}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-border bg-elevated p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            <span>{isEn ? "Top Region" : "Ana Bölge"}</span>
            <Globe className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <span className="font-display text-2xl font-bold tracking-tight truncate">
                {data?.demographics?.countries[0]?.key || "TR"}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-fg-subtle truncate">
            {data?.demographics?.countries[0]?.label || (isEn ? "Türkiye" : "Türkiye")}
          </p>
        </div>
      </div>

      {/* Follower Growth Chart */}
      <section className="rounded-[1.25rem] border border-border bg-elevated p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold">
              {isEn ? "Follower Growth Timeline" : "Takipçi Büyüme Eğrisi"}
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              {isEn
                ? "Daily trajectory of your audience over the last 14 days"
                : "Son 14 gün boyunca kitle büyüklüğünüzün günlük seyri"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadData} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5" />
            {isEn ? "Refresh" : "Yenile"}
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : (data?.dailyFollowersGrowth ?? []).length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-fg-subtle">
            {isEn ? "No follower history available yet." : "Takipçi geçmişi verisi henüz yok."}
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.dailyFollowersGrowth}
                margin={{ left: -10, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brandColor} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={brandColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke={tick}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={tick}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div
                        className="rounded-xl p-3 shadow-xl text-xs font-sans"
                        style={{ background: tipBg, border: `1px solid ${tipBorder}` }}
                      >
                        <div className="font-semibold text-fg">{p.date}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-fg-muted">{isEn ? "Followers:" : "Takipçi:"}</span>
                          <span className="font-mono font-bold text-brand">
                            {formatNumber(p.followers)}
                          </span>
                        </div>
                        {p.change > 0 && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-fg-muted">{isEn ? "Daily Net:" : "Günlük Net:"}</span>
                            <span className="font-mono font-bold text-success">
                              +{p.change}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke={brandColor}
                  strokeWidth={2.5}
                  fill="url(#gFollowers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Demographics & Geographic Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Geographic / Country Breakdown */}
        <section className="rounded-[1.25rem] border border-border bg-elevated p-4 md:p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Globe className="h-4 w-4 text-brand" />
              {isEn ? "Top Locations & Countries" : "Bölgesel Kitle Dağılımı"}
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              {isEn ? "Top countries by audience concentration" : "Kitle yoğunluğuna göre öne çıkan ülkeler"}
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : !data?.demographics?.countries?.length ? (
            <div className="py-12 text-center text-xs text-fg-subtle">
              {isEn
                ? "Demographics require an active account with at least 100 followers."
                : "Demografik veriler için en az 100 takipçili aktif bir hesap gereklidir."}
            </div>
          ) : (
            <div className="space-y-3">
              {data.demographics.countries.map((c) => (
                <div key={c.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-fg truncate">{c.label}</span>
                    <span className="font-mono text-fg-muted">
                      %{c.percentage} ({formatNumber(c.value)})
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Age & Gender Breakdown */}
        <section className="rounded-[1.25rem] border border-border bg-elevated p-4 md:p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-400" />
              {isEn ? "Age & Gender Distribution" : "Yaş & Cinsiyet Dağılımı"}
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              {isEn ? "Audience segments by age cohorts" : "Yaş gruplarına ve cinsiyete göre dağılım"}
            </p>
          </div>

          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.demographics?.ageGender?.length ? (
            <div className="py-12 text-center text-xs text-fg-subtle">
              {isEn
                ? "Demographics require an active account with at least 100 followers."
                : "Demografik veriler için en az 100 takipçili aktif bir hesap gereklidir."}
            </div>
          ) : (
            <div className="h-48">
              <div className="flex justify-end gap-3 text-[11px] font-semibold text-fg-subtle mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> {isEn ? "Men" : "Erkek"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-pink-500" /> {isEn ? "Women" : "Kadın"}
                </span>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart
                  data={data.demographics.ageGender}
                  margin={{ left: -15, right: 0, top: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke={grid} vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ageGroup"
                    stroke={tick}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={tick}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div
                          className="rounded-xl p-3 shadow-xl text-xs font-sans"
                          style={{ background: tipBg, border: `1px solid ${tipBorder}` }}
                        >
                          <div className="font-semibold text-fg mb-1">{item.ageGroup} Yaş Grubu</div>
                          <div className="flex items-center justify-between gap-4 text-blue-400">
                            <span>Erkek:</span>
                            <span className="font-mono font-bold">{formatNumber(item.male)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-pink-400">
                            <span>Kadın:</span>
                            <span className="font-mono font-bold">{formatNumber(item.female)}</span>
                          </div>
                          <div className="border-t border-border mt-1 pt-1 flex items-center justify-between gap-4 text-fg font-semibold">
                            <span>Toplam:</span>
                            <span className="font-mono">{formatNumber(item.total)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="male" fill={maleColor} radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="female" fill={femaleColor} radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Meta Threads API Transparency & Privacy Notice Card */}
      <div className="rounded-[1.25rem] border border-brand/20 bg-brand/5 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-brand shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-fg-muted leading-relaxed">
            <h4 className="font-semibold text-fg text-sm">
              {isEn
                ? "Official Meta Threads API & Privacy Standards"
                : "Meta Threads Resmi API'si & Kitle Verisi Standartları"}
            </h4>
            <p>
              {isEn
                ? "Due to strict privacy and anti-scraping safeguards, Meta does NOT expose an individual followers list (/followers) or following list (/following) via its official Graph API. Third-party applications cannot see who unfollowed you or inspect individual follower profiles."
                : "Meta'nın resmi Graph API politikaları ve veri gizliliği kuralları gereği, API üzerinden bireysel takipçi listesi (/followers) veya takip edilen kullanıcı profilleri verilmemektedir. Hiçbir yasal uygulama 'Sizi takipten çıkanlar' veya tek tek takipçi kullanıcı adları listesini resmi yoldan çekemez."}
            </p>
            <p>
              {isEn
                ? "LiveThread leverages official threads_manage_insights permissions to securely read aggregated audience metrics, follower growth trends, and anonymous demographics (for accounts with 100+ followers) directly into your browser without transmitting credentials to any third-party server."
                : "LiveThread, threads_manage_insights izniyle toplam takipçi sayınızı, büyüme hızınızı ve anonimleştirilmiş kitle demografisini doğrudan Meta sunucularından çeker ve yalnızca tarayıcınızda işler."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
