import { NextResponse } from "next/server";
import { errorResponse, threadsFromRequest } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/threads/audience — fetches follower counts and demographics for the authenticated user */
export async function GET(req: Request) {
  try {
    const client = threadsFromRequest(req);
    const audience = await client.getUserInsights();
    return NextResponse.json({ audience });
  } catch (e) {
    return errorResponse(e);
  }
}
