import { NextRequest, NextResponse } from "next/server";
import { getLitematic, deleteLitematic, canEditProject } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; litematicId: string }> }
) {
  const { id, litematicId } = await params;
  const litematic = getLitematic(litematicId);

  if (!litematic || litematic.projectId !== id) {
    return NextResponse.json({ error: "投影不存在" }, { status: 404 });
  }

  return NextResponse.json(litematic);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; litematicId: string }> }
) {
  const { id, litematicId } = await params;

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!canEditProject(id, sessionUser.username) && !sessionUser.isAdmin) {
    return NextResponse.json({ error: "没有权限删除投影" }, { status: 403 });
  }

  const litematic = getLitematic(litematicId);
  if (!litematic || litematic.projectId !== id) {
    return NextResponse.json({ error: "投影不存在" }, { status: 404 });
  }

  const success = deleteLitematic(litematicId);
  if (!success) {
    return NextResponse.json({ error: "投影不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
