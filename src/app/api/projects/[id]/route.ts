import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject, deleteProject, canEditProject, canDeleteProject, getUserRole } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getSessionUser(request);

  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const userRole = sessionUser ? getUserRole(id, sessionUser.username) : null;

  return NextResponse.json({ ...project, userRole });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!canEditProject(id, sessionUser.username)) {
    return NextResponse.json({ error: "没有权限修改此项目" }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (!body) return invalidJsonResponse();
  const { name, description, status } = body;

  const project = updateProject(id, {
    name: typeof name === "string" ? name : undefined,
    description: typeof description === "string" ? description : undefined,
    status: status === "active" || status === "paused" || status === "completed" ? status : undefined,
  });
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

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!canDeleteProject(id, sessionUser.username) && !sessionUser.isAdmin) {
    return NextResponse.json({ error: "只有项目创建者可以删除项目" }, { status: 403 });
  }

  const success = deleteProject(id);
  if (!success) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
