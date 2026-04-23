import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";
import { getSessionUser, isAdminUsername } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const users = getAllUsers();
  return NextResponse.json(
    users.map((u) => ({
      username: u.username,
      displayUsername: u.displayUsername,
      isActive: u.isActive,
      isAdmin: isAdminUsername(u.username) || u.isAdmin,
      isConfigAdmin: isAdminUsername(u.username),
      createdAt: u.createdAt,
    }))
  );
}
