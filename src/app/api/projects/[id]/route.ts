import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject, deleteProject, canEditProject, canDeleteProject, getUserRole } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  const project = getProject(id);

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const userRole = username ? getUserRole(id, username) : null;

  return NextResponse.json({
    ...project,
    userRole,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, description, status, username } = body;

  if (!username) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!canEditProject(id, username)) {
    return NextResponse.json({ error: "没有权限修改此项目" }, { status: 403 });
  }

  const project = updateProject(id, { name, description, status });

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
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!canDeleteProject(id, username)) {
    return NextResponse.json({ error: "只有项目创建者可以删除项目" }, { status: 403 });
  }

  const success = deleteProject(id);

  if (!success) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
