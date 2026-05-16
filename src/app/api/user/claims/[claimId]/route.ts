import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { markClaimCollected, markClaimUncollected } from "@/lib/db";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const { claimId } = await params;

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body) return invalidJsonResponse();
  const { collected } = body;

  if (typeof collected !== "boolean") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const ok = collected
    ? markClaimCollected(claimId, sessionUser.username)
    : markClaimUncollected(claimId, sessionUser.username);

  if (!ok) {
    return NextResponse.json({ error: "认领记录不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
