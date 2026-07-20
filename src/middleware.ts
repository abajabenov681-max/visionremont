import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login"];

function homeFor(role: string): string {
  if (role === "MASTER") return "/master";
  if (role === "ADMIN") return "/admin";
  return "/";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API-роуты сами возвращают 401/403 в JSON-формате
  if (pathname.startsWith("/api")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (user) return NextResponse.redirect(new URL(homeFor(user.role), req.url));
    return NextResponse.next();
  }

  if (!user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // Ролевые зоны
  if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }
  if (pathname.startsWith("/master") && user.role !== "MASTER") {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }
  // клиентская зона — всё остальное
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/master") && user.role !== "CLIENT") {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)).*)"],
};
