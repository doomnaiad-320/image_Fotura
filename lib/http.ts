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
  const { token, headers, ...rest } = options;

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {})
    }
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new HttpError(response.status, payload?.message ?? response.statusText, payload);
  }

  return payload as T;
}
