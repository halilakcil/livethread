"use client";

import { createStore, del, get, set } from "idb-keyval";
import type { ThreadPost } from "@/lib/threads/types";

/** IndexedDB cache for synced posts + insights, keyed per account. */

const store = typeof indexedDB !== "undefined" ? createStore("livethread", "cache") : undefined;

export interface CachedPosts {
  posts: ThreadPost[];
  syncedAt: number;
}

const key = (accountId: string) => `posts:${accountId}`;

export async function loadCachedPosts(accountId: string): Promise<CachedPosts | undefined> {
  if (!store) return undefined;
  try {
    return await get<CachedPosts>(key(accountId), store);
  } catch {
    return undefined;
  }
}

export async function saveCachedPosts(accountId: string, data: CachedPosts): Promise<void> {
  if (!store) return;
  try {
    await set(key(accountId), data, store);
  } catch {
    /* quota or private mode — cache is best effort */
  }
}

export async function clearCachedPosts(accountId: string): Promise<void> {
  if (!store) return;
  await del(key(accountId), store).catch(() => undefined);
}
