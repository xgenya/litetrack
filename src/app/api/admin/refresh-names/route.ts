import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { refreshAllDisplayNames, refreshProjectDisplayNames } from "@/lib/db";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const projectId: string | undefined = body?.projectId;

  const updated = projectId
    ? refreshProjectDisplayNames(projectId)
    : refreshAllDisplayNames();

  return NextResponse.json({ updated });
}
