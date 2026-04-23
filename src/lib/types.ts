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
  nickname: string;
  blockId: string;
  litematicId: string;
  boxes: number;
  createdAt: number;
  collectedAt?: number | null;
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
  nickname: string;
  role: ProjectRole;
  joinedAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  ownerNickname: string;
  members: ProjectMember[];
  litematics: Litematic[];
  claims: Claim[];
  createdAt: number;
  updatedAt: number;
}

export type SystemRole = "admin" | "user";

export interface User {
  username: string;
  nickname: string;
  avatarUrl: string;
  isAdmin: boolean;
}
