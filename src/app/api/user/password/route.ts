import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { getUserByUsername, resetUserPassword } from "@/lib/db";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { oldPassword, newPassword } = await request.json();

  if (!oldPassword || typeof oldPassword !== "string") {
    return NextResponse.json({ error: "请输入原密码" }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ error: "新密码不能少于 6 位" }, { status: 400 });
  }

  const userRecord = getUserByUsername(sessionUser.username);
  if (!userRecord) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const valid = await verifyPassword(oldPassword, userRecord.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "原密码不正确" }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  resetUserPassword(sessionUser.username, passwordHash);

  return NextResponse.json({ success: true });
}
