import { NextResponse } from "next/server";
import { errorResponse, threadsFromRequest } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Validates the token by calling GET /me. */
export async function POST(req: Request) {
  try {
    const user = await threadsFromRequest(req).getMe();
    return NextResponse.json({ user });
  } catch (e) {
    return errorResponse(e);
  }
}
