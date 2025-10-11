import { NextRequest } from "next/server";

const ALLOWED_HOSTS = [
  ".r2.cloudflarestorage.com",
  // 可根据需要逐步加入更多可信域名
];

function isAllowedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    const ok = ALLOWED_HOSTS.some((suffix) => host.endsWith(suffix));
    return ok ? url : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new Response(JSON.stringify({ message: "missing url" }), { status: 400 });
  }

  const target = isAllowedUrl(urlParam);
  if (!target) {
    return new Response(JSON.stringify({ message: "url not allowed" }), { status: 400 });
  }

  // 透传 Accept 但禁用条件缓存，避免 304 无体导致的失败
  const headers: HeadersInit = {
    Accept: req.headers.get("accept") ?? "*/*",
    // 禁用条件请求头，强制返回 200 带实体
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ message: `fetch upstream failed: ${upstream.status}` }),
        { status: 502 }
      );
    }

    // 透传必要的内容类型
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = upstream.headers.get("content-length") ?? undefined;

    // 返回可流式的 body
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        // 避免浏览器对代理再做条件缓存
        "Cache-Control": "private, max-age=0, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "proxy error";
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
}
