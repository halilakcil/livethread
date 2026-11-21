"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultModelFor, type LlmProvider } from "@/lib/llm/config";
import type { RewriteMode } from "@/lib/llm/prompts";
import type { PostMetrics, ThreadsUser } from "@/lib/threads/types";
import { uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Settings & credentials (persisted to localStorage)                  */
/* ------------------------------------------------------------------ */

export type AppTheme = "dark" | "light";
export type AppLocale = "tr" | "en";
export type ContentLanguage = "tr" | "en";

interface SettingsState {
  hydrated: boolean;
  theme: AppTheme;
  locale: AppLocale;
  contentLanguage: ContentLanguage;
  threadsToken: string;
  threadsUserId: string;
  threadsSessionCookie: string;
  xAuthToken: string;
  xCt0: string;
  user: ThreadsUser | null;
  llmProvider: LlmProvider;
  llmKey: string;
  llmModel: string;
  mockMode: boolean;
  /** Timestamps (ms) of recent calls, for local 24h quota tracking. */
  searchCalls: number[];
  publishCalls: number[];

  setTheme: (t: AppTheme) => void;
  setLocale: (l: AppLocale) => void;
  setContentLanguage: (l: ContentLanguage) => void;
  connect: (p: { token: string; userId?: string; user: ThreadsUser }) => void;
  setSessionCredentials: (p: { threadsSession?: string; xAuthToken?: string; xCt0?: string }) => void;
  enterDemo: () => void;
  setLlm: (p: { provider?: LlmProvider; key?: string; model?: string }) => void;
  setMockMode: (on: boolean) => void;
  trackCall: (kind: "search" | "publish", count?: number) => void;
  disconnect: () => void;
}

const DAY = 86400000;
const prune = (arr: number[]) => arr.filter((t) => Date.now() - t < DAY);

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hydrated: false,
      theme: "dark",
      locale: "tr",
      contentLanguage: "tr",
      threadsToken: "",
      threadsUserId: "",
      threadsSessionCookie: "",
      xAuthToken: "",
      xCt0: "",
      user: null,
      llmProvider: "openai",
      llmKey: "",
      llmModel: defaultModelFor("openai"),
      mockMode: process.env.NEXT_PUBLIC_DEFAULT_MOCK === "true",
      searchCalls: [],
      publishCalls: [],

      setTheme: (t) => set({ theme: t === "light" ? "light" : "dark" }),
      setLocale: (l) => set({ locale: l === "en" ? "en" : "tr" }),
      setContentLanguage: (l) => set({ contentLanguage: l === "en" ? "en" : "tr" }),
      connect: ({ token, userId, user }) =>
        set({ threadsToken: token, threadsUserId: userId || user.id, user, mockMode: false }),
      setSessionCredentials: ({ threadsSession, xAuthToken, xCt0 }) =>
        set((s) => ({
          threadsSessionCookie: threadsSession !== undefined ? threadsSession : s.threadsSessionCookie,
          xAuthToken: xAuthToken !== undefined ? xAuthToken : s.xAuthToken,
          xCt0: xCt0 !== undefined ? xCt0 : s.xCt0,
        })),
      enterDemo: () => set({ mockMode: true }),
      setLlm: ({ provider, key, model }) =>
        set((s) => {
          const nextProvider = provider ?? s.llmProvider;
          const providerChanged = nextProvider !== s.llmProvider;
          return {
            llmProvider: nextProvider,
            llmKey: key ?? s.llmKey,
            llmModel: model ?? (providerChanged ? defaultModelFor(nextProvider) : s.llmModel),
          };
        }),
      setMockMode: (on) => set({ mockMode: on }),
      trackCall: (kind, count = 1) =>
        set((s) => {
          const now = Date.now();
          const add = Array.from({ length: count }, () => now);
          return kind === "search"
            ? { searchCalls: [...prune(s.searchCalls), ...add] }
            : { publishCalls: [...prune(s.publishCalls), ...add] };
        }),
      disconnect: () =>
        set({
          threadsToken: "",
          threadsUserId: "",
          threadsSessionCookie: "",
          xAuthToken: "",
          xCt0: "",
          user: null,
          llmKey: "",
          mockMode: false,
          searchCalls: [],
          publishCalls: [],
        }),
    }),
    {
      name: "livethread.settings",
    },
  ),
);

