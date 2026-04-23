import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getWritableUserFromRequest } from "@/lib/auth";
import { conversationPartners, conversationWith, getUserById, sendMessage } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ conversations: [] });
  }

  const partnerId = request.nextUrl.searchParams.get("partnerId");
  if (partnerId) {
    return NextResponse.json({
      messages: await conversationWith(currentUser.id, partnerId),
      partner: await getUserById(partnerId)
    });
  }

  const partners = await conversationPartners(currentUser.id);
  const conversations = await Promise.all(
    partners.map(async (partner) => ({
      partner,
      messages: await conversationWith(currentUser.id, partner.id)
    }))
  );

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const receiverId = String(body.receiverId ?? "").trim();
  const text = String(body.text ?? "").trim();

  if (!receiverId || !text) {
    return NextResponse.json({ error: "Missing recipient or text" }, { status: 400 });
  }

  if (!(await getUserById(receiverId))) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let message;
  try {
    message = await sendMessage({
      senderId: user.id,
      receiverId,
      text
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: messageText }, { status: 403 });
  }

  if (!message) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  broadcastUpdate("store:update", { kind: "message-created", receiverId, senderId: user.id });
  return NextResponse.json({ message }, { status: 201 });
}
