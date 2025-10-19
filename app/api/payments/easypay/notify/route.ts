import { prisma } from "@/lib/prisma";
import { rsaVerifyParams, decodeParam } from "@/lib/payments/easypay";
import { grantCreditsBySystem } from "@/lib/credits";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sp = url.searchParams;

  const params: Record<string, string> = {} as any;
  sp.forEach((v, k) => {
    params[k] = v;
  });

  const signature = params.sign;
  const sign_type = params.sign_type || "RSA";
  if (!signature || sign_type !== "RSA") {
    return new Response("bad request", { status: 400 });
  }

  const publicKey = (process.env.EASYPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n");
  if (!publicKey) return new Response("missing public key", { status: 500 });

  try {
    const ok = rsaVerifyParams(params, signature, publicKey);
    if (!ok) return new Response("invalid sign", { status: 400 });

    if (params.trade_status !== "TRADE_SUCCESS") {
      return new Response("ignored", { status: 200 });
    }

    const trade_no = params.trade_no;
    const out_trade_no = params.out_trade_no;

    const existed = await prisma.creditTransaction.findFirst({
      where: { requestId: trade_no || out_trade_no, status: "success" },
    });
    if (existed) return new Response("success");

    const payload = decodeParam<{ userId: string; credits?: number }>(params.param);

    const CREDITS_PER_CNY = Number(process.env.CREDITS_PER_CNY || 100);
    const money = Number(params.money || "0");
    const credits = payload?.credits && payload.credits > 0 ? payload.credits : Math.round(money * CREDITS_PER_CNY);

    if (!payload?.userId || !credits || credits <= 0) {
      return new Response("bad param", { status: 400 });
    }

    await grantCreditsBySystem({
      userId: payload.userId,
      amount: credits,
      reason: "易支付充值",
      requestId: trade_no || out_trade_no,
      metadata: {
        from: "easypay",
        trade_no,
        out_trade_no,
        api_trade_no: params.api_trade_no,
        type: params.type,
        buyer: params.buyer,
        money: params.money,
      },
    });

    return new Response("success");
  } catch (e) {
    return new Response("error", { status: 500 });
  }
}
