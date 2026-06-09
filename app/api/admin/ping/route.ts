import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";

/**
 * GET /api/admin/ping — a minimal admin-only endpoint used to demonstrate and
 * test role-based authorization (issue #4): a Stamper/Redeemer/User session is
 * rejected with 403, only an Admin session is allowed. Later admin endpoints
 * (#5, #6, #8) reuse the same `requireRole` guard.
 *
 * The session is read from the request's httpOnly cookie and verified via the
 * shared `readSession` (same verifier as `getSession`).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!requireRole(session, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
