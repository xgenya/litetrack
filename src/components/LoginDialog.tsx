"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@/lib/user-context";
import { LogIn, LogOut, User } from "lucide-react";
import Link from "next/link";
import { McAvatar } from "./McAvatar";

export function LoginDialog() {
  const { user, login, register, logout, isLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleClose = () => {
    setIsOpen(false);
    setUsername("");
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setSubmitting(true);
    setError("");
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />;
  }

  if (user) {
    const displayName = user.nickname || user.username;

    return (
      <div className="flex items-center gap-2">
        <Link href="/me" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <McAvatar
            username={user.username}
            size={64}
            className="w-7 h-7 rounded block-icon"
          />
          <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
        </Link>
        <button
          onClick={() => logout()}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          title="退出登录"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  const dialog = isOpen && mounted ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-background border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <User className="w-5 h-5" />
          {mode === "login" ? "登录" : "注册"}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {mode === "login"
            ? "使用已有账号登录"
            : "创建新账号，用户名将作为 Minecraft 头像"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Minecraft 用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入你的 MC 用户名"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              autoFocus
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "至少 6 位" : "输入密码"}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!username.trim() || !password || submitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? "..." : mode === "login" ? "登录" : "注册"}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              还没有账号？{" "}
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="text-primary hover:underline"
              >
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="text-primary hover:underline"
              >
                登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        <LogIn className="w-4 h-4" />
        <span>登录</span>
      </button>
      {mounted && dialog && createPortal(dialog, document.body)}
    </>
  );
}
