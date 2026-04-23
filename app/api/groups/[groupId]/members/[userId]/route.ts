import { NextRequest, NextResponse } from "next/server";
import { getWritableUserFromRequest } from "@/lib/auth";
import { getGroupById, isSuperUserUser, removeGroupMember, setGroupMemberWriteBlocked } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    groupId: string;
    userId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const { groupId, userId } = await context.params;
  const group = await getGroupById(groupId);
  if (!group) {
    return NextResponse.json({ error: "הקבוצה לא נמצאה" }, { status: 404 });
  }
  if (!isSuperUserUser(user) && group.adminId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const updated = await removeGroupMember(groupId, userId);
  broadcastUpdate("store:update", { kind: "group-member-removed", groupId, userId });
  return NextResponse.json({ group: updated });
}

export async function PATCH(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const { groupId, userId } = await context.params;
  const group = await getGroupById(groupId);
  if (!group) {
    return NextResponse.json({ error: "הקבוצה לא נמצאה" }, { status: 404 });
  }
  if (!isSuperUserUser(user) && group.adminId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const blocked = Boolean(body.blocked ?? body.isBlocked ?? body.isWriteBlocked);
  const updated = await setGroupMemberWriteBlocked(groupId, userId, blocked);
  broadcastUpdate("store:update", { kind: "group-member-updated", groupId, userId, blocked });
  return NextResponse.json({ group: updated });
}
