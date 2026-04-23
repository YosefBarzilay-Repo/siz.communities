import { NextRequest, NextResponse } from "next/server";
import { getWritableUserFromRequest } from "@/lib/auth";
import { addComment, getComments, getGroupById, getPostById, isGroupMemberWriteBlocked, isSuperUserUser } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(request: NextRequest, context: Params) {
  const { postId } = await context.params;
  const comments = await getComments();
  return NextResponse.json({
    comments: comments.filter((comment) => comment.postId === postId)
  });
}

export async function POST(request: NextRequest, context: Params) {
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
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const isMember = isSuperUserUser(user) || group.adminId === user.id || group.memberIds.includes(user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if ((group.isDisabled || group.isLocked || post.isLocked || post.isDisabled) && !isSuperUserUser(user)) {
    return NextResponse.json({ error: "Thread is disabled" }, { status: 423 });
  }
  if (isGroupMemberWriteBlocked(group, user.id) && !isSuperUserUser(user) && group.adminId !== user.id) {
    return NextResponse.json({ error: "You cannot write in this group" }, { status: 423 });
  }

  const body = await request.json();
  const text = String(body.text ?? "").trim();
  const parentCommentId = String(body.parentCommentId ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }
  if (parentCommentId) {
    const parentComment = (await getComments()).find((comment) => comment.id === parentCommentId);
    if (!parentComment || parentComment.postId !== postId) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
    }
  }

  const comment = await addComment({
    postId,
    userId: user.id,
    text,
    parentCommentId: parentCommentId || null
  });

  broadcastUpdate("store:update", { kind: "comment-created", postId, commentId: comment.id });
  return NextResponse.json({ comment }, { status: 201 });
}
