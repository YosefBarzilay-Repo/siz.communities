import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createPost, getGroupById, getPosts } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ posts: await getPosts() });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const body = await request.json();
  const groupId = String(body.groupId ?? "").trim();
  const text = String(body.text ?? "").trim();
  const type = body.type === "giveaway" ? "giveaway" : "sale";
  const imageUrl = String(body.imageUrl ?? "").trim();

  if (!groupId || !text) {
    return NextResponse.json({ error: "יש לבחור קהילה ולהוסיף טקסט" }, { status: 400 });
  }

  if (!(await getGroupById(groupId))) {
    return NextResponse.json({ error: "הקהילה לא נמצאה" }, { status: 404 });
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
