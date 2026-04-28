"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { TopBar } from "@/components/TopBar";
import { McAvatar } from "@/components/McAvatar";
import {
  Users,
  Folder,
  Settings,
  ShieldCheck,
  ShieldOff,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Plus,
  Upload,
  X,
  KeyRound,
} from "lucide-react";
import { Project, ProjectStatus } from "@/lib/types";

interface UserEntry {
  username: string;
  displayUsername: string;
  isActive: boolean;
  isAdmin: boolean;
  isConfigAdmin: boolean;
  createdAt: number;
}

interface WhitelistEntry {
  username: string;
  addedAt: number;
}

type Section = "users" | "projects" | "config";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "进行中",
  paused: "已暂停",
  completed: "已完成",
};

const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "config", label: "基础配置", icon: <Settings className="w-4 h-4" /> },
  { key: "users", label: "用户管理", icon: <Users className="w-4 h-4" /> },
  { key: "projects", label: "项目管理", icon: <Folder className="w-4 h-4" /> },
];

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageContent />
    </Suspense>
  );
}

function AdminPageContent() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = (searchParams.get("tab") as Section | null) ?? "config";
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [whitelistEnabled, setWhitelistEnabled] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [togglingAdminFor, setTogglingAdminFor] = useState<string | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<string | null>(null);

  // Per-action pending states
  const [togglingWhitelist, setTogglingWhitelist] = useState(false);
  const [addingUsername, setAddingUsername] = useState("");
  const [addingPending, setAddingPending] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const [wlMsg, setWlMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [wlPage, setWlPage] = useState(1);
  const [refreshingNames, setRefreshingNames] = useState(false);
  const WL_PAGE_SIZE = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  const showMsg = (type: "ok" | "err", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [usersRes, projectsRes, settingsRes, whitelistRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/projects"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/whitelist"),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setWhitelistEnabled(s.registration_whitelist_enabled === "true");
      }
      if (whitelistRes.ok) setWhitelist(await whitelistRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) fetchData();
  }, [user, fetchData]);

  // ── User management ────────────────────────────────────────────────────────

  const handleDeactivateUser = async (username: string, displayUsername: string) => {
    if (!confirm(`确定要禁用用户 "${displayUsername}" 吗？该用户将无法登录。`)) return;
    const res = await fetch(`/api/admin/users/${username}`, { method: "DELETE" });
    if (res.ok) {
      showMsg("ok", `用户 ${displayUsername} 已被禁用`);
      fetchData();
    } else {
      const data = await res.json();
      showMsg("err", data.error || "操作失败");
    }
  };

  const handleReactivateUser = async (username: string, displayUsername: string) => {
    const res = await fetch(`/api/admin/users/${username}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      showMsg("ok", `用户 ${displayUsername} 已启用`);
      fetchData();
    } else {
      const data = await res.json();
      showMsg("err", data.error || "操作失败");
    }
  };

  const handleToggleAdmin = async (username: string, displayUsername: string, makeAdmin: boolean) => {
    setTogglingAdminFor(username);
    try {
      const res = await fetch(`/api/admin/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: makeAdmin }),
      });
      if (res.ok) {
        showMsg("ok", makeAdmin ? `已将 ${displayUsername} 设为管理员` : `已移除 ${displayUsername} 的管理员权限`);
        fetchData();
      } else {
        const data = await res.json();
        showMsg("err", data.error || "操作失败");
      }
    } finally {
      setTogglingAdminFor(null);
    }
  };

  // ── Project management ─────────────────────────────────────────────────────

  const handleResetPassword = async (username: string, displayUsername: string) => {
    if (!confirm(`确定要将 "${displayUsername}" 的密码重置为 123456 吗？该用户当前所有会话将被注销。`)) return;
    setResettingPasswordFor(username);
    try {
      const res = await fetch(`/api/admin/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      if (res.ok) {
        showMsg("ok", `${displayUsername} 的密码已重置为 123456`);
      } else {
        const data = await res.json();
        showMsg("err", data.error || "重置失败");
      }
    } finally {
      setResettingPasswordFor(null);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`确定要删除项目 "${projectName}" 吗？所有相关数据将被永久删除。`)) return;
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      showMsg("ok", `项目 "${projectName}" 已删除`);
      fetchData();
    } else {
      const data = await res.json();
      showMsg("err", data.error || "删除失败");
    }
  };

  const handleRefreshNames = async () => {
    setRefreshingNames(true);
    try {
      const res = await fetch("/api/admin/refresh-names", { method: "POST" });
      if (res.ok) {
        const { updated } = await res.json();
        showMsg("ok", `已刷新 ${updated} 种方块的显示名称`);
      } else {
        showMsg("err", "刷新失败");
      }
    } catch {
      showMsg("err", "刷新失败");
    } finally {
      setRefreshingNames(false);
    }
  };

  // ── Config management ──────────────────────────────────────────────────────

  const handleToggleWhitelist = async (enabled: boolean) => {
    setTogglingWhitelist(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "registration_whitelist_enabled", value: enabled }),
      });
      if (res.ok) {
        setWhitelistEnabled(enabled);
        showMsg("ok", enabled ? "已开启注册白名单" : "已关闭注册白名单");
      } else {
        const data = await res.json();
        showMsg("err", data.error || "设置失败");
      }
    } finally {
      setTogglingWhitelist(false);
    }
  };

  const handleAddToWhitelist = async () => {
    const name = addingUsername.trim();
    if (!name) return;
    setAddingPending(true);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddingUsername("");
        showMsg("ok", `已添加 ${data.username} 到白名单`);
        const wlRes = await fetch("/api/admin/whitelist");
        if (wlRes.ok) { setWhitelist(await wlRes.json()); setWlPage(1); }
      } else {
        showMsg("err", data.error || "添加失败");
      }
    } finally {
      setAddingPending(false);
    }
  };

  const showWlMsg = (type: "ok" | "err", text: string) => {
    setWlMsg({ type, text });
    setTimeout(() => setWlMsg(null), 3000);
  };

  const handleRemoveFromWhitelist = async (username: string) => {
    setDeletingUsername(username);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        showWlMsg("ok", `已从白名单移除 ${username}`);
        setWhitelist((prev) => {
          const next = prev.filter((e) => e.username !== username);
          // If current page becomes empty after removal, go back one page
          const maxPage = Math.max(1, Math.ceil(next.length / WL_PAGE_SIZE));
          setWlPage((p) => Math.min(p, maxPage));
          return next;
        });
      } else {
        const data = await res.json();
        showWlMsg("err", data.error || "移除失败");
      }
    } finally {
      setDeletingUsername(null);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImportPending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/whitelist/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showMsg("ok", `导入完成：共 ${data.total} 条，新增 ${data.added} 条`);
        const wlRes = await fetch("/api/admin/whitelist");
        if (wlRes.ok) { setWhitelist(await wlRes.json()); setWlPage(1); }
      } else {
        showMsg("err", data.error || "导入失败");
      }
    } finally {
      setImportPending(false);
    }
  };

  if (isLoading || (!user?.isAdmin && !isLoading)) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar title="后台管理" />

      <div className="flex flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 gap-6 flex-col md:flex-row">
        {/* Sidebar: horizontal tabs on mobile, vertical on desktop */}
        <aside className="md:w-44 md:flex-shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 sticky top-8">
            {NAV_ITEMS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => router.push(`/admin?tab=${key}`, { scroll: false })}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap md:w-full ${
                  section === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Right content */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold">
                {NAV_ITEMS.find((n) => n.key === section)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {section === "projects" && (
                <button
                  onClick={handleRefreshNames}
                  disabled={refreshingNames}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingNames ? "animate-spin" : ""}`} />
                  刷新显示名称
                </button>
              )}
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>
          </div>

          {/* Action message */}
          {actionMsg && (
            <div
              className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                actionMsg.type === "ok"
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {actionMsg.type === "err" && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {actionMsg.text}
            </div>
          )}

          {loadingData ? (
            <div className="text-center py-16 text-muted-foreground">加载中...</div>
          ) : section === "users" ? (
            /* ── Users ─────────────────────────────────────────────────────── */
            <div className="border rounded-xl overflow-hidden">
              {/* Mobile: card layout */}
              <div className="md:hidden divide-y">
                {users.length === 0 ? (
                  <p className="px-4 py-8 text-center text-muted-foreground text-sm">暂无用户</p>
                ) : (
                  users.map((u) => (
                    <div key={u.username} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <McAvatar username={u.displayUsername} size={32} className="w-8 h-8 rounded flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{u.displayUsername}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                          {u.isAdmin && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                              <ShieldCheck className="w-3 h-3" />
                              {u.isConfigAdmin ? "超级管理员" : "管理员"}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${!u.isActive ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-600"}`}>
                            {!u.isActive ? (<><ShieldOff className="w-3 h-3" /> 已禁用</>) : "正常"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("zh-CN")}</span>
                        <div className="flex items-center gap-1.5">
                          {u.username !== user!.username.toLowerCase() && (
                            <button
                              onClick={() => handleResetPassword(u.username, u.displayUsername)}
                              disabled={resettingPasswordFor === u.username}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-border text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              重置密码
                            </button>
                          )}
                          {u.username !== user!.username.toLowerCase() && !u.isConfigAdmin && u.isActive && (
                            <button
                              onClick={() => handleToggleAdmin(u.username, u.displayUsername, !u.isAdmin)}
                              disabled={togglingAdminFor === u.username}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {u.isAdmin ? "移除管理员" : "设为管理员"}
                            </button>
                          )}
                          {u.username !== user!.username.toLowerCase() && (
                            u.isActive ? (
                              <button
                                onClick={() => handleDeactivateUser(u.username, u.displayUsername)}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <ShieldOff className="w-3.5 h-3.5" />
                                禁用
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivateUser(u.username, u.displayUsername)}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-green-500/30 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                启用
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Desktop: table layout */}
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-4 py-3 text-sm font-medium">用户</th>
                    <th className="px-4 py-3 text-sm font-medium">注册时间</th>
                    <th className="px-4 py-3 text-sm font-medium">角色</th>
                    <th className="px-4 py-3 text-sm font-medium">状态</th>
                    <th className="px-4 py-3 text-sm font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        暂无用户
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.username} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <McAvatar
                              username={u.displayUsername}
                              size={32}
                              className="w-8 h-8 rounded"
                            />
                            <div>
                              <p className="font-medium text-sm">{u.displayUsername}</p>
                              <p className="text-xs text-muted-foreground">{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="px-4 py-3">
                          {u.isAdmin ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                              <ShieldCheck className="w-3 h-3" />
                              {u.isConfigAdmin ? "超级管理员" : "管理员"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">普通用户</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              !u.isActive
                                ? "bg-red-500/10 text-red-500"
                                : "bg-green-500/10 text-green-600"
                            }`}
                          >
                            {!u.isActive ? (
                              <><ShieldOff className="w-3 h-3" /> 已禁用</>
                            ) : (
                              "正常"
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.username !== user!.username.toLowerCase() && (
                              <button
                                onClick={() => handleResetPassword(u.username, u.displayUsername)}
                                disabled={resettingPasswordFor === u.username}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-border text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                重置密码
                              </button>
                            )}
                            {u.username !== user!.username.toLowerCase() && !u.isConfigAdmin && u.isActive && (
                              <button
                                onClick={() => handleToggleAdmin(u.username, u.displayUsername, !u.isAdmin)}
                                disabled={togglingAdminFor === u.username}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {u.isAdmin ? "移除管理员" : "设为管理员"}
                              </button>
                            )}
                            {u.username !== user!.username.toLowerCase() && (
                              u.isActive ? (
                                <button
                                  onClick={() => handleDeactivateUser(u.username, u.displayUsername)}
                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  禁用
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateUser(u.username, u.displayUsername)}
                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-green-500/30 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  启用
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : section === "projects" ? (
            /* ── Projects ───────────────────────────────────────────────────── */
            <div className="space-y-4">
            <div className="border rounded-xl overflow-hidden">
              {/* Mobile: card layout */}
              <div className="md:hidden divide-y">
                {projects.length === 0 ? (
                  <p className="px-4 py-8 text-center text-muted-foreground text-sm">暂无项目</p>
                ) : (
                  projects.map((p) => (
                    <div key={p.id} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <a
                            href={`/project/${p.id}`}
                            className="font-medium text-sm hover:text-primary transition-colors truncate block"
                          >
                            {p.name}
                          </a>
                          {p.description && (
                            <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteProject(p.id, p.name)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          删除
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{p.owner}</span>
                        <span>·</span>
                        <span>{STATUS_LABELS[p.status]}</span>
                        <span>·</span>
                        <span>{p.members.length} 人</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Desktop: table layout */}
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-4 py-3 text-sm font-medium">项目</th>
                    <th className="px-4 py-3 text-sm font-medium">创建者</th>
                    <th className="px-4 py-3 text-sm font-medium">状态</th>
                    <th className="px-4 py-3 text-sm font-medium">成员</th>
                    <th className="px-4 py-3 text-sm font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        暂无项目
                      </td>
                    </tr>
                  ) : (
                    projects.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <a
                            href={`/project/${p.id}`}
                            className="font-medium text-sm hover:text-primary transition-colors"
                          >
                            {p.name}
                          </a>
                          {p.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {p.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.owner}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {STATUS_LABELS[p.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.members.length} 人
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteProject(p.id, p.name)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </div>
          ) : (
            /* ── Config ─────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {/* Whitelist toggle */}
              <div className="border rounded-xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">开启注册白名单</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      开启后，仅白名单中的用户名可以注册。管理员账号不受此限制。
                    </p>
                  </div>
                  <button
                    onClick={() => !togglingWhitelist && handleToggleWhitelist(!whitelistEnabled)}
                    disabled={togglingWhitelist}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      whitelistEnabled ? "bg-primary" : "bg-muted"
                    } ${togglingWhitelist ? "opacity-60 cursor-not-allowed" : ""}`}
                    role="switch"
                    aria-checked={whitelistEnabled}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        whitelistEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Whitelist management */}
              <div className="border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">白名单用户名</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      共 {whitelist.length} 条
                    </p>
                  </div>
                  {/* Import EasyAuth DB */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".db"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                    <button
                      onClick={() => !importPending && fileInputRef.current?.click()}
                      disabled={importPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {importPending ? "导入中..." : "导入 EasyAuth DB"}
                    </button>
                  </div>
                </div>

                {/* Manual add */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addingUsername}
                    onChange={(e) => setAddingUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !addingPending && handleAddToWhitelist()}
                    placeholder="输入 Minecraft 用户名"
                    disabled={addingPending}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                  <button
                    onClick={handleAddToWhitelist}
                    disabled={addingPending || !addingUsername.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>

                {/* Whitelist entries table */}
                {whitelist.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    白名单为空
                  </p>
                ) : (() => {
                  const totalPages = Math.max(1, Math.ceil(whitelist.length / WL_PAGE_SIZE));
                  const pageEntries = whitelist.slice(
                    (wlPage - 1) * WL_PAGE_SIZE,
                    wlPage * WL_PAGE_SIZE
                  );
                  return (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y">
                          {pageEntries.map((entry) => (
                            <div key={entry.username} className="flex items-center justify-between px-4 py-3 gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <McAvatar username={entry.username} size={24} className="w-6 h-6 rounded flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{entry.username}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(entry.addedAt).toLocaleDateString("zh-CN")}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => deletingUsername !== entry.username && handleRemoveFromWhitelist(entry.username)}
                                disabled={deletingUsername === entry.username}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0"
                              >
                                <X className="w-3 h-3" />
                                {deletingUsername === entry.username ? "移除中..." : "移除"}
                              </button>
                            </div>
                          ))}
                        </div>
                        {/* Desktop table */}
                        <table className="w-full hidden md:table">
                          <thead>
                            <tr className="border-b bg-muted/30 text-left">
                              <th className="px-4 py-2.5 text-xs font-medium">用户名</th>
                              <th className="px-4 py-2.5 text-xs font-medium">添加时间</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-right">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageEntries.map((entry) => (
                              <tr key={entry.username} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <McAvatar username={entry.username} size={24} className="w-6 h-6 rounded flex-shrink-0" />
                                    <span className="text-sm">{entry.username}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-muted-foreground">
                                  {new Date(entry.addedAt).toLocaleDateString("zh-CN")}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => deletingUsername !== entry.username && handleRemoveFromWhitelist(entry.username)}
                                    disabled={deletingUsername === entry.username}
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <X className="w-3 h-3" />
                                    {deletingUsername === entry.username ? "移除中..." : "移除"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            共 {whitelist.length} 条，第 {wlPage} / {totalPages} 页
                          </span>
                          {wlMsg && (
                            <span
                              className={`text-xs ${
                                wlMsg.type === "ok" ? "text-green-600" : "text-destructive"
                              }`}
                            >
                              {wlMsg.text}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setWlPage((p) => Math.max(1, p - 1))}
                            disabled={wlPage === 1}
                            className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            上一页
                          </button>
                          <button
                            onClick={() => setWlPage((p) => Math.min(totalPages, p + 1))}
                            disabled={wlPage === totalPages}
                            className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            下一页
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
