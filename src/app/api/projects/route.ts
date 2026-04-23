import { NextRequest, NextResponse } from "next/server";
import { getAllProjects, createProject, getProjectsByUser } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (username) {
    const projects = getProjectsByUser(username);
    return NextResponse.json(projects);
  }

  const projects = getAllProjects();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (!sessionUser.isAdmin) {
      return NextResponse.json({ error: "只有管理员可以创建项目" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
    }

    const project = createProject(name.trim(), description?.trim() || "", sessionUser.displayUsername);
    return NextResponse.json(project);
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
  }
}
