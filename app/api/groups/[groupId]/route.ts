import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { deleteGroup, getGroupById, updateGroup } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const { groupId } = await context.params;
  const group = await getGroupById(groupId);
  if (!group) {
    return NextResponse.json({ error: "הקהילה לא נמצאה" }, { status: 404 });
  }
  if (group.adminId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה לערוך קהילה" }, { status: 403 });
  }

  const body = await request.json();
  const updated = await updateGroup(groupId, {
    name: body.name,
    category: body.category,
    description: body.description
  });

  broadcastUpdate("store:update", { kind: "group-updated", groupId });
  return NextResponse.json({ group: updated });
}

export async function DELETE(request: NextRequest, context: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const { groupId } = await context.params;
  const group = await getGroupById(groupId);
  if (!group) {
    return NextResponse.json({ error: "הקהילה לא נמצאה" }, { status: 404 });
  }
  if (group.adminId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה למחוק קהילה" }, { status: 403 });
  }

  await deleteGroup(groupId);
  broadcastUpdate("store:update", { kind: "group-deleted", groupId });
  return NextResponse.json({ ok: true });
}
