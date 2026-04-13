"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@/lib/user-context";
import { LogIn, LogOut, User } from "lucide-react";

export function LoginDialog() {
  const { user, login, logout, isLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading) {
    return (
      <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={user.avatarUrl}
          alt={user.username}
          className="w-7 h-7 rounded block-icon"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://mc-heads.net/avatar/MHF_Steve/64";
          }}
        />
        <span className="text-sm font-medium hidden sm:inline">{user.username}</span>
        <button
          onClick={logout}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          title="退出登录"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      login(username.trim());
      setIsOpen(false);
      setUsername("");
    }
  };

  const dialog = isOpen && mounted ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative bg-background border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          登录
        </h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm text-muted-foreground mb-2">
              Minecraft 用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入你的 MC 用户名"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              将使用此用户名获取你的 Minecraft 头像
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!username.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              登录
            </button>
          </div>
        </form>
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
