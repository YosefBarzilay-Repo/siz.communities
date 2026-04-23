import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getGroupById, joinGroup, leaveGroup } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function POST(request: NextRequest, context: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!(await getGroupById(groupId))) {
    return NextResponse.json({ error: "הקהילה לא נמצאה" }, { status: 404 });
  }

  await joinGroup(groupId, user.id);
  broadcastUpdate("store:update", { kind: "group-joined", groupId, userId: user.id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!(await getGroupById(groupId))) {
    return NextResponse.json({ error: "הקהילה לא נמצאה" }, { status: 404 });
  }

  await leaveGroup(groupId, user.id);
  broadcastUpdate("store:update", { kind: "group-left", groupId, userId: user.id });
  return NextResponse.json({ ok: true });
}
