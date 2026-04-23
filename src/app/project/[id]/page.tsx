"use client";

import { useState, useEffect, useCallback, use } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@/lib/user-context";
import { Project, Material, Litematic, ProjectRole } from "@/lib/types";
import { formatUser } from "@/lib/utils";
import { toast } from "sonner";
import { McAvatar } from "@/components/McAvatar";
import { MaterialTable, MaterialWithClaims, LitematicWithMaterials } from "@/components/MaterialTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BlockIcon, BlockIconRaw } from "@/components/BlockIcon";
import { TopBar } from "@/components/TopBar";
import { getBlockCategory, CATEGORY_ORDER } from "@/lib/block-categories";

const MaterialCharts = dynamic(
  () => import("@/components/MaterialCharts").then((m) => m.MaterialCharts),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">加载图表...</div> }
);
import {
  Package,
  Layers,
  Box,
  Search,
  Link as LinkIcon,
  Check,
  Users,
  Upload,
  Trash2,
  FileBox,
  Trophy,
} from "lucide-react";

interface ProjectWithRole extends Project {
  userRole?: ProjectRole | null;
}


export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useUser();
  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        throw new Error("项目不存在");
      }
      const data = await res.json();
      setProject(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.username]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const canEdit = project?.userRole === "owner" || project?.userRole === "admin";

  const handleUpload = async (file: File) => {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    if (!file.name.endsWith(".litematic")) {
      toast.error("请上传 .litematic 格式的文件");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/projects/${id}/litematics`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      fetchProject();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLitematic = async (litematicId: string) => {
    if (!user) return;
    if (!confirm("确定要删除这个投影吗？相关认领记录也会被删除。")) return;

    try {
      const res = await fetch(`/api/projects/${id}/litematics/${litematicId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchProject();
      } else {
        const data = await res.json();
        toast.error(data.error || "删除失败");
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleClaim = async (litematicId: string, blockId: string, boxes: number) => {
    if (!user || !project) return;

    const key = `${litematicId}-${blockId}`;
    setClaiming(key);

    try {
      const res = await fetch(`/api/projects/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId,
          litematicId,
          boxes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const updated = await res.json();
      setProject(updated);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setClaiming(null);
    }
  };

  const handleUnclaim = async (claimId: string) => {
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${id}/claim?claimId=${claimId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const updated = await res.json();
      setProject(updated);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "materials" | "stats">("overview");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [claimFilter, setClaimFilter] = useState<"all" | "claimed" | "unclaimed">("all");

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">{error || "项目不存在"}</div>
      </div>
    );
  }

  const allMaterials: Material[] = project.litematics.flatMap((l) => l.materials);

  const getMaterialsWithClaims = (litematic: Litematic): MaterialWithClaims[] => {
    return litematic.materials.map((m) => {
      const claims = project.claims.filter(
        (c) => c.litematicId === litematic.id && c.blockId === m.blockId
      );
      const claimedBoxes = claims.reduce((sum, c) => sum + c.boxes, 0);
      return {
        ...m,
        litematicId: litematic.id,
        litematicName: litematic.filename,
        claimedBoxes,
        remainingBoxes: m.boxes - claimedBoxes,
        myClaims: user ? claims.filter((c) => c.username === user.username) : [],
        allClaims: claims,
      };
    });
  };

  const filteredLitematics = project.litematics.map((l) => ({
    ...l,
    materials: getMaterialsWithClaims(l)
      .filter(
        (m) =>
          (m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.blockId.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (categoryFilter === "all" || getBlockCategory(m.blockId) === categoryFilter) &&
          (claimFilter === "all" ||
            (claimFilter === "claimed" && m.remainingBoxes === 0) ||
            (claimFilter === "unclaimed" && m.remainingBoxes > 0))
      )
      .sort((a, b) => b.remainingBoxes - a.remainingBoxes),
  }));

  const myTotalClaims = user
    ? project.claims
        .filter((c) => c.username === user.username)
        .reduce((sum, c) => sum + c.boxes, 0)
    : 0;

  const totalClaimedBoxes = project.claims.reduce((sum, c) => sum + c.boxes, 0);
  const totalBoxes = project.litematics.reduce(
    (sum, l) => sum + l.materials.reduce((s, m) => s + m.boxes, 0),
    0
  );
  const claimProgress = totalBoxes > 0 ? (totalClaimedBoxes / totalBoxes) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        title={project.name}
        backLink="/"
        backText="项目"
      />

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="复制分享链接"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">已复制</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    <span>分享</span>
                  </>
                )}
              </button>
            </div>
            {canEdit && (
              <label className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? "上传中..." : "添加投影"}</span>
                <input
                  type="file"
                  accept=".litematic"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = "";
                  }}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            概况
          </button>
          <button
            onClick={() => setActiveTab("materials")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "materials"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            材料列表
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "stats"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            统计
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">发起人</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <McAvatar
                      username={project.owner}
                      size={24}
                      className="w-6 h-6 rounded block-icon"
                    />
                    <span className="text-lg font-bold truncate">{project.owner}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(project.createdAt).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">投影数量</CardTitle>
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{project.litematics.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">总方块数</CardTitle>
                  <Box className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {project.litematics
                      .reduce((sum, l) => sum + l.totalBlocks, 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">认领进度</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalClaimedBoxes}/{totalBoxes}
                  </div>
                  <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${claimProgress}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              {user && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">我的认领</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold flex items-center gap-1">
                      {myTotalClaims}
                      <BlockIconRaw blockId="minecraft:shulker_box" size={20} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {project.litematics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>投影列表</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.litematics.map((litematic) => {
                      const litematicClaims = project.claims.filter(
                        (c) => c.litematicId === litematic.id
                      );
                      const litematicClaimedBoxes = litematicClaims.reduce(
                        (sum, c) => sum + c.boxes,
                        0
                      );
                      const litematicTotalBoxes = litematic.materials.reduce(
                        (sum, m) => sum + m.boxes,
                        0
                      );
                      const progress =
                        litematicTotalBoxes > 0
                          ? Math.round(
                              (litematicClaimedBoxes / litematicTotalBoxes) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={litematic.id}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <FileBox className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{litematic.filename}</div>
                            <div className="text-xs text-muted-foreground">
                              {litematic.totalTypes} 种材料 · {litematic.totalBlocks.toLocaleString()} 方块
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-sm font-medium tabular-nums">
                                {litematicClaimedBoxes}/{litematicTotalBoxes} 盒
                              </span>
                              <span className="text-xs text-muted-foreground">{progress}% 完成</span>
                            </div>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteLitematic(litematic.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {user && myTotalClaims > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>我的认领</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.litematics.map((litematic) => {
                      const myClaims = project.claims.filter(
                        (c) =>
                          c.litematicId === litematic.id &&
                          c.username === user.username
                      );
                      if (myClaims.length === 0) return null;

                      return (
                        <div key={litematic.id}>
                          <div className="text-sm text-muted-foreground mb-2">
                            {litematic.filename}
                          </div>
                          {myClaims.map((claim) => {
                            const material = litematic.materials.find(
                              (m) => m.blockId === claim.blockId
                            );
                            return (
                              <div
                                key={claim.id}
                                className="flex items-center justify-between py-2 border-b last:border-0"
                              >
                                <div className="flex items-center gap-3">
                                  <BlockIcon blockId={claim.blockId} size={24} />
                                  <div>
                                    <span className="font-medium">
                                      {material?.displayName || claim.blockId}
                                    </span>
                                    <span className="text-muted-foreground ml-2">
                                      x {claim.boxes} 盒
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleUnclaim(claim.id)}
                                  className="text-sm text-destructive hover:underline"
                                >
                                  取消认领
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {(() => {
              const userStatsMap: Record<string, { username: string; nickname: string; totalBoxes: number }> = {};
              project.claims.forEach((claim) => {
                if (!userStatsMap[claim.username]) {
                  userStatsMap[claim.username] = { username: claim.username, nickname: claim.nickname, totalBoxes: 0 };
                }
                userStatsMap[claim.username].totalBoxes += claim.boxes;
              });
              const leaderboard = Object.values(userStatsMap)
                .sort((a, b) => b.totalBoxes - a.totalBoxes)
                .slice(0, 5);

              if (leaderboard.length === 0) return null;

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      认领排行榜
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaderboard.map((stats, index) => (
                        <div
                          key={stats.username}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            index === 0
                              ? "bg-yellow-500/10"
                              : index === 1
                              ? "bg-zinc-400/10"
                              : index === 2
                              ? "bg-amber-700/10"
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="w-6 text-center flex-shrink-0">
                            {index === 0 ? (
                              <span className="text-lg">🥇</span>
                            ) : index === 1 ? (
                              <span className="text-lg">🥈</span>
                            ) : index === 2 ? (
                              <span className="text-lg">🥉</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">#{index + 1}</span>
                            )}
                          </div>
                          <McAvatar
                            username={stats.username}
                            size={32}
                            className="w-8 h-8 rounded block-icon flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{formatUser(stats.username, stats.nickname)}</div>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-medium">
                            {stats.totalBoxes}
                            <BlockIconRaw blockId="minecraft:shulker_box" size={16} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}

        {activeTab === "materials" && (
          <>
            {project.litematics.length > 0 ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <CardTitle>材料清单</CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex gap-1">
                          {(["all", "unclaimed", "claimed"] as const).map((s) => {
                            const labels = { all: "全部", claimed: "已认领", unclaimed: "未认领" };
                            return (
                              <button
                                key={s}
                                onClick={() => setClaimFilter(s)}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                                  claimFilter === s
                                    ? s === "claimed"
                                      ? "bg-green-500 text-white border-green-500"
                                      : s === "unclaimed"
                                      ? "bg-orange-500 text-white border-orange-500"
                                      : "bg-primary text-primary-foreground border-primary"
                                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                                }`}
                              >
                                {labels[s]}
                              </button>
                            );
                          })}
                        </div>
                        <div className="relative w-full sm:w-56">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="搜索材料..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["all", ...CATEGORY_ORDER] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                            categoryFilter === cat
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                          }`}
                        >
                          {cat === "all" ? "全部" : cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredLitematics.length > 1 ? (
                    <Tabs defaultValue={filteredLitematics[0]?.id}>
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="w-full justify-start overflow-x-auto">
                          {filteredLitematics.map((litematic) => (
                            <TabsTrigger key={litematic.id} value={litematic.id} className="gap-1.5 shrink-0">
                              <FileBox className="w-3.5 h-3.5" />
                              <span>{litematic.filename}</span>
                              <span className="text-xs text-muted-foreground">({litematic.totalTypes})</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                      {filteredLitematics.map((litematic) => (
                        <TabsContent key={litematic.id} value={litematic.id}>
                          <MaterialTable
                            litematic={litematic}
                            user={user}
                            claiming={claiming}
                            onClaim={handleClaim}
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    filteredLitematics.map((litematic) => (
                      <div key={litematic.id}>
                        <MaterialTable
                          litematic={litematic}
                          user={user}
                          claiming={claiming}
                          onClaim={handleClaim}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileBox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">还没有上传投影文件</p>
                  {canEdit && (
                    <p className="text-sm text-muted-foreground mt-2">
                      在概况页面上传 .litematic 文件
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "stats" && (
          <>
            {allMaterials.length > 0 ? (
              <>
                {(() => {
                  const totalBlocks = project.litematics.reduce((sum, l) => sum + l.totalBlocks, 0);
                  const totalMaterialTypes = new Set(allMaterials.map((m) => m.blockId)).size;
                  const claimedMaterialTypes = new Set(project.claims.map((c) => c.blockId)).size;
                  const uniqueUsers = new Set(project.claims.map((c) => c.username)).size;
                  const avgBoxesPerUser = uniqueUsers > 0 ? Math.round(totalClaimedBoxes / uniqueUsers) : 0;

                  const materialClaimMap: Record<string, { claimed: number; total: number; displayName: string }> = {};
                  allMaterials.forEach((m) => {
                    if (!materialClaimMap[m.blockId]) {
                      materialClaimMap[m.blockId] = { claimed: 0, total: 0, displayName: m.displayName };
                    }
                    materialClaimMap[m.blockId].total += m.boxes;
                  });
                  project.claims.forEach((c) => {
                    if (materialClaimMap[c.blockId]) {
                      materialClaimMap[c.blockId].claimed += c.boxes;
                    }
                  });

                  const mostClaimedMaterial = Object.entries(materialClaimMap)
                    .filter(([, data]) => data.claimed > 0)
                    .sort(([, a], [, b]) => b.claimed - a.claimed)[0];
                  const leastClaimedMaterial = Object.entries(materialClaimMap)
                    .filter(([, data]) => data.total - data.claimed > 0)
                    .sort(([, a], [, b]) => (b.total - b.claimed) - (a.total - a.claimed))[0];

                  return (
                    <>
                      <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">参与人数</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{uniqueUsers}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              人均 {avgBoxesPerUser} 盒
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">总方块数</CardTitle>
                            <Box className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{totalBlocks.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">材料种类</CardTitle>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{totalMaterialTypes}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              已认领 {claimedMaterialTypes} 种
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">完成度</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {totalBoxes > 0 ? Math.round(claimProgress) : 0}%
                            </div>
                            <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${claimProgress}%` }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {(mostClaimedMaterial || leastClaimedMaterial) && (
                        <div className="grid gap-4 md:grid-cols-2">
                          {mostClaimedMaterial && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">最热门材料</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-3">
                                  <BlockIcon blockId={mostClaimedMaterial[0]} size={40} />
                                  <div>
                                    <div className="font-medium">{mostClaimedMaterial[1].displayName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      已认领 {mostClaimedMaterial[1].claimed}/{mostClaimedMaterial[1].total} 盒
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {leastClaimedMaterial && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">最需帮助</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-3">
                                  <BlockIcon blockId={leastClaimedMaterial[0]} size={40} />
                                  <div>
                                    <div className="font-medium">{leastClaimedMaterial[1].displayName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      剩余 {leastClaimedMaterial[1].total - leastClaimedMaterial[1].claimed}/{leastClaimedMaterial[1].total} 盒
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                <MaterialCharts materials={allMaterials} />

                {(() => {
                  const userStatsMap: Record<string, { username: string; nickname: string; totalBoxes: number; claimCount: number }> = {};
                  project.claims.forEach((claim) => {
                    if (!userStatsMap[claim.username]) {
                      userStatsMap[claim.username] = { username: claim.username, nickname: claim.nickname, totalBoxes: 0, claimCount: 0 };
                    }
                    userStatsMap[claim.username].totalBoxes += claim.boxes;
                    userStatsMap[claim.username].claimCount += 1;
                  });
                  const userStats = Object.values(userStatsMap).sort((a, b) => b.totalBoxes - a.totalBoxes);

                  if (userStats.length === 0) return null;

                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          贡献排行榜
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {userStats.map((stats, index) => (
                            <div
                              key={stats.username}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                index === 0
                                  ? "bg-yellow-500/10 border border-yellow-500/30"
                                  : index === 1
                                  ? "bg-zinc-400/10 border border-zinc-400/30"
                                  : index === 2
                                  ? "bg-amber-700/10 border border-amber-700/30"
                                  : "bg-muted/30"
                              }`}
                            >
                              <div className="w-6 text-center flex-shrink-0">
                                {index === 0 ? (
                                  <span className="text-lg">🥇</span>
                                ) : index === 1 ? (
                                  <span className="text-lg">🥈</span>
                                ) : index === 2 ? (
                                  <span className="text-lg">🥉</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">#{index + 1}</span>
                                )}
                              </div>
                              <McAvatar
                                username={stats.username}
                                size={32}
                                className="w-8 h-8 rounded block-icon flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{formatUser(stats.username, stats.nickname)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {stats.claimCount} 次认领
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-medium">
                                {stats.totalBoxes}
                                <BlockIconRaw blockId="minecraft:shulker_box" size={16} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">还没有数据可供统计</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
