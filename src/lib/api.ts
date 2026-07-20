import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import type { SessionUser } from "@/types/api";
import type { Role } from "@/lib/constants";

export function ok<T>(data: T, message?: string, init?: ResponseInit) {
  return NextResponse.json({ success: true, data, message }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export class ApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Wraps a route handler: converts ApiError/unknown errors to the API response format. */
export function handleApi<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.message, e.status);
      console.error("[api]", e);
      return fail("Внутренняя ошибка сервера", 500);
    }
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("Unauthorized", 401);
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ApiError("Forbidden", 403);
  return user;
}
