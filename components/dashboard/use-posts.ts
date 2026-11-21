"use client";

import * as React from "react";
import { toast } from "sonner";
import { currentAccountId, fetchMyPosts } from "@/lib/api-client";
import { loadCachedPosts, saveCachedPosts } from "@/lib/cache";
import { useSettings } from "@/lib/store";
import type { PostMetrics, ThreadPost } from "@/lib/threads/types";

/** Loads own posts from IndexedDB cache first, then syncs from the API if nothing is cached. */
export function useMyPosts(limit = 50) {
  const mockMode = useSettings((s) => s.mockMode);
  const accountKey = useSettings((s) => (s.mockMode ? "demo" : s.user?.id ?? ""));
  const [posts, setPosts] = React.useState<ThreadPost[] | null>(null);
  const [syncedAt, setSyncedAt] = React.useState<number | undefined>();
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sync = React.useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetchMyPosts(limit);
      setPosts(res.posts);
      setSyncedAt(res.syncedAt);
      await saveCachedPosts(currentAccountId(), res);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error("Sync failed", { description: msg });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [limit]);

  React.useEffect(() => {
    let cancelled = false;
    setPosts(null);
    (async () => {
      const cached = await loadCachedPosts(currentAccountId());
      if (cancelled) return;
      if (cached?.posts?.length) {
        setPosts(cached.posts);
        setSyncedAt(cached.syncedAt);
      } else {
        await sync();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountKey, mockMode, sync]);

  return { posts, syncedAt, syncing, error, sync };
}

export type Totals = PostMetrics & { engagementRate: number; posts: number };

export function engagementOf(m?: PostMetrics): number {
  if (!m) return 0;
  return m.likes + m.replies + m.reposts + m.quotes;
}

export function engagementRate(m?: PostMetrics): number {
  if (!m || !m.views) return 0;
  return engagementOf(m) / m.views;
}

export function computeTotals(posts: ThreadPost[]): Totals {
  const t = posts.reduce(
    (acc, p) => {
      const m = p.metrics;
      if (!m) return acc;
      acc.views += m.views;
      acc.likes += m.likes;
      acc.replies += m.replies;
      acc.reposts += m.reposts;
      acc.quotes += m.quotes;
      return acc;
    },
    { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0 },
  );
  return { ...t, engagementRate: t.views ? engagementOf(t) / t.views : 0, posts: posts.length };
}

/** Splits posts into the current vs previous window (default 30 days) for trend indicators. */
export function computeTrends(posts: ThreadPost[], days = 30) {
  const now = Date.now();
  const span = days * 86400000;
  const inRange = (p: ThreadPost, from: number, to: number) => {
    const t = new Date(p.timestamp).getTime();
    return t >= from && t < to;
  };
  const current = computeTotals(posts.filter((p) => inRange(p, now - span, now + 1)));
  const previous = computeTotals(posts.filter((p) => inRange(p, now - 2 * span, now - span)));
  const delta = (a: number, b: number) => (b > 0 ? (a - b) / b : undefined);
  return {
    views: delta(current.views, previous.views),
    likes: delta(current.likes, previous.likes),
    replies: delta(current.replies, previous.replies),
    engagementRate: delta(current.engagementRate, previous.engagementRate),
  };
}
