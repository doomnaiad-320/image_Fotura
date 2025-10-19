import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { buildSubmitURL } from "@/lib/payments/easypay";

const bodySchema = z.object({
  credits: z.number().int().positive(),
  money: z.number().positive().optional(),
  name: z.string().optional(),
});

function getOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "未登录" }, { status: 401 });

  try {
    const json = await request.json();
    const payload = bodySchema.parse(json);

    const CREDITS_PER_CNY = Number(process.env.CREDITS_PER_CNY || 100);
    const money = payload.money ?? payload.credits / CREDITS_PER_CNY;
    const moneyStr = money.toFixed(2);

    const origin = getOrigin(request);
    const outTradeNo = `EZ${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const paramObj = { userId: user.id, credits: payload.credits, out_trade_no: outTradeNo };
    const param = Buffer.from(JSON.stringify(paramObj), "utf8").toString("base64");

    const return_url = `${origin}/settings?tab=recharge`;
    const notify_url = `${origin}/api/payments/easypay/notify`;

    const submitURL = buildSubmitURL({
      out_trade_no: outTradeNo,
      name: payload.name || `充值 ${payload.credits} 豆` ,
      money: moneyStr,
      notify_url,
      return_url,
      param,
    });

    return NextResponse.json({ redirectUrl: submitURL, out_trade_no: outTradeNo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "下单失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
