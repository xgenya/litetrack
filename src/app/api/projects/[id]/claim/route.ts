import { NextRequest, NextResponse } from "next/server";
import { addClaim, removeClaim, getProject, getLitematic } from "@/lib/db";
import { Claim } from "@/lib/types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { username, blockId, litematicId, boxes } = body;

  if (!username || !blockId || !litematicId || !boxes || boxes < 1) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const litematic = getLitematic(litematicId);
  if (!litematic || litematic.projectId !== id) {
    return NextResponse.json({ error: "投影不存在" }, { status: 404 });
  }

  const material = litematic.materials.find((m) => m.blockId === blockId);
  if (!material) {
    return NextResponse.json({ error: "材料不存在" }, { status: 404 });
  }

  const claimedBoxes = project.claims
    .filter((c) => c.litematicId === litematicId && c.blockId === blockId)
    .reduce((sum, c) => sum + c.boxes, 0);

  const remainingBoxes = material.boxes - claimedBoxes;
  if (boxes > remainingBoxes) {
    return NextResponse.json({ error: "剩余盒数不足" }, { status: 400 });
  }

  const claim: Omit<Claim, "litematicId"> = {
    id: generateId(),
    username,
    blockId,
    boxes,
    createdAt: Date.now(),
  };

  const updated = addClaim(id, litematicId, claim);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get("claimId");

  if (!claimId) {
    return NextResponse.json({ error: "缺少 claimId" }, { status: 400 });
  }

  const updated = removeClaim(id, claimId);
  if (!updated) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
