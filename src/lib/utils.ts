import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format display name as "username(nickname)" when nickname exists, else "username" */
export function formatUser(username: string, nickname?: string | null): string {
  return nickname?.trim() ? `${username}(${nickname.trim()})` : username;
}
