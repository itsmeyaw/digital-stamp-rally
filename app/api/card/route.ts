/**
 * GET /api/card — returns the authenticated User's current card state.
 *
 * Response: 200 { card: CardResult }
 *           403 not authenticated as a user
 */
import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getCard } from "@/lib/user/card";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session || session.role !== "user") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const card = await getCard(getDb(), session.sub);
  return NextResponse.json({ card }, { status: 200 });
}
