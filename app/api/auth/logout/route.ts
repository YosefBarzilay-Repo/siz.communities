import { NextResponse } from "next/server";
import { tokenName } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(tokenName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
  return response;
}
