import { NextRequest, NextResponse } from "next/server";
import { signAuthToken, tokenName } from "@/lib/auth";
import { getPublicUserById, verifyUser } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await verifyUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signAuthToken(user.id);
  const response = NextResponse.json({
    user: await getPublicUserById(user.id),
    token
  });

  response.cookies.set(tokenName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
