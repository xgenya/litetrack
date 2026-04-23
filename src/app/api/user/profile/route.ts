import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateNickname } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { nickname } = await request.json();

  if (typeof nickname !== "string") {
    return NextResponse.json({ error: "昵称格式不正确" }, { status: 400 });
  }

  const trimmed = nickname.trim();
  if (trimmed.length > 20) {
    return NextResponse.json({ error: "昵称不能超过 20 个字符" }, { status: 400 });
  }

  updateNickname(sessionUser.username, trimmed);

  return NextResponse.json({ nickname: trimmed });
}
