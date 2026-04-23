import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const ALLOWED_SETTINGS = {
  registration_whitelist_enabled: (v: unknown) =>
    v === true || v === false || v === "true" || v === "false",
} as const;

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const settings: Record<string, string> = {};
  for (const key of Object.keys(ALLOWED_SETTINGS)) {
    settings[key] = getSetting(key) ?? "";
  }
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (typeof key !== "string" || !(key in ALLOWED_SETTINGS)) {
    return NextResponse.json({ error: "无效的配置项" }, { status: 400 });
  }

  const validator = ALLOWED_SETTINGS[key as keyof typeof ALLOWED_SETTINGS];
  if (!validator(value)) {
    return NextResponse.json({ error: "无效的配置值" }, { status: 400 });
  }

  const normalized = String(value === true ? "true" : value === false ? "false" : value);
  setSetting(key, normalized);

  return NextResponse.json({ key, value: normalized });
}
