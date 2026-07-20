import type { ApiResponse } from "@/types/api";

export class FetchError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Fetch wrapper for the app API: unwraps { success, data, message }. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new FetchError("Ошибка сервера", res.status);
  }
  if (!json.success) throw new FetchError(json.message || "Ошибка запроса", res.status);
  return json.data;
}

export async function apiFetchWithMessage<T>(url: string, init?: RequestInit): Promise<{ data: T; message?: string }> {
  const res = await fetch(url, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new FetchError("Ошибка сервера", res.status);
  }
  if (!json.success) throw new FetchError(json.message || "Ошибка запроса", res.status);
  return { data: json.data, message: json.message };
}
