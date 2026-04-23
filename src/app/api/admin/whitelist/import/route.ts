import { NextRequest, NextResponse } from "next/server";
import { importEasyAuthDbFile } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SQLITE_HEADER = "SQLite format 3\x00";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "未上传文件" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "文件过大（最大 10MB）" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate SQLite header
  if (
    buffer.length < SQLITE_HEADER.length ||
    buffer.slice(0, SQLITE_HEADER.length).toString("binary") !== SQLITE_HEADER
  ) {
    return NextResponse.json({ error: "文件不是有效的 SQLite 数据库" }, { status: 400 });
  }

  const tmpPath = join(tmpdir(), `easyauth-import-${randomBytes(8).toString("hex")}.db`);

  try {
    await writeFile(tmpPath, buffer);
    const { total, added } = importEasyAuthDbFile(tmpPath);
    return NextResponse.json({ success: true, total, added });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "导入失败";
    return NextResponse.json({ error: msg }, { status: 422 });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
