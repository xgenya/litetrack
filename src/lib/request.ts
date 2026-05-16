import { NextRequest, NextResponse } from "next/server";

export type JsonBody = Record<string, unknown>;

export async function readJsonBody(request: NextRequest): Promise<JsonBody | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }
    return body as JsonBody;
  } catch {
    return null;
  }
}

export function invalidJsonResponse() {
  return NextResponse.json({ error: "请求体不是有效的 JSON" }, { status: 400 });
}
