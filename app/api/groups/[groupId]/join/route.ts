import { NextRequest, NextResponse } from "next/server";
import { getWritableUserFromRequest } from "@/lib/auth";
import { getGroupById, joinGroup, leaveGroup } from "@/lib/store";
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
  if (group.isDisabled) {
    return NextResponse.json({ error: "Group is disabled" }, { status: 423 });
  }

  await joinGroup(groupId, user.id);
  broadcastUpdate("store:update", { kind: "group-joined", groupId, userId: user.id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!(await getGroupById(groupId))) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  await leaveGroup(groupId, user.id);
  broadcastUpdate("store:update", { kind: "group-left", groupId, userId: user.id });
  return NextResponse.json({ ok: true });
}
