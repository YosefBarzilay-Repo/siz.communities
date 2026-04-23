import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { addComment, getComments, getPostById } from "@/lib/store";
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
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const { postId } = await context.params;
  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "השרשור לא נמצא" }, { status: 404 });
  }
  if (post.isLocked) {
    return NextResponse.json({ error: "השרשור נעול" }, { status: 423 });
  }

  const body = await request.json();
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "יש להזין תגובה" }, { status: 400 });
  }

  const comment = await addComment({
    postId,
    userId: user.id,
    text
  });

  broadcastUpdate("store:update", { kind: "comment-created", postId, commentId: comment.id });
  return NextResponse.json({ comment }, { status: 201 });
}
