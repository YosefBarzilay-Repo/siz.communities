import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { deleteUser, bootstrap } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await bootstrap(user.id);
  return NextResponse.json(payload);
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await deleteUser(user.id);
  broadcastUpdate("store:update", { kind: "user-deleted", userId: user.id });
  return NextResponse.json({ ok: true });
}
