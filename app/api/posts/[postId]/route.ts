import { NextRequest, NextResponse } from "next/server";
import { getWritableUserFromRequest } from "@/lib/auth";
import { deletePost, getGroupById, getPostById, lockPost } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    postId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { postId } = await context.params;
  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const group = await getGroupById(post.groupId);
  const body = await request.json().catch(() => ({}));
  const locked = Boolean(body.locked);
  const canEdit = post.userId === user.id || group?.adminId === user.id;
  if (!canEdit) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const updated = await lockPost(postId, user.id, locked);
  broadcastUpdate("store:update", { kind: "post-updated", postId });
  return NextResponse.json({ post: updated });
}

export async function DELETE(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { postId } = await context.params;
  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const group = await getGroupById(post.groupId);
  const canDelete = post.userId === user.id || group?.adminId === user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await deletePost(postId);
  broadcastUpdate("store:update", { kind: "post-deleted", postId });
  return NextResponse.json({ ok: true });
}
