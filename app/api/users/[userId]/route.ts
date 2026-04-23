import { NextRequest, NextResponse } from "next/server";
import { getWritableUserFromRequest } from "@/lib/auth";
import { deleteUser, getGroups, getUserById, lockUser } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

const hasAdminAccess = async (userId: string) => {
  const groups = await getGroups();
  return groups.some((group) => group.adminId === userId);
};

export async function PATCH(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!(await hasAdminAccess(user.id))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { userId } = await context.params;
  const target = await getUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const locked = Boolean(body.locked);
  const updated = await lockUser(userId, locked);
  broadcastUpdate("store:update", { kind: "user-updated", userId });
  return NextResponse.json({ user: updated });
}

export async function DELETE(request: NextRequest, context: Params) {
  const user = await getWritableUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!(await hasAdminAccess(user.id))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { userId } = await context.params;
  const target = await getUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await deleteUser(userId);
  broadcastUpdate("store:update", { kind: "user-deleted", userId });
  return NextResponse.json({ ok: true });
}
