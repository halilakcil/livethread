"use client";

import { mockAudienceInsights, mockMyPosts, mockRewrite, mockSearch, MOCK_USER } from "@/lib/mock/data";
import type { RewriteMode, RewriteResult } from "@/lib/llm/prompts";
import type { ApiErrorBody, PublishResult, SearchParams, ThreadPost, ThreadsUser, UserAudienceInsights } from "@/lib/threads/types";
import { useSettings, useUi } from "@/lib/store";

/**
 * Browser-side API layer. Attaches credentials from the settings store as
 * headers, short-circuits to demo data in mock mode, and surfaces rate limits.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public rateLimited = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function headers(override?: { token?: string; userId?: string }): HeadersInit {
  const s = useSettings.getState();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = override?.token ?? s.threadsToken;
  const userId = override?.userId ?? s.threadsUserId;
  if (token) h["x-threads-token"] = token;
  if (userId) h["x-threads-user-id"] = userId;
  if (s.llmKey) h["x-llm-key"] = s.llmKey;
  h["x-llm-provider"] = s.llmProvider;
  if (s.llmModel) h["x-llm-model"] = s.llmModel;
  return h;
}

async function call<T>(path: string, init?: RequestInit & { creds?: { token?: string; userId?: string } }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: headers(init?.creds) });
  } catch {
    throw new ApiError("Network error — is the dev server running?", 0);
  }
  const json = (await res.json().catch(() => ({}))) as T | ApiErrorBody;
  if (!res.ok) {
    const err = (json as ApiErrorBody).error;
    const rateLimited = res.status === 429 || !!err?.rateLimited;
    const message = err?.message || `Request failed (HTTP ${res.status})`;
    if (rateLimited) useUi.getState().setRateLimit(message);
    throw new ApiError(message, res.status, rateLimited);
  }
  return json as T;
}

const isMock = () => useSettings.getState().mockMode;

export async function validateToken(token: string, userId?: string): Promise<ThreadsUser> {
  const { user } = await call<{ user: ThreadsUser }>("/api/auth/validate", {
    method: "POST",
    creds: { token, userId: userId || "" },
  });
  return user;
}

export async function fetchMyPosts(limit: number | "all" = 50): Promise<{ posts: ThreadPost[]; syncedAt: number; total?: number }> {
  if (isMock()) {
    await delay(700);
    const mock = mockMyPosts();
    const posts = limit === "all" || limit === 0 ? mock : mock.slice(0, Number(limit));
    return { posts, syncedAt: Date.now(), total: posts.length };
  }
  return call(`/api/threads/posts?limit=${limit}`);
}

export async function fetchAudienceInsights(): Promise<{ audience: UserAudienceInsights }> {
  if (isMock()) {
    await delay(500);
    return { audience: mockAudienceInsights() };
  }
  return call<{ audience: UserAudienceInsights }>("/api/threads/audience");
}

export async function searchThreads(p: SearchParams): Promise<ThreadPost[]> {
  if (isMock() && p.engine !== "ai") {
    await delay(500);
    return mockSearch(p);
  }
  const qs = new URLSearchParams({
    q: p.q,
    mode: p.searchMode,
    type: p.searchType,
    limit: String(p.limit),
    engine: p.engine || "meta",
  });
  const { results } = await call<{ results: ThreadPost[] }>(`/api/threads/search?${qs}`);
  if (p.engine !== "ai") {
    useSettings.getState().trackCall("search");
  }
  return results;
}

export async function rewriteText(
  text: string,
  mode: RewriteMode,
  instructions?: string,
  language?: "tr" | "en",
): Promise<RewriteResult> {
  const s = useSettings.getState();
  const outputLanguage = language ?? s.contentLanguage ?? "tr";
  // Demo mode without an LLM key → canned output so the flow is still explorable.
  if (s.mockMode && !s.llmKey) {
    await delay(900);
    return mockRewrite(mode, text);
  }
  return call<RewriteResult>("/api/ai/rewrite", {
    method: "POST",
    body: JSON.stringify({ text, mode, instructions, language: outputLanguage }),
  });
}

export async function publishPosts(posts: string[]): Promise<PublishResult & { simulated?: boolean }> {
  if (isMock()) {
    await delay(1200);
    return { ids: posts.map((_, i) => `demo-published-${Date.now()}-${i}`), simulated: true };
  }
  const result = await call<PublishResult>("/api/threads/publish", {
    method: "POST",
    body: JSON.stringify({ posts }),
  });
  useSettings.getState().trackCall("publish", posts.length);
  return result;
}

export function currentAccountId(): string {
  const s = useSettings.getState();
  return s.mockMode ? MOCK_USER.id : s.user?.id || s.threadsUserId || "me";
}

export async function searchOrganicPosts(params: {
  query: string;
  platform?: "threads" | "x" | "all";
  minLikes?: number;
  limit?: number;
}): Promise<{ posts: any[]; count: number }> {
  const s = useSettings.getState();
  const res = await fetch("/api/crawler/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-threads-session": s.threadsSessionCookie,
      "x-auth-token": s.xAuthToken,
      "x-ct0": s.xCt0,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || data.error || "Arama başarısız oldu.");
  }
  return data;
}
