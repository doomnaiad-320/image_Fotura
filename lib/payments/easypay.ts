import { createSign, createVerify } from "crypto";

const API_BASE = process.env.EASYPAY_API_BASE || "https://pay.aabao.vip";

export type EasyPaySubmitParams = {
  pid: string; // merchant id
  out_trade_no: string;
  name: string;
  money: string; // decimal string, e.g. "6.00"
  notify_url: string;
  return_url: string;
  timestamp: string; // 10-digit seconds
  param?: string; // passthrough field
  type?: string; // optional, let cashier choose if omitted
};

function filterParams(params: Record<string, string | undefined | null>) {
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (k === "sign" || k === "sign_type") continue;
    const vv = String(v);
    if (vv === "") continue;
    obj[k] = vv;
  }
  return obj;
}

function buildSigningString(params: Record<string, string | undefined | null>) {
  const filtered = filterParams(params);
  const keys = Object.keys(filtered).sort(); // ASCII asc
  return keys.map((k) => `${k}=${filtered[k]}`).join("&");
}

export function rsaSignParams(params: Record<string, string | undefined | null>, privateKeyPem: string) {
  const payload = buildSigningString(params);
const sign = createSign("RSA-SHA256");
  sign.update(payload, "utf8");
  return sign.sign(privateKeyPem, "base64");
}

export function rsaVerifyParams(
  params: Record<string, string | undefined | null>,
  signature: string,
  publicKeyPem: string
) {
  const payload = buildSigningString(params);
const verify = createVerify("RSA-SHA256");
  verify.update(payload, "utf8");
  return verify.verify(publicKeyPem, signature, "base64");
}

export function buildSubmitURL(
  params: Omit<EasyPaySubmitParams, "pid" | "timestamp"> & { pid?: string; timestamp?: string }
) {
  const pid = params.pid || process.env.EASYPAY_PID || "";
  if (!pid) throw new Error("EASYPAY_PID 未配置");

  const baseParams: Record<string, string> = {
    pid: String(pid),
    out_trade_no: params.out_trade_no,
    name: params.name,
    money: params.money,
    notify_url: params.notify_url,
    return_url: params.return_url,
    timestamp: params.timestamp || Math.floor(Date.now() / 1000).toString(),
  };
  if (params.param) baseParams.param = params.param;
  if (params.type) baseParams.type = params.type;

  const privateKey = (process.env.EASYPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!privateKey) throw new Error("EASYPAY_PRIVATE_KEY 未配置");

  const sign = rsaSignParams({ ...baseParams }, privateKey);

  const query = new URLSearchParams({
    ...baseParams,
    sign,
    sign_type: "RSA",
  } as Record<string, string>);

  return `${API_BASE}/api/pay/submit?${query.toString()}`;
}

export function decodeParam<T = any>(param?: string): T | null {
  if (!param) return null;
  // try base64 json first
  try {
    const json = Buffer.from(param, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {}
  // try plain json
  try {
    return JSON.parse(param) as T;
  } catch {}
  return null;
}
