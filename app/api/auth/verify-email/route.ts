import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, signAuthToken, tokenName } from "@/lib/auth";
import { verifyUserEmail, getPublicUserById } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await verifyUserEmail(currentUser.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
