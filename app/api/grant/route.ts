/**
 * POST /api/grant — Stamper grants their bound Stamp to a User by 6-char code.
 *
 * Request:  JSON { userCode: string }
 * Response: 200 { granted, alreadyHad, card, completionCaptured }
 *           400 missing/invalid userCode, or stamper_not_bound
 *           403 not authenticated as stamper
 *           404 user not found
 */
import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { grantStamp, GrantError } from "@/lib/grants/grant";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!requireRole(session, "stamper")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const b = body as { userCode?: unknown };
  const userCode =
    typeof b?.userCode === "string" ? b.userCode.trim() : "";
  if (!userCode) {
    return NextResponse.json(
      { error: "userCode is required" },
      { status: 400 },
    );
  }

  try {
    const result = await grantStamp(getDb(), {
      stamperStaffId: session!.sub,
      userCode,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof GrantError) {
      switch (err.code) {
        case "user_not_found":
          return NextResponse.json({ error: err.code }, { status: 404 });
        case "stamper_not_bound":
          return NextResponse.json({ error: err.code }, { status: 400 });
        case "stamp_not_found":
          return NextResponse.json({ error: err.code }, { status: 400 });
        case "stamp_inactive":
          return NextResponse.json({ error: err.code }, { status: 400 });
      }
    }
    throw err;
  }
}
