import { NextRequest, NextResponse } from "next/server";
import { addClaimIfAvailable, removeClaim, getProject } from "@/lib/db";
import { Claim } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body) return invalidJsonResponse();
  const { blockId, litematicId, boxes } = body;

  if (
    typeof blockId !== "string" ||
    typeof litematicId !== "string" ||
    typeof boxes !== "number" ||
    !Number.isInteger(boxes) ||
    boxes < 1
  ) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const claim: Omit<Claim, "litematicId"> = {
    id: generateId(),
    username: sessionUser.username,
    nickname: sessionUser.nickname,
    blockId,
    boxes,
    createdAt: Date.now(),
  };

  const result = addClaimIfAvailable(id, litematicId, claim);
  if (!result.ok) {
    const errorMap = {
      project_not_found: { error: "项目不存在", status: 404 },
      litematic_not_found: { error: "投影不存在", status: 404 },
      material_not_found: { error: "材料不存在", status: 404 },
      insufficient_boxes: { error: "剩余盒数不足", status: 400 },
    } as const;
    const { error, status } = errorMap[result.error];
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json(result.project);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get("claimId");

  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!claimId) {
    return NextResponse.json({ error: "缺少 claimId" }, { status: 400 });
  }

  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const claim = project.claims.find((c) => c.id === claimId);
  if (!claim) {
    return NextResponse.json({ error: "认领记录不存在" }, { status: 404 });
  }

  if (
    claim.username.localeCompare(sessionUser.username, undefined, { sensitivity: "accent" }) !== 0 &&
    !sessionUser.isAdmin
  ) {
    return NextResponse.json({ error: "只能取消自己的认领" }, { status: 403 });
  }

  const updated = removeClaim(id, claimId);
  if (!updated) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
