import { NextRequest, NextResponse } from "next/server";
import { userExists, createUser, createSession, getSetting, isWhitelisted, getUserCount } from "@/lib/db";
import { hashPassword, isAdminUsername, buildSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || typeof username !== "string" || username.trim() === "") {
      return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "密码不能少于 6 位" }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Whitelist check: skip for admins and for the very first user
    const whitelistEnabled = getSetting("registration_whitelist_enabled") === "true";
    if (
      whitelistEnabled &&
      !isAdminUsername(trimmedUsername) &&
      getUserCount() > 0 &&
      !isWhitelisted(trimmedUsername)
    ) {
      return NextResponse.json({ error: "该用户名不在注册白名单中" }, { status: 403 });
    }

    if (userExists(trimmedUsername)) {
      return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    createUser(trimmedUsername, passwordHash);
    const token = createSession(trimmedUsername);

    const avatarUrl = `/api/avatar?username=${encodeURIComponent(trimmedUsername)}&size=64`;
    const isAdmin = isAdminUsername(trimmedUsername);

    const response = NextResponse.json({
      username: trimmedUsername,
      nickname: "",
      avatarUrl,
      isAdmin,
    });
    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
