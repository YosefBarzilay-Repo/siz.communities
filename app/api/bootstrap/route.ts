import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { bootstrap, conversationPartners, conversationWith, getJoinRequests, getPublicUserById } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  const payload = await bootstrap(currentUser?.id ?? null);

  if (currentUser) {
    const partners = await conversationPartners(currentUser.id);
    const conversations = await Promise.all(
      partners.map(async (partner) => ({
        partner,
        messages: await conversationWith(currentUser.id, partner.id)
      }))
    );

    return NextResponse.json({
      ...payload,
      joinRequests: await getJoinRequests(),
      conversations,
      currentUser: {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email
      },
      currentUserDetail: await getPublicUserById(currentUser.id)
    });
  }

  return NextResponse.json({
    ...payload,
    joinRequests: await getJoinRequests(),
    conversations: [],
    currentUserDetail: null
  });
}
