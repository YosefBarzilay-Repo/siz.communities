import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { approveJoinRequest, getGroupById } from "@/lib/store";
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
  const group = await getGroupById(groupId);
  if (!group) {
    return NextResponse.json({ error: "הקהילה לא נמצאה" }, { status: 404 });
  }
  if (group.adminId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה לאשר בקשות" }, { status: 403 });
  }

  const body = await request.json();
  const userId = String(body.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "נדרש משתמש" }, { status: 400 });
  }

  const updated = await approveJoinRequest(groupId, userId);
  broadcastUpdate("store:update", { kind: "group-approved", groupId, userId });
  return NextResponse.json({ group: updated });
}
