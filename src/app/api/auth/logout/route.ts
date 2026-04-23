import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";
import { getTokenFromRequest, buildClearSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (token) {
    deleteSession(token);
  }
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildClearSessionCookie());
  return response;
}
