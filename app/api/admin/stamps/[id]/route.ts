/**
 * PATCH /api/admin/stamps/[id] — deactivate a Stamp (issue #9).
 *
 * Only deactivation is supported in this slice: the body must be
 * `{ active: false }`. Passing `active: true` (or omitting `active`) is a 400.
 *
 * Responses:
 *   200 { stamp }   — stamp successfully deactivated
 *   400             — body is missing `active: false`
 *   403             — not authenticated as admin
 *   404             — no stamp with the given id
 */
import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { deactivateStamp, StampNotFoundError } from "@/lib/stamp/deactivate-stamp";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!requireRole(session, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const b = body as { active?: unknown };
  if (b?.active !== false) {
    return NextResponse.json(
      { error: "only deactivation (active: false) is supported" },
      { status: 400 },
    );
  }

  const { id: stampId } = await params;

  try {
    const stamp = await deactivateStamp(getDb(), stampId);
    return NextResponse.json({ stamp }, { status: 200 });
  } catch (err) {
    if (err instanceof StampNotFoundError) {
      return NextResponse.json({ error: "stamp_not_found" }, { status: 404 });
    }
    throw err;
  }
}
