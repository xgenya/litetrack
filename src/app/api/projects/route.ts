import { NextRequest, NextResponse } from "next/server";
import { getAllProjects, createProject, getProjectsByUser } from "@/lib/db";

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
    const body = await request.json();
    const { name, description, username } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const project = createProject(name.trim(), description?.trim() || "", username);
    return NextResponse.json(project);
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "创建项目失败" },
      { status: 500 }
    );
  }
}
