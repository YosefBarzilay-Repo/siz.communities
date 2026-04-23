import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/store";
import { signAuthToken, tokenName } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (username.length < 2 || !email.includes("@") || password.length < 6) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  try {
    const user = await createUser({ username, email, password, bio: String(body.bio ?? "") });
    const token = await signAuthToken(user.id);
    const response = NextResponse.json({
      user: { id: user.id, username: user.username, email: user.email },
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
  } catch {
    return NextResponse.json({ error: "האימייל כבר קיים" }, { status: 409 });
  }
}
