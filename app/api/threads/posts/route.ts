import { NextResponse } from "next/server";
import { errorResponse, threadsFromRequest } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/threads/posts?limit=50 — own threads with insights. Set limit=all or limit=0 for full archive. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all" || limitParam === "0" || limitParam === "all_threads";
    const limit = isAll ? 0 : Math.min(Math.max(Number(limitParam) || 50, 1), 5000);
    const posts = await threadsFromRequest(req).getMyThreadsWithInsights(limit);
    return NextResponse.json({ posts, syncedAt: Date.now(), total: posts.length });
  } catch (e) {
    return errorResponse(e);
  }
}
