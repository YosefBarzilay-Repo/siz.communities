import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { setMessageBlock } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const targetUserId = String(body.targetUserId ?? body.userId ?? "").trim();
  const blocked = Boolean(body.blocked ?? true);

  if (!targetUserId) {
    return NextResponse.json({ error: "Missing user" }, { status: 400 });
  }

  const updated = await setMessageBlock(user.id, targetUserId, blocked);
  broadcastUpdate("store:update", { kind: "message-block-updated", userId: user.id, targetUserId, blocked });
  return NextResponse.json({ user: updated });
}
