import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/server/http";
import { searchThreadsWithSession, searchXWithSession, type CrawledPost } from "@/lib/crawler/service";

export const dynamic = "force-dynamic";

/** POST /api/crawler/search  { query, platform: 'threads' | 'x' | 'all', minLikes?, limit? } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || "").trim();
    if (!query) throw new HttpError("Arama sorgusu veya etiket boş olamaz.", 400);

    const platform = (body.platform || "threads") as "threads" | "x" | "all";
    const minLikes = Number(body.minLikes || 10);
    const limit = Math.min(Math.max(Number(body.limit || 20), 1), 50);

    const threadsSession = req.headers.get("x-threads-session") || body.threadsSession || "";
    const xAuthToken = req.headers.get("x-auth-token") || body.xAuthToken || "";
    const xCt0 = req.headers.get("x-ct0") || body.xCt0 || "";

    const results: CrawledPost[] = [];
    const errors: Record<string, string> = {};

    // 1. Search Threads using user session
    if (platform === "threads" || platform === "all") {
      if (threadsSession) {
        try {
          const thPosts = await searchThreadsWithSession({
            query,
            limit,
            threadsSession,
          });
          results.push(...thPosts);
        } catch (err: any) {
          errors.threads = err?.message || "Threads araması başarısız oldu.";
        }
      } else {
        errors.threads = "Threads oturum bilgisi (sessionid) tanımlı değil. Lütfen Ayarlar sayfasından girin.";
      }
    }

    // 2. Search X using user session
    if (platform === "x" || platform === "all") {
      if (xAuthToken) {
        try {
          const xPosts = await searchXWithSession({
            query,
            minLikes,
            limit,
            xAuthToken,
            xCt0,
          });
          results.push(...xPosts);
        } catch (err: any) {
          errors.x = err?.message || "X araması başarısız oldu.";
        }
      } else {
        errors.x = "X oturum bilgisi (auth_token) tanımlı değil. Lütfen Ayarlar sayfasından girin.";
      }
    }

    // If there were errors and zero results, throw the error
    if (results.length === 0 && Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      throw new HttpError(firstError, 400);
    }

    // Sort combined results by organic likes descending
    results.sort((a, b) => b.metrics.likes - a.metrics.likes);

    return NextResponse.json({
      success: true,
      query,
      platform,
      count: results.length,
      posts: results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
