import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBlockDisplayName } from "@/lib/block-names";
import { refreshAllDisplayNames } from "@/lib/db";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const updated = refreshAllDisplayNames();
  return NextResponse.json({ updated });
}
