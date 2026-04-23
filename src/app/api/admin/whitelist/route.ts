import { NextRequest, NextResponse } from "next/server";
import { getWhitelist, addToWhitelist, removeFromWhitelist } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  return NextResponse.json(getWhitelist());
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { username } = await request.json();
  if (!username || typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
  }

  const added = addToWhitelist(username);
  if (!added) {
    return NextResponse.json({ error: "该用户名已在白名单中" }, { status: 409 });
  }

  return NextResponse.json({ success: true, username: username.trim().toLowerCase() });
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { username } = await request.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
  }

  const removed = removeFromWhitelist(username);
  if (!removed) {
    return NextResponse.json({ error: "该用户名不在白名单中" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
