import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { getSessionByToken, getUserByUsername } from "./db";

// ─── Password hashing ─────────────────────────────────────────────────────────

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return resolve(false);
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else {
        try {
          resolve(timingSafeEqual(Buffer.from(hash, "hex"), derivedKey));
        } catch {
          resolve(false);
        }
      }
    });
  });
}

// ─── Admin usernames ──────────────────────────────────────────────────────────

export function getAdminUsernames(): string[] {
  const raw = process.env.ADMIN_USERNAMES || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUsername(username: string): boolean {
  const admins = getAdminUsernames();
  return admins.includes(username.toLowerCase());
}

// ─── Session / cookie helpers ─────────────────────────────────────────────────

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export function buildSessionCookie(token: string): string {
  const useSecure = process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production";
  const secure = useSecure ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}${secure}`;
}

export function buildClearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get(COOKIE_NAME);
  return cookie?.value || null;
}

// ─── Get authenticated user from request ─────────────────────────────────────

export interface SessionUser {
  username: string;
  displayUsername: string;
  nickname: string;
  isAdmin: boolean;
}

export async function getSessionUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const session = getSessionByToken(token);
  if (!session) return null;

  const user = getUserByUsername(session.username);
  if (!user || !user.isActive) return null;

  return {
    username: user.username,
    displayUsername: user.displayUsername,
    nickname: user.nickname,
    isAdmin: isAdminUsername(user.username) || user.isAdmin,
  };
}
