import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getPublicUserById } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const publicUser = await getPublicUserById(user.id);
  if (!publicUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    currentUser: publicUser,
    myData: {
      id: publicUser.id,
      username: publicUser.username,
      email: publicUser.email,
      bio: publicUser.bio,
      joinedGroupIds: publicUser.joinedGroupIds,
      blockedUserIds: publicUser.blockedUserIds,
      marketingOptIn: publicUser.marketingOptIn,
      acceptedTermsAt: publicUser.acceptedTermsAt,
      acceptedPrivacyAt: publicUser.acceptedPrivacyAt,
      emailVerifiedAt: publicUser.emailVerifiedAt,
      createdAt: publicUser.createdAt
    }
  });
}
