import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { addMessageReport } from "@/lib/store";
import { broadcastUpdate } from "@/lib/realtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const targetUserId = String(body.targetUserId ?? body.userId ?? "").trim();
  const messageId = String(body.messageId ?? "").trim() || null;
  const reason = String(body.reason ?? "דיווח על הטרדה או תוכן לא ראוי").trim();

  if (!targetUserId) {
    return NextResponse.json({ error: "Missing user" }, { status: 400 });
  }

  const report = await addMessageReport({
    reporterId: user.id,
    targetUserId,
    messageId,
    reason
  });
  broadcastUpdate("store:update", { kind: "message-reported", reportId: report.id, targetUserId });
  return NextResponse.json({ report }, { status: 201 });
}
