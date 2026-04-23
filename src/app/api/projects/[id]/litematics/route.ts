import { NextRequest, NextResponse } from "next/server";
import { addLitematic, getProject, canEditProject } from "@/lib/db";
import { parseLitematic } from "@/lib/litematic-parser";
import { getBlockDisplayName } from "@/lib/block-names";
import { getSessionUser } from "@/lib/auth";

// Allow up to 60s for parsing large litematics
export const maxDuration = 60;

// Max upload size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const project = getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!canEditProject(id, sessionUser.displayUsername)) {
      return NextResponse.json({ error: "没有权限上传投影" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "没有上传文件" }, { status: 400 });
    }

    if (!file.name.endsWith(".litematic")) {
      return NextResponse.json(
        { error: "请上传 .litematic 格式的文件" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rawMaterials = parseLitematic(buffer);

    const materials = rawMaterials.map((m) => ({
      blockId: m.blockId,
      displayName: getBlockDisplayName(m.blockId),
      count: m.count,
      boxes: Math.ceil(m.count / 1728),
      stacks: Math.ceil(m.count / 64),
    }));

    const filename = file.name.replace(".litematic", "");
    const litematic = addLitematic(id, filename, materials);

    if (!litematic) {
      return NextResponse.json({ error: "添加投影失败" }, { status: 500 });
    }

    return NextResponse.json(litematic);
  } catch (error) {
    console.error("Upload litematic error:", error);
    return NextResponse.json(
      { error: "上传失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
