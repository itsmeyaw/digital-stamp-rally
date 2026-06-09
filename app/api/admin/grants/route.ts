import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import {
  adminGrantStamp,
  adminRevokeStamp,
  AdminGrantError,
} from "@/lib/grants/admin-grants";

/**
 * Admin Grants API (issue #8).
 *
 * POST  {stampId, userCode} — grants explicit stamp to user by code.
 *   200 {granted, alreadyHad, card, completionCaptured}
 *   400 bad body | stamp_not_found | stamp_inactive
 *   403 non-admin / no session
 *   404 user_not_found
 *
 * DELETE {stampId, userCode} — revokes stamp from user by code.
 *   200 {revoked, card}
 *   400 bad body | stamp_not_found
 *   403 non-admin / no session
 *   404 user_not_found
 */

function requireAdmin(req: NextRequest): boolean {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  return requireRole(session, "admin");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).stampId !== "string" ||
    typeof (body as Record<string, unknown>).userCode !== "string"
  ) {
    return NextResponse.json(
      { error: "stampId and userCode are required" },
      { status: 400 },
    );
  }

  const { stampId, userCode } = body as { stampId: string; userCode: string };

  try {
    const result = await adminGrantStamp(getDb(), { stampId, userCode });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AdminGrantError) {
      if (err.code === "user_not_found") {
        return NextResponse.json({ error: err.code }, { status: 404 });
      }
      // stamp_not_found | stamp_inactive → 400
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).stampId !== "string" ||
    typeof (body as Record<string, unknown>).userCode !== "string"
  ) {
    return NextResponse.json(
      { error: "stampId and userCode are required" },
      { status: 400 },
    );
  }

  const { stampId, userCode } = body as { stampId: string; userCode: string };

  try {
    const result = await adminRevokeStamp(getDb(), { stampId, userCode });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AdminGrantError) {
      if (err.code === "user_not_found") {
        return NextResponse.json({ error: err.code }, { status: 404 });
      }
      // stamp_not_found → 400
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}
