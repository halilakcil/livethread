import { NextResponse } from "next/server";
import { ThreadsApiError, ThreadsClient } from "@/lib/threads/client";
import { LlmError } from "@/lib/llm/providers";
import type { LlmProvider } from "@/lib/llm/config";
import type { ApiErrorBody } from "@/lib/threads/types";

/**
 * Credentials come from request headers (set by the browser from localStorage).
 * Environment variables act as optional fallbacks for single-user deployments.
 */
export function threadsFromRequest(req: Request): ThreadsClient {
  const token = req.headers.get("x-threads-token") || process.env.THREADS_ACCESS_TOKEN;
  if (!token) throw new HttpError("Missing Threads access token. Connect your account in Settings.", 401);
  const rawUserId = req.headers.get("x-threads-user-id");
  const userId = rawUserId && /^\d+$/.test(rawUserId) ? rawUserId : "me";
  return new ThreadsClient(token, userId);
}

const ENV_KEYS: Record<LlmProvider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

export function llmFromRequest(req: Request): { provider: LlmProvider; apiKey: string; model?: string } {
  const provider = (req.headers.get("x-llm-provider") || "openai") as LlmProvider;
  if (!(provider in ENV_KEYS)) throw new HttpError(`Unsupported LLM provider "${provider}".`, 400);
  const apiKey = req.headers.get("x-llm-key") || ENV_KEYS[provider];
  if (!apiKey) throw new HttpError("Missing LLM API key. Add one in Settings to use the AI Studio.", 401);
  return { provider, apiKey, model: req.headers.get("x-llm-model") || undefined };
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function errorResponse(e: unknown): NextResponse<ApiErrorBody> {
  if (e instanceof ThreadsApiError) {
    return NextResponse.json(
      { error: { message: e.message, code: e.code, rateLimited: e.rateLimited } },
      { status: e.rateLimited ? 429 : e.status >= 400 ? e.status : 502 },
    );
  }
  if (e instanceof LlmError) {
    return NextResponse.json(
      { error: { message: e.message, rateLimited: e.rateLimited } },
      { status: e.status >= 400 ? e.status : 502 },
    );
  }
  if (e instanceof HttpError) {
    return NextResponse.json({ error: { message: e.message } }, { status: e.status });
  }
  console.error(e);
  const message = e instanceof Error ? e.message : "Unexpected server error";
  return NextResponse.json({ error: { message } }, { status: 500 });
}
