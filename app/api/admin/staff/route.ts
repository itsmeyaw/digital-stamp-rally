import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import {
  createStamper,
  createRedeemer,
  listStaff,
  StaffAdminError,
  type StaffAdminErrorCode,
} from "@/lib/staff/staff-admin";
import type { Staff } from "@/lib/db/schema";

/**
 * Admin staff-management API (issue #6). Both handlers gate on an Admin session
 * read from the request cookie (same seam as /api/admin/stamps): a non-admin or
 * missing session gets 403, satisfying "non-admin roles cannot manage staff".
 *
 * POST — create a Stamper or Redeemer from JSON `{ role, username, password,
 * stampId? }`. A Stamper MUST carry a `stampId` referencing an existing Stamp
 * (else 400); a Redeemer carries none. A taken username is 409; success 201.
 *
 * GET — list manageable staff (Stampers + Redeemers, newest first) for the
 * dashboard. The bcrypt hash is never serialized to the client.
 *
 * Reassign and deactivate live under PATCH /api/admin/staff/[id].
 */

function requireAdmin(req: NextRequest) {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  return requireRole(session, "admin");
}

/** Strip the bcrypt hash before sending a staff row to the client. */
export function publicStaff(row: Staff) {
  const { passwordHash: _passwordHash, ...rest } = row;
  void _passwordHash;
  return rest;
}

/** Map a domain error to its HTTP status. */
export function statusForStaffError(code: StaffAdminErrorCode): number {
  switch (code) {
    case "username_taken":
      return 409;
    case "staff_not_found":
      return 404;
    case "stamp_not_found":
    case "not_a_stamper":
      return 400;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const b = body as {
    role?: unknown;
    username?: unknown;
    password?: unknown;
    stampId?: unknown;
  };
  const role = b?.role;
  const username = typeof b?.username === "string" ? b.username.trim() : "";
  const password = typeof b?.password === "string" ? b.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 },
    );
  }
  if (role !== "stamper" && role !== "redeemer") {
    return NextResponse.json(
      { error: "role must be 'stamper' or 'redeemer'" },
      { status: 400 },
    );
  }

  try {
    if (role === "stamper") {
      const stampId = typeof b?.stampId === "string" ? b.stampId : "";
      if (!stampId) {
        return NextResponse.json(
          { error: "a stamper must be bound to exactly one stamp" },
          { status: 400 },
        );
      }
      const created = await createStamper(getDb(), { username, password, stampId });
      return NextResponse.json(publicStaff(created), { status: 201 });
    }
    const created = await createRedeemer(getDb(), { username, password });
    return NextResponse.json(publicStaff(created), { status: 201 });
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rows = await listStaff(getDb());
  return NextResponse.json({ staff: rows.map(publicStaff) }, { status: 200 });
}
