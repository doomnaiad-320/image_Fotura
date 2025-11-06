export type HttpOptions = RequestInit & {
  token?: string;
};

export class HttpError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function httpFetch<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { token, headers, body, ...rest } = options;

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const normalizedHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  if (headers) {
    if (headers instanceof Headers) {
      for (const [key, value] of headers.entries()) {
        normalizedHeaders[key] = value;
      }
    } else if (Array.isArray(headers)) {
      for (const [key, value] of headers) {
        normalizedHeaders[key] = value;
      }
    } else {
      Object.assign(normalizedHeaders, headers as Record<string, string>);
    }
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let hasContentType = Object.keys(normalizedHeaders).some(
    (key) => key.toLowerCase() === "content-type"
  );

  if (isFormData && hasContentType) {
    for (const key of Object.keys(normalizedHeaders)) {
      if (key.toLowerCase() === "content-type") {
        delete normalizedHeaders[key];
      }
    }
    hasContentType = false;
  }

  if (!isFormData && body !== undefined && !hasContentType) {
    normalizedHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...rest,
    body,
    headers: normalizedHeaders
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let payload: any = null;

  if (contentType.includes('application/json')) {
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      // JSON 声明但解析失败
      payload = null;
    }
  } else {
    // 非 JSON（可能是 HTML 错误页或纯文本）
    payload = text;
  }

  if (!response.ok) {
    const message = (payload && typeof payload === 'object')
      ? (payload.message || payload.error || response.statusText)
      : (typeof payload === 'string' && payload ? payload.slice(0, 300) : response.statusText);
    throw new HttpError(response.status, message, payload);
  }

  // 成功：优先返回 JSON；否则返回文本
  return (payload as T);
}
