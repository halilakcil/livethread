import { NextResponse } from "next/server";
import { errorResponse, HttpError, threadsFromRequest } from "@/lib/server/http";
import { THREADS_CHAR_LIMIT } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/threads/publish  { posts: string[] } — single post or chained thread. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { posts?: unknown };
    const posts = Array.isArray(body.posts) ? body.posts.map((p) => String(p).trim()).filter(Boolean) : [];
    if (posts.length === 0) throw new HttpError("Nothing to publish.", 400);
    if (posts.length > 10) throw new HttpError("A thread can contain at most 10 posts here.", 400);
    const tooLong = posts.findIndex((p) => p.length > THREADS_CHAR_LIMIT);
    if (tooLong !== -1) throw new HttpError(`Post ${tooLong + 1} exceeds ${THREADS_CHAR_LIMIT} characters.`, 400);

    const result = await threadsFromRequest(req).publishThread(posts);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
