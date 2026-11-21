import { NextResponse } from "next/server";
import { errorResponse, HttpError, llmFromRequest, threadsFromRequest } from "@/lib/server/http";
import { complete } from "@/lib/llm/providers";
import { defaultModelFor } from "@/lib/llm/config";
import { buildDiscoverPrompt, parseDiscoverOutput } from "@/lib/llm/discover";
import { mockSearch } from "@/lib/mock/data";
import type { SearchMode, SearchType } from "@/lib/threads/types";

export const dynamic = "force-dynamic";

/** GET /api/threads/search?q=physics&mode=TAG&type=TOP&limit=10&engine=meta|ai */
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const q = (sp.get("q") || "").trim().replace(/^#/, "");
    if (!q) throw new HttpError("Enter a topic or keyword to search.", 400);

    const engine = sp.get("engine") || "meta";
    const searchMode: SearchMode = sp.get("mode") === "KEYWORD" ? "KEYWORD" : "TAG";
    const searchType: SearchType = sp.get("type") === "RECENT" ? "RECENT" : "TOP";
    const limit = Math.min(Math.max(Number(sp.get("limit")) || 5, 1), 20);

    // AI Engine: searches and synthesizes viral thread inspirations for ANY custom keyword in any language
    if (engine === "ai") {
      let posts = [];
      try {
        const { provider, apiKey, model } = llmFromRequest(req);
        const raw = await complete({
          provider,
          apiKey,
          model: model || defaultModelFor(provider),
          system: "You are a social media research assistant generating top-performing Threads post inspirations in JSON format.",
          user: buildDiscoverPrompt(q, limit),
        });
        posts = parseDiscoverOutput(raw);
      } catch {
        // Fallback to deterministic mock generator if LLM key is not provided
        posts = mockSearch({ q, searchMode, searchType, limit });
      }
      return NextResponse.json({ results: posts, source: "ai" });
    }

    // Standard Meta API Search
    const results = await threadsFromRequest(req).keywordSearch({ q, searchMode, searchType, limit });
    return NextResponse.json({ results, source: "meta" });
  } catch (e) {
    return errorResponse(e);
  }
}
