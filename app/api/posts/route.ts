import { NextRequest, NextResponse } from "next/server";
import { getWritableUserFromRequest } from "@/lib/auth";
import { createPost, getGroupById, getPosts } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ posts: await getPosts() });
}

export async function POST(request: NextRequest) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const groupId = String(body.groupId ?? "").trim();
  const text = String(body.text ?? "").trim();
  const type = body.type === "giveaway" ? "giveaway" : "sale";
  const imageUrl = String(body.imageUrl ?? "").trim();

  if (!groupId || !text) {
    return NextResponse.json({ error: "Missing group or text" }, { status: 400 });
  }

  const group = await getGroupById(groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const isMember = group.adminId === user.id || group.memberIds.includes(user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Join approval required" }, { status: 403 });
  }
  if (group.isDisabled || group.isLocked) {
    return NextResponse.json({ error: "Group is disabled" }, { status: 423 });
  }

  const post = await createPost({
    groupId,
    userId: user.id,
    text,
    imageUrl,
    type
  });

  broadcastUpdate("store:update", { kind: "post-created", groupId, postId: post.id });
  return NextResponse.json({ post }, { status: 201 });
}
