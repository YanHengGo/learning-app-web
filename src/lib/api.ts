export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiFetchOptions = {
  method?: string;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {}
): Promise<T> {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseURL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  const url = `${baseURL.replace(/\/+$/, "")}${path}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };

  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Network error while requesting ${path}: ${message}`);
  }

  if (!res.ok) {
    let details: unknown;
    let message = `Request failed with status ${res.status}`;

    try {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        details = await res.json();
        if (
          typeof details === "object" &&
          details !== null &&
          "error" in details &&
          typeof (details as { error?: unknown }).error === "string"
        ) {
          message = (details as { error: string }).error;
        } else if (
          typeof details === "object" &&
          details !== null &&
          "message" in details &&
          typeof (details as { message?: unknown }).message === "string"
        ) {
          message = (details as { message: string }).message;
        }
      } else {
        const text = await res.text();
        if (text) {
          message = text;
        }
      }
    } catch {
      // ignore parse errors
    }

    throw new ApiError(message, res.status, details);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const responseType = res.headers.get("content-type") ?? "";
  if (responseType.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}
