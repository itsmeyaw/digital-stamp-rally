import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth/token";

const SECRET = "route-test-secret";

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

function staffToken(role: "stamper" | "admin"): string {
  return signToken({ sub: `${role}-1`, role }, { secret: SECRET, ttlSeconds: 3600 });
}

async function getPing(token?: string) {
  const { GET } = await import("./route");
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `dsr_session=${token}`;
  return GET(
    new NextRequest("http://localhost/api/admin/ping", {
      method: "GET",
      headers,
    }),
  );
}

describe("GET /api/admin/ping (admin-only)", () => {
  it("allows an admin session", async () => {
    const res = await getPing(staffToken("admin"));
    expect(res.status).toBe(200);
  });

  it("rejects a stamper session with 403", async () => {
    const res = await getPing(staffToken("stamper"));
    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated request with 403", async () => {
    const res = await getPing();
    expect(res.status).toBe(403);
  });
});
