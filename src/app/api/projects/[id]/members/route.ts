import { NextRequest, NextResponse } from "next/server";
import { addMember, removeMember, canManageProject, getProject } from "@/lib/db";
import { ProjectRole } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!canManageProject(id, sessionUser.username)) {
    return NextResponse.json({ error: "没有权限管理成员" }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (!body) return invalidJsonResponse();
  const { targetUsername, role } = body;

  if (typeof targetUsername !== "string" || !targetUsername.trim()) {
    return NextResponse.json({ error: "请指定要添加的用户" }, { status: 400 });
  }

  const roleValue: ProjectRole | undefined =
    role === "admin" || role === "member" ? role : undefined;
  if (role !== undefined && !roleValue) {
    return NextResponse.json({ error: "无效的角色" }, { status: 400 });
  }

  const project = addMember(id, targetUsername, roleValue ?? "member");
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

  if (project.owner.localeCompare(targetUsername, undefined, { sensitivity: "accent" }) === 0) {
    return NextResponse.json({ error: "不能移除项目创建者" }, { status: 400 });
  }

  if (
    !canManageProject(id, sessionUser.username) &&
    sessionUser.username.localeCompare(targetUsername, undefined, { sensitivity: "accent" }) !== 0
  ) {
    return NextResponse.json({ error: "没有权限移除成员" }, { status: 403 });
  }

  const updated = removeMember(id, targetUsername);
  return NextResponse.json(updated);
}
