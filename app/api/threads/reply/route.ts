import { NextResponse } from "next/server";
import { errorResponse, HttpError, threadsFromRequest } from "@/lib/server/http";
import { sanitizeThreadText } from "@/lib/llm/verifier";

export const dynamic = "force-dynamic";

/** POST /api/threads/reply  { replyToId, text } */
export async function POST(req: Request) {
  try {
    const client = threadsFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const replyToId = String(body.replyToId || "").trim();
    const rawText = String(body.text || "").trim();

    if (!replyToId) throw new HttpError("replyToId belirtilmelidir.", 400);
    if (!rawText) throw new HttpError("Yanıt metni boş olamaz.", 400);

    // Sanitize with user writing rules (no quotes, colons, semicolons, single line flow)
    const cleanText = sanitizeThreadText(rawText);

    const result = await client.publishReply(cleanText, replyToId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
