import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { deleteOwnMessages } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await deleteOwnMessages(user.id);
  broadcastUpdate("store:update", { kind: "messages-deleted", userId: user.id });
  return NextResponse.json({ ok: true });
}
