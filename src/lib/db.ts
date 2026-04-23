import Database from "better-sqlite3";
import { join } from "path";
import { Project, Litematic, Material, Claim, ProjectStatus, ProjectMember, ProjectRole } from "./types";

export interface UserRecord {
  username: string;
  displayUsername: string;
  nickname: string;
  passwordHash: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: number;
}

export interface SessionRecord {
  token: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

const DB_PATH = join(process.cwd(), "data", "litematic.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = join(process.cwd(), "data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initTables();
  }
  return db;
}

function initTables() {
  const database = db!;

  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      owner TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, username)
    );

    CREATE TABLE IF NOT EXISTS litematics (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      total_types INTEGER NOT NULL,
      total_blocks INTEGER NOT NULL,
      file_data BLOB,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      litematic_id TEXT NOT NULL,
      block_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      count INTEGER NOT NULL,
      boxes INTEGER NOT NULL,
      stacks INTEGER NOT NULL,
      FOREIGN KEY (litematic_id) REFERENCES litematics(id) ON DELETE CASCADE,
      UNIQUE(litematic_id, block_id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      litematic_id TEXT NOT NULL,
      username TEXT NOT NULL,
      block_id TEXT NOT NULL,
      boxes INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (litematic_id) REFERENCES litematics(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_litematics_project ON litematics(project_id);
    CREATE INDEX IF NOT EXISTS idx_materials_litematic ON materials(litematic_id);
    CREATE INDEX IF NOT EXISTS idx_claims_project ON claims(project_id);
    CREATE INDEX IF NOT EXISTS idx_claims_litematic ON claims(litematic_id);
    CREATE INDEX IF NOT EXISTS idx_claims_username ON claims(username);
    CREATE INDEX IF NOT EXISTS idx_members_project ON project_members(project_id);
    CREATE INDEX IF NOT EXISTS idx_members_username ON project_members(username);

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      display_username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whitelist (
      username TEXT PRIMARY KEY,
      added_at INTEGER NOT NULL
    );
  `);

  // Enforce case-insensitive uniqueness on whitelist (safe to run on existing tables)
  database.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_whitelist_username_nocase ON whitelist (username COLLATE NOCASE)`
  );

  database
    .prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_whitelist_enabled', 'true')`)
    .run();

  try {
    database.exec(`ALTER TABLE projects ADD COLUMN owner TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Column already exists
  }

  try {
    database.exec(`ALTER TABLE litematics ADD COLUMN file_data BLOB`);
  } catch {
    // Column already exists
  }

  try {
    database.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  try {
    database.exec(`ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Column already exists
  }

  try {
    database.exec(`ALTER TABLE claims ADD COLUMN collected_at INTEGER`);
  } catch {
    // Column already exists
  }
}

export function createProject(name: string, description: string = "", owner: string): Project {
  const database = getDb();
  const id = generateId();
  const now = Date.now();

  database
    .prepare(
      `INSERT INTO projects (id, name, description, status, owner, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`
    )
    .run(id, name, description, owner, now, now);

  if (owner) {
    database
      .prepare(
        `INSERT INTO project_members (project_id, username, role, joined_at)
         VALUES (?, ?, 'owner', ?)`
      )
      .run(id, owner, now);
  }

  return {
    id,
    name,
    description,
    status: "active",
    owner,
    ownerNickname: "",
    members: owner ? [{ username: owner, nickname: "", role: "owner" as const, joinedAt: now }] : [],
    litematics: [],
    claims: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProject(
  id: string,
  updates: { name?: string; description?: string; status?: ProjectStatus }
): Project | null {
  const database = getDb();
  const now = Date.now();

  const sets: string[] = ["updated_at = ?"];
  const values: (string | number)[] = [now];

  if (updates.name !== undefined) {
    sets.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push("description = ?");
    values.push(updates.description);
  }
  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
  }

  values.push(id);

  database
    .prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`)
    .run(...values);

  return getProject(id);
}

export function deleteProject(id: string): boolean {
  const database = getDb();
  const result = database.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getProject(id: string): Project | null {
  const database = getDb();

  const projectRow = database
    .prepare(
      `SELECT p.*, COALESCE(u.nickname, '') AS owner_nickname
       FROM projects p
       LEFT JOIN users u ON LOWER(u.username) = LOWER(p.owner)
       WHERE p.id = ?`
    )
    .get(id) as {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    owner: string;
    owner_nickname: string;
    created_at: number;
    updated_at: number;
  } | undefined;

  if (!projectRow) return null;

  const litematics = getLitematicsByProject(id);
  const claims = getClaimsByProject(id);
  const members = getMembersByProject(id);

  return {
    id: projectRow.id,
    name: projectRow.name,
    description: projectRow.description,
    status: projectRow.status,
    owner: projectRow.owner || "",
    ownerNickname: projectRow.owner_nickname,
    members,
    litematics,
    claims,
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at,
  };
}

export function getAllProjects(): Project[] {
  const database = getDb();

  const projects = database
    .prepare("SELECT id FROM projects ORDER BY updated_at DESC")
    .all() as Array<{ id: string }>;

  return projects.map((p) => getProject(p.id)!).filter(Boolean);
}

export function getProjectsByUser(username: string): Project[] {
  const database = getDb();

  const projects = database
    .prepare(
      `SELECT DISTINCT p.id FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner = ? OR pm.username = ?
       ORDER BY p.updated_at DESC`
    )
    .all(username, username) as Array<{ id: string }>;

  return projects.map((p) => getProject(p.id)!).filter(Boolean);
}

export function getProjectsByStatus(status: ProjectStatus): Project[] {
  const database = getDb();

  const projects = database
    .prepare("SELECT id FROM projects WHERE status = ? ORDER BY updated_at DESC")
    .all(status) as Array<{ id: string }>;

  return projects.map((p) => getProject(p.id)!).filter(Boolean);
}

function getMembersByProject(projectId: string): ProjectMember[] {
  const database = getDb();

  const members = database
    .prepare(
      `SELECT pm.username, pm.role, pm.joined_at, COALESCE(u.nickname, '') AS nickname
       FROM project_members pm
       LEFT JOIN users u ON LOWER(u.username) = LOWER(pm.username)
       WHERE pm.project_id = ? ORDER BY pm.joined_at ASC`
    )
    .all(projectId) as Array<{
    username: string;
    nickname: string;
    role: ProjectRole;
    joined_at: number;
  }>;

  return members.map((m) => ({
    username: m.username,
    nickname: m.nickname,
    role: m.role,
    joinedAt: m.joined_at,
  }));
}

export function addMember(
  projectId: string,
  username: string,
  role: ProjectRole = "member"
): Project | null {
  const database = getDb();
  const now = Date.now();

  try {
    database
      .prepare(
        `INSERT INTO project_members (project_id, username, role, joined_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(projectId, username, role, now);

    database
      .prepare("UPDATE projects SET updated_at = ? WHERE id = ?")
      .run(now, projectId);
  } catch {
    // Member already exists, update role
    database
      .prepare(
        `UPDATE project_members SET role = ? WHERE project_id = ? AND username = ?`
      )
      .run(role, projectId, username);
  }

  return getProject(projectId);
}

export function removeMember(projectId: string, username: string): Project | null {
  const database = getDb();

  database
    .prepare("DELETE FROM project_members WHERE project_id = ? AND username = ?")
    .run(projectId, username);

  database
    .prepare("UPDATE projects SET updated_at = ? WHERE id = ?")
    .run(Date.now(), projectId);

  return getProject(projectId);
}

export function getUserRole(projectId: string, username: string): ProjectRole | null {
  const database = getDb();

  const project = database
    .prepare("SELECT owner FROM projects WHERE id = ?")
    .get(projectId) as { owner: string } | undefined;

  if (!project) return null;
  if (project.owner === username) return "owner";

  const member = database
    .prepare(
      "SELECT role FROM project_members WHERE project_id = ? AND username = ?"
    )
    .get(projectId, username) as { role: ProjectRole } | undefined;

  return member?.role || null;
}

export function canManageProject(projectId: string, username: string): boolean {
  const role = getUserRole(projectId, username);
  return role === "owner" || role === "admin";
}

export function canEditProject(projectId: string, username: string): boolean {
  const role = getUserRole(projectId, username);
  return role === "owner" || role === "admin";
}

export function canDeleteProject(projectId: string, username: string): boolean {
  const role = getUserRole(projectId, username);
  return role === "owner";
}

export function canClaim(projectId: string, username: string): boolean {
  const role = getUserRole(projectId, username);
  return role !== null;
}

export function addLitematic(
  projectId: string,
  filename: string,
  materials: Material[]
): Litematic | null {
  const database = getDb();
  const id = generateId();
  const now = Date.now();

  const totalTypes = materials.length;
  const totalBlocks = materials.reduce((sum, m) => sum + m.count, 0);

  const insertLitematic = database.prepare(`
    INSERT INTO litematics (id, project_id, filename, total_types, total_blocks, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMaterial = database.prepare(`
    INSERT INTO materials (litematic_id, block_id, display_name, count, boxes, stacks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateProject = database.prepare(
    "UPDATE projects SET updated_at = ? WHERE id = ?"
  );

  const transaction = database.transaction(() => {
    insertLitematic.run(id, projectId, filename, totalTypes, totalBlocks, now);

    for (const m of materials) {
      insertMaterial.run(id, m.blockId, m.displayName, m.count, m.boxes, m.stacks);
    }

    updateProject.run(now, projectId);
  });

  transaction();

  return getLitematic(id);
}

export function getLitematic(id: string): Litematic | null {
  const database = getDb();

  const row = database
    .prepare("SELECT * FROM litematics WHERE id = ?")
    .get(id) as {
    id: string;
    project_id: string;
    filename: string;
    total_types: number;
    total_blocks: number;
    created_at: number;
  } | undefined;

  if (!row) return null;

  const materials = database
    .prepare(
      "SELECT * FROM materials WHERE litematic_id = ? ORDER BY count DESC"
    )
    .all(id) as Array<{
    block_id: string;
    display_name: string;
    count: number;
    boxes: number;
    stacks: number;
  }>;

  return {
    id: row.id,
    projectId: row.project_id,
    filename: row.filename,
    totalTypes: row.total_types,
    totalBlocks: row.total_blocks,
    createdAt: row.created_at,
    materials: materials.map((m) => ({
      blockId: m.block_id,
      displayName: m.display_name,
      count: m.count,
      boxes: m.boxes,
      stacks: m.stacks,
    })),
  };
}

export function deleteLitematic(id: string): boolean {
  const database = getDb();
  const result = database.prepare("DELETE FROM litematics WHERE id = ?").run(id);
  return result.changes > 0;
}

function getLitematicsByProject(projectId: string): Litematic[] {
  const database = getDb();

  const rows = database
    .prepare(
      "SELECT id FROM litematics WHERE project_id = ? ORDER BY created_at DESC"
    )
    .all(projectId) as Array<{ id: string }>;

  return rows.map((r) => getLitematic(r.id)!).filter(Boolean);
}

function getClaimsByProject(projectId: string): Claim[] {
  const database = getDb();

  const claims = database
    .prepare(
      `SELECT c.*, COALESCE(u.nickname, '') AS nickname
       FROM claims c
       LEFT JOIN users u ON LOWER(u.username) = LOWER(c.username)
       WHERE c.project_id = ? ORDER BY c.created_at DESC`
    )
    .all(projectId) as Array<{
    id: string;
    username: string;
    nickname: string;
    block_id: string;
    litematic_id: string;
    boxes: number;
    created_at: number;
    collected_at: number | null;
  }>;

  return claims.map((c) => ({
    id: c.id,
    username: c.username,
    nickname: c.nickname,
    blockId: c.block_id,
    litematicId: c.litematic_id,
    boxes: c.boxes,
    createdAt: c.created_at,
    collectedAt: c.collected_at ?? null,
  }));
}

export function addClaim(
  projectId: string,
  litematicId: string,
  claim: Omit<Claim, "litematicId">
): Project | null {
  const database = getDb();

  database
    .prepare(
      `INSERT INTO claims (id, project_id, litematic_id, username, block_id, boxes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      claim.id,
      projectId,
      litematicId,
      claim.username,
      claim.blockId,
      claim.boxes,
      claim.createdAt
    );

  database
    .prepare("UPDATE projects SET updated_at = ? WHERE id = ?")
    .run(Date.now(), projectId);

  addMember(projectId, claim.username, "member");

  return getProject(projectId);
}

export function removeClaim(projectId: string, claimId: string): Project | null {
  const database = getDb();

  database
    .prepare("DELETE FROM claims WHERE id = ? AND project_id = ?")
    .run(claimId, projectId);

  database
    .prepare("UPDATE projects SET updated_at = ? WHERE id = ?")
    .run(Date.now(), projectId);

  return getProject(projectId);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── User functions ───────────────────────────────────────────────────────────

export function createUser(
  displayUsername: string,
  passwordHash: string
): UserRecord {
  const database = getDb();
  const username = displayUsername.toLowerCase();
  const now = Date.now();

  database
    .prepare(
      `INSERT INTO users (username, display_username, password_hash, is_active, is_admin, created_at)
       VALUES (?, ?, ?, 1, 0, ?)`
    )
    .run(username, displayUsername, passwordHash, now);

  return { username, displayUsername, nickname: "", passwordHash, isActive: true, isAdmin: false, createdAt: now };
}

export function getUserByUsername(username: string): UserRecord | null {
  const database = getDb();

  const row = database
    .prepare("SELECT * FROM users WHERE username = ? AND is_active = 1")
    .get(username.toLowerCase()) as {
    username: string;
    display_username: string;
    nickname: string;
    password_hash: string;
    is_active: number;
    is_admin: number;
    created_at: number;
  } | undefined;

  if (!row) return null;

  return {
    username: row.username,
    displayUsername: row.display_username,
    nickname: row.nickname ?? "",
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  };
}

export function getUserByUsernameAny(username: string): UserRecord | null {
  const database = getDb();

  const row = database
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username.toLowerCase()) as {
    username: string;
    display_username: string;
    nickname: string;
    password_hash: string;
    is_active: number;
    is_admin: number;
    created_at: number;
  } | undefined;

  if (!row) return null;

  return {
    username: row.username,
    displayUsername: row.display_username,
    nickname: row.nickname ?? "",
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  };
}

export function getAllUsers(): UserRecord[] {
  const database = getDb();

  const rows = database
    .prepare("SELECT * FROM users ORDER BY created_at DESC")
    .all() as Array<{
    username: string;
    display_username: string;
    nickname: string;
    password_hash: string;
    is_active: number;
    is_admin: number;
    created_at: number;
  }>;

  return rows.map((row) => ({
    username: row.username,
    displayUsername: row.display_username,
    nickname: row.nickname ?? "",
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  }));
}

export function deactivateUser(username: string): boolean {
  const database = getDb();
  const result = database
    .prepare("UPDATE users SET is_active = 0 WHERE username = ?")
    .run(username.toLowerCase());
  return result.changes > 0;
}

export function reactivateUser(username: string): boolean {
  const database = getDb();
  const result = database
    .prepare("UPDATE users SET is_active = 1 WHERE username = ?")
    .run(username.toLowerCase());
  return result.changes > 0;
}

export function setUserAdmin(username: string, isAdmin: boolean): boolean {
  const database = getDb();
  const result = database
    .prepare("UPDATE users SET is_admin = ? WHERE username = ?")
    .run(isAdmin ? 1 : 0, username.toLowerCase());
  return result.changes > 0;
}

export function updateNickname(username: string, nickname: string): boolean {
  const database = getDb();
  const result = database
    .prepare("UPDATE users SET nickname = ? WHERE username = ?")
    .run(nickname.trim(), username.toLowerCase());
  return result.changes > 0;
}

export function resetUserPassword(username: string, passwordHash: string): boolean {
  const database = getDb();
  const result = database
    .prepare("UPDATE users SET password_hash = ? WHERE username = ?")
    .run(passwordHash, username.toLowerCase());
  return result.changes > 0;
}

export function userExists(username: string): boolean {
  const database = getDb();
  const row = database
    .prepare("SELECT 1 FROM users WHERE username = ?")
    .get(username.toLowerCase());
  return !!row;
}

// ─── Session functions ────────────────────────────────────────────────────────

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function createSession(username: string): string {
  const database = getDb();
  const token = require("crypto").randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  database
    .prepare(
      `INSERT INTO sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)`
    )
    .run(token, username.toLowerCase(), now, expiresAt);

  return token;
}

export function getSessionByToken(token: string): SessionRecord | null {
  const database = getDb();
  const now = Date.now();

  const row = database
    .prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > ?"
    )
    .get(token, now) as {
    token: string;
    username: string;
    created_at: number;
    expires_at: number;
  } | undefined;

  if (!row) return null;

  return {
    token: row.token,
    username: row.username,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function deleteSession(token: string): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteUserSessions(username: string): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE username = ?").run(username.toLowerCase());
}

export function deleteExpiredSessions(): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
}

// ─── Settings functions ───────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const database = getDb();
  const row = database
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const database = getDb();
  database
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run(key, value);
}

// ─── Whitelist functions ──────────────────────────────────────────────────────

export function getWhitelist(): { username: string; addedAt: number }[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT username, added_at FROM whitelist ORDER BY added_at DESC")
    .all() as Array<{ username: string; added_at: number }>;
  return rows.map((r) => ({ username: r.username, addedAt: r.added_at }));
}

export function isWhitelisted(username: string): boolean {
  const database = getDb();
  const row = database
    .prepare("SELECT 1 FROM whitelist WHERE username = ? COLLATE NOCASE")
    .get(username.trim());
  return !!row;
}

export function addToWhitelist(username: string): boolean {
  const database = getDb();
  const trimmed = username.trim();
  if (!trimmed) return false;
  const result = database
    .prepare("INSERT OR IGNORE INTO whitelist (username, added_at) VALUES (?, ?)")
    .run(trimmed, Date.now());
  return result.changes > 0;
}

export function bulkAddToWhitelist(usernames: string[]): number {
  const database = getDb();
  const insert = database.prepare(
    "INSERT OR IGNORE INTO whitelist (username, added_at) VALUES (?, ?)"
  );
  const now = Date.now();
  const transaction = database.transaction((names: string[]) => {
    let count = 0;
    for (const raw of names) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const result = insert.run(trimmed, now);
      count += result.changes;
    }
    return count;
  });
  return transaction(usernames) as number;
}

export function removeFromWhitelist(username: string): boolean {
  const database = getDb();
  const result = database
    .prepare("DELETE FROM whitelist WHERE username = ? COLLATE NOCASE")
    .run(username.trim());
  return result.changes > 0;
}

export function getUserCount(): number {
  const database = getDb();
  const row = database
    .prepare("SELECT COUNT(*) as count FROM users")
    .get() as { count: number };
  return row.count;
}

export interface UserClaimDetail {
  claimId: string;
  blockId: string;
  displayName: string;
  boxes: number;
  createdAt: number;
  collectedAt: number | null;
  projectId: string;
  projectName: string;
  litematicId: string;
  litematicFilename: string;
}

export function getUserClaims(username: string): UserClaimDetail[] {
  const database = getDb();

  const rows = database
    .prepare(
      `SELECT
        c.id AS claim_id,
        c.block_id,
        c.boxes,
        c.created_at,
        c.collected_at,
        p.id AS project_id,
        p.name AS project_name,
        l.id AS litematic_id,
        l.filename AS litematic_filename,
        m.display_name
      FROM claims c
      JOIN projects p ON c.project_id = p.id
      JOIN litematics l ON c.litematic_id = l.id
      LEFT JOIN materials m ON m.litematic_id = c.litematic_id AND m.block_id = c.block_id
      WHERE c.username = ?
      ORDER BY (c.collected_at IS NOT NULL) ASC, c.created_at DESC`
    )
    .all(username.toLowerCase()) as Array<{
    claim_id: string;
    block_id: string;
    boxes: number;
    created_at: number;
    collected_at: number | null;
    project_id: string;
    project_name: string;
    litematic_id: string;
    litematic_filename: string;
    display_name: string | null;
  }>;

  return rows.map((r) => ({
    claimId: r.claim_id,
    blockId: r.block_id,
    displayName: r.display_name ?? r.block_id,
    boxes: r.boxes,
    createdAt: r.created_at,
    collectedAt: r.collected_at ?? null,
    projectId: r.project_id,
    projectName: r.project_name,
    litematicId: r.litematic_id,
    litematicFilename: r.litematic_filename,
  }));
}

export function markClaimCollected(claimId: string, username: string): boolean {
  const database = getDb();
  const result = database
    .prepare(
      "UPDATE claims SET collected_at = ? WHERE id = ? AND username = ?"
    )
    .run(Date.now(), claimId, username.toLowerCase());
  return result.changes > 0;
}

export function markClaimUncollected(claimId: string, username: string): boolean {
  const database = getDb();
  const result = database
    .prepare(
      "UPDATE claims SET collected_at = NULL WHERE id = ? AND username = ?"
    )
    .run(claimId, username.toLowerCase());
  return result.changes > 0;
}

/**
 * Read usernames from an uploaded EasyAuth SQLite file using ATTACH DATABASE,
 * reusing the existing db connection to avoid a second native module instance.
 * Returns the number of usernames added to the whitelist.
 */
export function importEasyAuthDbFile(tmpPath: string): { total: number; added: number } {
  const database = getDb();

  // Verify the easyauth table exists in the attached DB before importing
  database.prepare("ATTACH DATABASE ? AS easyauth_import").run(tmpPath);
  try {
    const tableRow = database
      .prepare("SELECT name FROM easyauth_import.sqlite_master WHERE type='table' AND name='easyauth'")
      .get();
    if (!tableRow) {
      throw new Error("数据库中未找到 easyauth 表");
    }

    const rows = database
      .prepare("SELECT DISTINCT username FROM easyauth_import.easyauth WHERE username IS NOT NULL AND username != ''")
      .all() as Array<{ username: string }>;

    const usernames = rows.map((r) => r.username);
    if (usernames.length === 0) {
      throw new Error("数据库中未找到有效用户名");
    }

    const added = bulkAddToWhitelist(usernames);
    return { total: usernames.length, added };
  } finally {
    database.prepare("DETACH DATABASE easyauth_import").run();
  }
}

