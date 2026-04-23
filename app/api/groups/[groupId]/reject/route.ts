import { NextRequest, NextResponse } from "next/server";
import { getWritableUserFromRequest } from "@/lib/auth";
import { getGroupById, isSuperUserUser, rejectJoinRequest } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function POST(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId } = await context.params;
  const group = await getGroupById(groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (!isSuperUserUser(user) && group.adminId !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await request.json();
  const userId = String(body.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing user" }, { status: 400 });
  }

  const updated = await rejectJoinRequest(groupId, userId);
  broadcastUpdate("store:update", { kind: "group-rejected", groupId, userId });
  return NextResponse.json({ group: updated });
}
