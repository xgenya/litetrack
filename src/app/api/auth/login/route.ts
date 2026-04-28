import { NextRequest, NextResponse } from "next/server";
import { getUserByUsernameAny, createSession } from "@/lib/db";
import { verifyPassword, isAdminUsername, buildSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "请填写用户名和密码" }, { status: 400 });
    }

    const user = getUserByUsernameAny(username.trim());
    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    // Check after password verification to avoid leaking account existence
    if (!user.isActive) {
      return NextResponse.json({ error: "该账号已被禁用，请联系管理员" }, { status: 403 });
    }

    const token = createSession(user.username);
    const avatarUrl = `/api/avatar?username=${encodeURIComponent(user.displayUsername)}&size=64`;
    const isAdmin = isAdminUsername(user.username) || user.isAdmin;

    const response = NextResponse.json({
      username: user.displayUsername,
      nickname: user.nickname,
      avatarUrl,
      isAdmin,
    });
    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
