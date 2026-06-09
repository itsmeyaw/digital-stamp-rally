/**
 * GET  /api/redeem?code=XXXXXX — Lookup a User by 6-char code and return their
 *   redemption status (eligible / blocked / already_redeemed).
 *
 * POST /api/redeem  { userCode: string } — Redeem a prize for the given User.
 *   Returns 200 { redeemed, alreadyRedeemed } on success.
 *   Returns 422 { error: "not_completed", card } if the User hasn't completed.
 *   Returns 404 if user not found, 400 if body is invalid.
 *
 * Both endpoints require a "redeemer" OR "admin" session; otherwise 403.
 */
import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { lookupUser, redeemUser, RedeemError } from "@/lib/redeem/redeem";
import { getCard } from "@/lib/user/card";
import { getUserByCode } from "@/lib/user/get-user";

/** Returns true when the session has a role that may perform redemptions. */
function canRedeem(
  session: ReturnType<typeof readSession>,
): session is NonNullable<ReturnType<typeof readSession>> {
  return session?.role === "redeemer" || session?.role === "admin";
}

// ─── GET /api/redeem?code=XXXXXX ─────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!canRedeem(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code || code.trim().length === 0) {
    return NextResponse.json(
      { error: "code query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const result = await lookupUser(getDb(), code.trim());
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof RedeemError && err.code === "user_not_found") {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }
    throw err;
  }
}

// ─── POST /api/redeem ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!canRedeem(session)) {
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
    const result = await redeemUser(getDb(), userCode);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof RedeemError) {
      switch (err.code) {
        case "user_not_found":
          return NextResponse.json({ error: err.code }, { status: 404 });
        case "not_completed": {
          // Fetch the user's current card so the Redeemer can communicate progress
          const db = getDb();
          const user = await getUserByCode(db, userCode);
          const card = user ? await getCard(db, user.id) : null;
          return NextResponse.json(
            { error: "not_completed", card },
            { status: 422 },
          );
        }
      }
    }
    throw err;
  }
}
