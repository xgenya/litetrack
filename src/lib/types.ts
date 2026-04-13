export interface Material {
  blockId: string;
  displayName: string;
  count: number;
  boxes: number;
  stacks: number;
}

export interface Claim {
  id: string;
  username: string;
  blockId: string;
  litematicId: string;
  boxes: number;
  createdAt: number;
}

export interface Litematic {
  id: string;
  projectId: string;
  filename: string;
  materials: Material[];
  totalTypes: number;
  totalBlocks: number;
  createdAt: number;
}

export type ProjectStatus = "active" | "paused" | "completed";

export type ProjectRole = "owner" | "admin" | "member";

export interface ProjectMember {
  username: string;
  role: ProjectRole;
  joinedAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  members: ProjectMember[];
  litematics: Litematic[];
  claims: Claim[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  username: string;
  avatarUrl: string;
}
