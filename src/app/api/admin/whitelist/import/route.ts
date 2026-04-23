import { NextRequest, NextResponse } from "next/server";
import { bulkAddToWhitelist } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";
import Database from "better-sqlite3";

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

    const importDb = new Database(tmpPath, { readonly: true });

    let usernames: string[];
    try {
      // Verify table exists
      const tableRow = importDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='easyauth'")
        .get();
      if (!tableRow) {
        return NextResponse.json({ error: "数据库中未找到 easyauth 表" }, { status: 422 });
      }

      const rows = importDb
        .prepare("SELECT DISTINCT username FROM easyauth WHERE username IS NOT NULL AND username != ''")
        .all() as Array<{ username: string }>;

      usernames = rows.map((r) => r.username);
    } finally {
      importDb.close();
    }

    if (usernames.length === 0) {
      return NextResponse.json({ error: "数据库中未找到有效用户名" }, { status: 422 });
    }

    const added = bulkAddToWhitelist(usernames);
    return NextResponse.json({ success: true, total: usernames.length, added });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
