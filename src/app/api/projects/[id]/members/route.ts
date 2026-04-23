import { NextRequest, NextResponse } from "next/server";
import { addMember, removeMember, canManageProject, getProject } from "@/lib/db";
import { ProjectRole } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!canManageProject(id, sessionUser.displayUsername)) {
    return NextResponse.json({ error: "没有权限管理成员" }, { status: 403 });
  }

  const body = await request.json();
  const { targetUsername, role } = body;

  if (!targetUsername) {
    return NextResponse.json({ error: "请指定要添加的用户" }, { status: 400 });
  }

  const validRoles: ProjectRole[] = ["admin", "member"];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: "无效的角色" }, { status: 400 });
  }

  const project = addMember(id, targetUsername, role || "member");
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const targetUsername = searchParams.get("target");

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!targetUsername) {
    return NextResponse.json({ error: "请指定要移除的用户" }, { status: 400 });
  }

  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  if (project.owner.toLowerCase() === targetUsername.toLowerCase()) {
    return NextResponse.json({ error: "不能移除项目创建者" }, { status: 400 });
  }

  if (
    !canManageProject(id, sessionUser.displayUsername) &&
    sessionUser.displayUsername.toLowerCase() !== targetUsername.toLowerCase()
  ) {
    return NextResponse.json({ error: "没有权限移除成员" }, { status: 403 });
  }

  const updated = removeMember(id, targetUsername);
  return NextResponse.json(updated);
}
