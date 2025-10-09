import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  ttl: z.number().min(60).max(86_400).optional()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "缺少 NEXTAUTH_SECRET" }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = schema.parse(body);

    const ttl = payload.ttl ?? 3600;
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + ttl;

    const token = await new SignJWT({
      sub: user.id,
      role: user.role,
      email: user.email
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(new TextEncoder().encode(secret));

    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成令牌失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
