import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "alerte_admin";

function hidden() {
  return new NextResponse("Page introuvable.", { status: 404 });
}

export function proxy(request: NextRequest) {
  const key = process.env.ADMIN_KEY?.trim();
  if (!key) return hidden();

  const given = request.nextUrl.searchParams.get("cle");
  if (given === key) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("cle");
    const response = NextResponse.redirect(clean);
    response.cookies.set(COOKIE, key, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  }

  if (request.cookies.get(COOKIE)?.value === key) return NextResponse.next();
  return hidden();
}

export const config = {
  matcher: ["/admin", "/api/admin/:path*", "/api/reports"],
};
