import { NextRequest, NextResponse } from "next/server";
import { createUser, getPublicUserById } from "@/lib/store";
import { signAuthToken, tokenName } from "@/lib/auth";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const acceptTerms = Boolean(body.acceptTerms ?? body.acceptedTerms);
  const acceptPrivacy = Boolean(body.acceptPrivacy ?? body.acceptedPrivacy);
  const marketingOptIn = Boolean(body.marketingOptIn ?? body.acceptMarketing ?? false);

  if (username.length < 2 || !email.includes("@") || password.length < 6) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!acceptTerms || !acceptPrivacy) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const user = await createUser({
      username,
      email,
      password,
      bio: String(body.bio ?? ""),
      marketingOptIn,
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
      emailVerifiedAt: process.env.AUTO_VERIFY_EMAILS === "1" ? now : null
    });
    const token = await signAuthToken(user.id);
    broadcastUpdate("store:update", { kind: "user-created", userId: user.id });

    const response = NextResponse.json({
      user: await getPublicUserById(user.id),
      token,
      emailVerificationRequired: !user.emailVerifiedAt
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
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }
}
