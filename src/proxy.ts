import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// L'administration vit sous /timonerie (pas d'adresse /admin devinable).
// Vérification optimiste de la présence du cookie de session : la vraie
// vérification est faite côté serveur dans chaque page, action et route.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== "/timonerie/connexion" && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/timonerie/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/timonerie/:path*"],
};
