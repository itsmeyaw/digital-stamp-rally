import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getStaffByUsername } from "@/lib/auth/staff";
import { verifyPassword } from "@/lib/auth/password";
import { buildSessionCookie } from "@/lib/auth/session";
import { resolveLanding } from "@/lib/auth/landing";
import type { Role } from "@/lib/auth/token";

/**
 * POST /api/login — staff (Stamper / Redeemer / Admin) sign-in.
 *
 * Accepts JSON `{ username, password }`. On success, mints the same long-lived
 * httpOnly session cookie used for Users (ADR-0001: one token format spans all
 * roles) with the staff row id as `sub` and the staff role as the role claim,
 * and returns the role-based landing path (resolveLanding) so the client can
 * navigate. On bad credentials returns 401 with NO cookie. Username and
 * password are never echoed back.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const username =
    typeof (body as { username?: unknown })?.username === "string"
      ? (body as { username: string }).username
      : null;
  const password =
    typeof (body as { password?: unknown })?.password === "string"
      ? (body as { password: string }).password
      : null;
  if (!username || !password) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const staff = await getStaffByUsername(getDb(), username);
  const ok = staff
    ? await verifyPassword(password, staff.passwordHash)
    : false;
  if (!staff || !ok) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const role = staff.role as Role;
  const landing = resolveLanding({ sub: staff.id, role, iat: 0, exp: 0 });

  const res = NextResponse.json({ landing }, { status: 200 });
  const cookie = buildSessionCookie({ sub: staff.id, role });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