export function usageLast24h(calls: number[]): number {
  return prune(calls).length;
}

export const LIMITS = { search: 2200, publish: 250 } as const;

/* ------------------------------------------------------------------ */
/* Drafts (persisted)                                                  */
/* ------------------------------------------------------------------ */

export interface StudioSource {
  text: string;
  author?: string;
  permalink?: string;
  metrics?: PostMetrics;
  origin: "dashboard" | "discover" | "manual" | "draft";
}

export interface Draft {
  id: string;
  createdAt: number;
  updatedAt: number;
  mode: RewriteMode;
  posts: string[];
  source?: StudioSource;
  publishedAt?: number;
  permalink?: string;
}

interface DraftsState {
  drafts: Draft[];
  save: (d: Omit<Draft, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Draft;
  remove: (id: string) => void;
  markPublished: (id: string, permalink?: string) => void;
  clear: () => void;
}

export const useDrafts = create<DraftsState>()(
  persist(
    (set, get) => ({
      drafts: [],
      save: (d) => {
        const now = Date.now();
        const existing = d.id ? get().drafts.find((x) => x.id === d.id) : undefined;
        const draft: Draft = existing
          ? { ...existing, ...d, id: existing.id, updatedAt: now }
          : { ...d, id: uid(), createdAt: now, updatedAt: now };
        set((s) => ({ drafts: [draft, ...s.drafts.filter((x) => x.id !== draft.id)] }));
        return draft;
      },
      remove: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
      markPublished: (id, permalink) =>
        set((s) => ({
          drafts: s.drafts.map((d) => (d.id === id ? { ...d, publishedAt: Date.now(), permalink } : d)),
        })),
      clear: () => set({ drafts: [] }),
    }),
    { name: "livethread.drafts" },
  ),
);

/* ------------------------------------------------------------------ */
/* Ephemeral UI state                                                  */
/* ------------------------------------------------------------------ */

interface UiState {
  studioOpen: boolean;
  studioSource: StudioSource | null;
  /** Draft being edited in the studio drawer, if any. */
  studioDraft: Draft | null;
  /** Preferred generation mode when opening Studio from a quick action. */
  studioPreferredMode: RewriteMode | null;
  /** Recently imported sources shown on the Studio page. */
  imports: (StudioSource & { id: string; importedAt: number })[];
  rateLimit: { message: string; at: number } | null;

  openStudio: (source: StudioSource, draft?: Draft, mode?: RewriteMode) => void;
  closeStudio: () => void;
  addImport: (source: StudioSource) => void;
  removeImport: (id: string) => void;
  setRateLimit: (message: string | null) => void;
}

export const useUi = create<UiState>()((set) => ({
  studioOpen: false,
  studioSource: null,
  studioDraft: null,
  studioPreferredMode: null,
  imports: [],
  rateLimit: null,

  openStudio: (source, draft, mode) =>
    set({
      studioOpen: false,
      studioSource: source,
      studioDraft: draft ?? null,
      studioPreferredMode: mode ?? null,
    }),
  closeStudio: () => set({ studioOpen: false, studioPreferredMode: null }),
  addImport: (source) =>
    set((s) => ({
      imports: [{ ...source, id: uid(), importedAt: Date.now() }, ...s.imports.filter((i) => i.text !== source.text)].slice(0, 20),
    })),
  removeImport: (id) => set((s) => ({ imports: s.imports.filter((i) => i.id !== id) })),
  setRateLimit: (message) => set({ rateLimit: message ? { message, at: Date.now() } : null }),
}));
