import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import {
  reassignStamperStamp,
  deactivateStaff,
  StaffAdminError,
} from "@/lib/staff/staff-admin";
import { publicStaff, statusForStaffError } from "../route";

/**
 * Admin staff mutations on a single account (issue #6), gated on an Admin
 * session read from the request cookie (non-admin / missing -> 403).
 *
 * PATCH — one of two actions, chosen by the JSON body:
 *   { stampId }       -> re-assign the Stamper's bound Stamp (one at a time).
 *   { active: false } -> deactivate the account (never hard-deleted; it can no
 *                        longer log in, per the login-route change).
 * Domain failures map to 400 (bad stamp / not a stamper) or 404 (unknown id);
 * a body with neither field is a 400. Success returns the updated row (200).
 */

function requireAdmin(req: NextRequest) {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  return requireRole(session, "admin");
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as { stampId?: unknown; active?: unknown };

  try {
    if (typeof b?.stampId === "string") {
      const updated = await reassignStamperStamp(getDb(), {
        staffId: id,
        stampId: b.stampId,
      });
      return NextResponse.json(publicStaff(updated), { status: 200 });
    }
    if (b?.active === false) {
      const updated = await deactivateStaff(getDb(), { staffId: id });
      return NextResponse.json(publicStaff(updated), { status: 200 });
    }
    return NextResponse.json(
      { error: "provide a stampId to reassign or active:false to deactivate" },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof StaffAdminError) {
      return NextResponse.json(
        { error: err.code },
        { status: statusForStaffError(err.code) },
      );
    }
    throw err;
  }
}
