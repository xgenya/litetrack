import Database from "better-sqlite3";
import { join } from "path";
import { Project, Litematic, Material, Claim, ProjectStatus, ProjectMember, ProjectRole } from "./types";

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
  `);

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
    members: owner ? [{ username: owner, role: "owner", joinedAt: now }] : [],
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
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    owner: string;
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
      "SELECT * FROM project_members WHERE project_id = ? ORDER BY joined_at ASC"
    )
    .all(projectId) as Array<{
    username: string;
    role: ProjectRole;
    joined_at: number;
  }>;

  return members.map((m) => ({
    username: m.username,
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
      "SELECT * FROM claims WHERE project_id = ? ORDER BY created_at DESC"
    )
    .all(projectId) as Array<{
    id: string;
    username: string;
    block_id: string;
    litematic_id: string;
    boxes: number;
    created_at: number;
  }>;

  return claims.map((c) => ({
    id: c.id,
    username: c.username,
    blockId: c.block_id,
    litematicId: c.litematic_id,
    boxes: c.boxes,
    createdAt: c.created_at,
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
