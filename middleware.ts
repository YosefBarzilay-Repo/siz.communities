import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto");
  if (process.env.NODE_ENV === "production" && proto && proto !== "https") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
