"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  FolderOpen,
  Clock,
  CheckCircle,
  PauseCircle,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { useUser } from "@/lib/user-context";
import { Project, ProjectStatus } from "@/lib/types";
import { formatUser } from "@/lib/utils";
import { McAvatar } from "@/components/McAvatar";
import { AvatarStack } from "@/components/AvatarStack";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  active: {
    label: "进行中",
    icon: <Play className="w-4 h-4" />,
    color: "text-green-500 bg-green-500/10",
  },
  paused: {
    label: "已暂停",
    icon: <PauseCircle className="w-4 h-4" />,
    color: "text-yellow-500 bg-yellow-500/10",
  },
  completed: {
    label: "已完成",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-blue-500 bg-blue-500/10",
  },
};

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user) return;

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim(),
        }),
      });

      if (res.ok) {
        const project = await res.json();
        router.push(`/project/${project.id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "创建失败");
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      toast.error("创建失败，请重试");
    } finally {
      setCreating(false);
    }
  };

  const canManageProject = (project: Project) => {
    if (!user) return false;
    return project.owner === user.username || 
      project.members.some(m => m.username === user.username && m.role === "admin");
  };

  const canDeleteProject = (project: Project) => {
    if (!user) return false;
    return project.owner === user.username;
  };

  const handleUpdateStatus = async (projectId: string, status: ProjectStatus) => {
    if (!user) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "更新失败");
      }
    } catch (err) {
      console.error("Failed to update project:", err);
    }
    setActiveMenu(null);
  };

  const handleDelete = async (projectId: string) => {
    if (!user) return;
    if (!confirm("确定要删除这个项目吗？所有相关数据将被永久删除。")) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "删除失败");
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
    setActiveMenu(null);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !user) return;

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProject.name,
          description: editingProject.description,
        }),
      });

      if (res.ok) {
        fetchProjects();
        setEditingProject(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "更新失败");
      }
    } catch (err) {
      console.error("Failed to update project:", err);
    }
  };

  const filteredProjects =
    statusFilter === "all"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  const getProjectStats = (project: Project) => {
    const totalBoxes = project.litematics.reduce(
      (sum, l) => sum + l.materials.reduce((s, m) => s + m.boxes, 0),
      0
    );
    const claimedBoxes = project.claims.reduce((sum, c) => sum + c.boxes, 0);
    const collectedBoxes = project.claims.reduce(
      (sum, c) => sum + (c.collectedAt != null ? c.boxes : 0),
      0
    );
    return { totalBoxes, claimedBoxes, collectedBoxes };
  };

  const getParticipants = (project: Project) => {
    const participants = new Set<string>();
    project.members.forEach(m => {
      if (m.username !== project.owner) {
        participants.add(m.username);
      }
    });
    return Array.from(participants);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold shrink-0">项目列表</h1>
          {user?.isAdmin && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shrink-0"
            >
              <Plus className="w-4 h-4" />
              创建项目
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            全部 ({projects.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = projects.filter((p) => p.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors flex items-center gap-1 ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {config.icon}
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.length === 0 && !user ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {statusFilter === "all" ? "还没有项目" : "没有符合条件的项目"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProjects.map((project) => {
                const stats = getProjectStats(project);
                const progress =
                  stats.totalBoxes > 0
                    ? Math.round((stats.claimedBoxes / stats.totalBoxes) * 100)
                    : 0;
                const collectProgress =
                  stats.claimedBoxes > 0
                    ? Math.round((stats.collectedBoxes / stats.claimedBoxes) * 100)
                    : 0;
                const config = STATUS_CONFIG[project.status];
                const participants = getParticipants(project);

                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors relative group"
                    onClick={() => router.push(`/project/${project.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {project.name}
                          </CardTitle>
                          {project.description && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                        {canManageProject(project) && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(
                                  activeMenu === project.id ? null : project.id
                                );
                              }}
                              className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenu === project.id && (
                              <div
                                className="absolute right-0 top-8 bg-background border rounded-md shadow-lg py-1 z-20 min-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setEditingProject(project);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                >
                                  <Pencil className="w-4 h-4" />
                                  编辑
                                </button>
                                <div className="border-t my-1" />
                                {project.status !== "active" && (
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(project.id, "active")
                                    }
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                  >
                                    <Play className="w-4 h-4" />
                                    设为进行中
                                  </button>
                                )}
                                {project.status !== "paused" && (
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(project.id, "paused")
                                    }
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                  >
                                    <PauseCircle className="w-4 h-4" />
                                    暂停
                                  </button>
                                )}
                                {project.status !== "completed" && (
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(project.id, "completed")
                                    }
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    标记完成
                                  </button>
                                )}
                                {canDeleteProject(project) && (
                                  <>
                                    <div className="border-t my-1" />
                                    <button
                                      onClick={() => handleDelete(project.id)}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      删除
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color}`}
                        >
                          {config.icon}
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {project.litematics.length} 个投影
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <McAvatar
                            username={project.owner}
                            size={32}
                            className="w-6 h-6 rounded block-icon"
                          />
                          <span className="text-sm">{formatUser(project.owner, project.ownerNickname)}</span>
                        </div>
                        {participants.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">+</span>
                            <AvatarStack usernames={participants} max={4} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">认领进度</span>
                            <span className="tabular-nums">{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        {stats.claimedBoxes > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">收集完成</span>
                              <span className="tabular-nums">{collectProgress}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${collectProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                        <Calendar className="w-3 h-3" />
                        <span>创建于 {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative bg-background border rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">新建项目</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    项目名称 *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例如：生存服刷怪塔"
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    项目描述
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="简单描述这个项目..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? "创建中..." : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditingProject(null)}
          />
          <div className="relative bg-background border rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">编辑项目</h2>
            <form onSubmit={handleUpdateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    项目名称 *
                  </label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    项目描述
                  </label>
                  <textarea
                    value={editingProject.description}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editingProject.name.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
