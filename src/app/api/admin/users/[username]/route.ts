import { NextRequest, NextResponse } from "next/server";
import { deactivateUser, deleteUserSessions, setUserAdmin, reactivateUser, resetUserPassword } from "@/lib/db";
import { getSessionUser, isAdminUsername, hashPassword } from "@/lib/auth";

const RESET_PASSWORD = "123456";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { username } = await params;

  if (username === sessionUser.username) {
    return NextResponse.json({ error: "不能禁用自己的账号" }, { status: 400 });
  }

  deleteUserSessions(username);
  const success = deactivateUser(username);

  if (!success) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { username } = await params;
  const body = await request.json();

  // Reset password
  if ("resetPassword" in body && body.resetPassword === true) {
    const passwordHash = await hashPassword(RESET_PASSWORD);
    deleteUserSessions(username);
    const success = resetUserPassword(username, passwordHash);
    return success
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // Re-enable user
  if ("isActive" in body) {
    const { isActive } = body;
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    if (isActive) {
      const success = reactivateUser(username);
      return success
        ? NextResponse.json({ success: true })
        : NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
  }

  // Set admin role
  if ("isAdmin" in body) {
    const { isAdmin } = body;
    if (typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    if (!isAdmin && isAdminUsername(username)) {
      return NextResponse.json({ error: "该用户是配置文件中的管理员，无法移除" }, { status: 403 });
    }
    const success = setUserAdmin(username, isAdmin);
    return success
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json({ error: "参数错误" }, { status: 400 });
}
