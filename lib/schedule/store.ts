"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { publishPosts } from "@/lib/api-client";
import type { RewriteMode } from "@/lib/llm/prompts";
import { uid } from "@/lib/utils";

export interface ScheduledPost {
  id: string;
  mode: RewriteMode;
  posts: string[];
  scheduledFor: string; // ISO String
  status: "scheduled" | "publishing" | "published" | "failed";
  createdAt: string;
  publishedAt?: string;
  permalink?: string;
  error?: string;
}

interface ScheduleState {
  items: ScheduledPost[];
  schedule: (params: { mode: RewriteMode; posts: string[]; scheduledFor: string }) => ScheduledPost;
  cancel: (id: string) => void;
  reschedule: (id: string, newScheduledFor: string) => void;
  remove: (id: string) => void;
  publishItem: (id: string) => Promise<boolean>;
  checkDuePosts: () => Promise<number>;
}

export const useSchedule = create<ScheduleState>()(
  persist(
    (set, get) => ({
      items: [],

      schedule: ({ mode, posts, scheduledFor }) => {
        const item: ScheduledPost = {
          id: uid(),
          mode,
          posts,
          scheduledFor,
          status: "scheduled",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          items: [item, ...s.items.filter((x) => x.id !== item.id)].sort(
            (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
          ),
        }));
        return item;
      },

      cancel: (id) =>
        set((s) => ({
          items: s.items.filter((x) => x.id !== id),
        })),

      reschedule: (id, newScheduledFor) =>
        set((s) => ({
          items: s.items
            .map((x) => (x.id === id ? { ...x, scheduledFor: newScheduledFor, status: "scheduled" as const, error: undefined } : x))
            .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()),
        })),

      remove: (id) =>
        set((s) => ({
          items: s.items.filter((x) => x.id !== id),
        })),

      publishItem: async (id) => {
        const item = get().items.find((x) => x.id === id);
        if (!item || item.status === "publishing" || item.status === "published") return false;

        set((s) => ({
          items: s.items.map((x) => (x.id === id ? { ...x, status: "publishing" as const } : x)),
        }));

        try {
          const res = await publishPosts(item.posts);
          set((s) => ({
            items: s.items.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: "published" as const,
                    publishedAt: new Date().toISOString(),
                    permalink: res.permalink,
                    error: undefined,
                  }
                : x
            ),
          }));
          return true;
        } catch (err: any) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          set((s) => ({
            items: s.items.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: "failed" as const,
                    error: errorMsg,
                  }
                : x
            ),
          }));
          return false;
        }
      },

      checkDuePosts: async () => {
        const now = Date.now();
        const pending = get().items.filter(
          (x) => x.status === "scheduled" && new Date(x.scheduledFor).getTime() <= now
        );

        let publishedCount = 0;
        for (const item of pending) {
          const success = await get().publishItem(item.id);
          if (success) publishedCount++;
        }
        return publishedCount;
      },
    }),
    {
      name: "livethread.schedule",
    }
  )
);
