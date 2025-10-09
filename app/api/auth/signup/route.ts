import { NextResponse } from "next/server";
import { z } from "zod";

import { registerUser } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = schema.parse(body);

    const user = await registerUser(payload);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      credits: user.credits
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
