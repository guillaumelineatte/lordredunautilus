import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_PREFIX,
  GATE_COOKIE,
  GATE_MAX_AGE,
  gateToken,
  isValidGate,
  safeEqual,
} from "@/server/auth/admin-gate";

/** Réponse identique à celle d'une adresse inexistante. */
function notFound(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.rewrite(new URL("/page-introuvable", request.url));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const code = process.env.ADMIN_ACCESS_CODE;
  const secret = process.env.BETTER_AUTH_SECRET;
  // Sans code configuré, l'administration reste fermée (échec « fermé »).
  if (!code || !secret) return notFound(request);

  // Adresse secrète : dépose le cookie d'accès puis ouvre l'administration.
  if (pathname.startsWith(ACCESS_PREFIX)) {
    if (!safeEqual(pathname.slice(ACCESS_PREFIX.length), code)) return notFound(request);
    const response = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.set(GATE_COOKIE, gateToken(code, secret), {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: GATE_MAX_AGE,
    });
    return response;
  }

  // Administration et API de connexion : introuvables sans le cookie d'accès.
  if (!isValidGate(request.cookies.get(GATE_COOKIE)?.value, code, secret)) {
    return notFound(request);
  }

  // Vérification optimiste de la session (la vraie est faite côté serveur partout).
  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/connexion" &&
    !getSessionCookie(request)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*", "/acces/:path*"],
};
