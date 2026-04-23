import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createGroup, getGroups } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ groups: await getGroups() });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "נדרש להתחבר" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "").trim();
  const description = String(body.description ?? "").trim();

  if (name.length < 2 || category.length < 2) {
    return NextResponse.json({ error: "שם וקטגוריה נדרשים" }, { status: 400 });
  }

  const group = await createGroup({
    name,
    category,
    description,
    adminId: user.id,
    isLocked: Boolean(body.isLocked)
  });

  broadcastUpdate("store:update", { kind: "group-created", groupId: group.id });
  return NextResponse.json({ group }, { status: 201 });
}
