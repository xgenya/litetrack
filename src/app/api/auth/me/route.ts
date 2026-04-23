import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json(null);
  }

  const avatarUrl = `https://mc-heads.net/avatar/${sessionUser.displayUsername}/64`;
  return NextResponse.json({
    username: sessionUser.displayUsername,
    nickname: sessionUser.nickname,
    avatarUrl,
    isAdmin: sessionUser.isAdmin,
  });
}
