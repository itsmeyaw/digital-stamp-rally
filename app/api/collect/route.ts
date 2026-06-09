import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { createUser } from "@/lib/user/create-user";
import { buildSessionCookie } from "@/lib/auth/session";

/**
 * POST /api/collect — mint a new User on first "collect".
 *
 * Creates a User (unique 6-char public handle) and sets the long-lived httpOnly
 * session cookie that authenticates them (ADR-0001). Returns the public code so
 * the client can show it / render the QR. The cookie — never the code — is what
 * grants access on subsequent requests.
 */
export async function POST(_req: Request): Promise<NextResponse> {
  void _req;
  const user = await createUser(getDb());

  const res = NextResponse.json(
    { code: user.code, id: user.id },
    { status: 201 },
  );

  const cookie = buildSessionCookie({ sub: user.id, role: "user" });
  res.cookies.set(cookie.name, cookie.value, cookie.options);

  return res;
}
