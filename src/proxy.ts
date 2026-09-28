import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// On regarde juste si le cookie existe. La vraie vérif de session se fait
// côté serveur dans chaque page, action et route de la timonerie.
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
