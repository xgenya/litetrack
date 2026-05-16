"use client";

import { useState, useEffect, useCallback, use, useMemo } from "react";
import { useUser } from "@/lib/user-context";
import { Project, Material, ProjectRole } from "@/lib/types";
import { formatUser, sameUsername } from "@/lib/utils";
import { toast } from "sonner";
import { McAvatar } from "@/components/McAvatar";
import { MaterialTable } from "@/components/MaterialTable";
import { AnimatedNumber } from "@/components/AnimatedNumber";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BlockIcon, BlockIconRaw } from "@/components/BlockIcon";
import { TopBar } from "@/components/TopBar";
import { getBlockCategory, CATEGORY_ORDER } from "@/lib/block-categories";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Layers,
  Search,
  Link as LinkIcon,
  Check,
  Pencil,
  Users,
  Upload,
  Trash2,
  FileBox,
  TrendingUp,
} from "lucide-react";

const COLORS = [
  "#8884d8","#82ca9d","#ffc658","#ff7300","#00C49F",
  "#FFBB28","#FF8042","#0088FE","#a4de6c","#d0ed57",
];

function getProgressTone(progress: number) {
  if (progress >= 100) {
    return {
      label: "已完成",
      badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      bar: "bg-green-500",
      glow: "shadow-green-500/25",
    };
  }
  if (progress >= 75) {
    return {
      label: "冲刺中",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      bar: "bg-blue-500",
      glow: "shadow-blue-500/25",
    };
  }
  if (progress >= 40) {
    return {
      label: "推进中",
      badge: "bg-primary/10 text-primary",
      bar: "bg-primary",
      glow: "shadow-primary/25",
    };
  }
  if (progress > 0) {
    return {
      label: "起步中",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      bar: "bg-amber-500",
      glow: "shadow-amber-500/25",
    };
  }
  return {
    label: "待开始",
    badge: "bg-muted text-muted-foreground",
    bar: "bg-muted-foreground",
    glow: "shadow-muted-foreground/20",
  };
}

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
  const [togglingClaim, setTogglingClaim] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);

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

  const canEdit = user?.isAdmin || project?.userRole === "owner" || project?.userRole === "admin";

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

  const handleToggleCollected = async (claimId: string, currentCollected: boolean) => {
    if (!project) return;

    setTogglingClaim(claimId);
    try {
      const res = await fetch(`/api/user/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collected: !currentCollected }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const nextCollectedAt = currentCollected ? null : Date.now();
      setProject({
        ...project,
        claims: project.claims.map((claim) =>
          claim.id === claimId ? { ...claim, collectedAt: nextCollectedAt } : claim
        ),
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTogglingClaim(null);
    }
  };

  const startEditingAbout = () => {
    if (!project) return;
    setAboutDraft(project.about);
    setEditingAbout(true);
  };

  const handleSaveAbout = async () => {
    if (!project) return;

    setSavingAbout(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about: aboutDraft.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }

      const updated = await res.json();
      setProject({ ...project, ...updated, userRole: project.userRole });
      setEditingAbout(false);
      toast.success("关于信息已保存");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingAbout(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "about" | "materials" | "members" | "stats">("overview");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [claimFilter, setClaimFilter] = useState<"all" | "claimed" | "unclaimed">("all");
  const [activeMaterialLitematicId, setActiveMaterialLitematicId] = useState<string | null>(null);

  const filteredLitematics = useMemo(() => {
    if (!project) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const claimsByMaterial = new Map<string, typeof project.claims>();
    for (const claim of project.claims) {
      const key = `${claim.litematicId}\u0000${claim.blockId}`;
      const claims = claimsByMaterial.get(key) ?? [];
      claims.push(claim);
      claimsByMaterial.set(key, claims);
    }

    return project.litematics.map((litematic) => ({
      ...litematic,
      materials: litematic.materials
        .map((material) => {
          const claims =
            claimsByMaterial.get(`${litematic.id}\u0000${material.blockId}`) ?? [];
          const claimedBoxes = claims.reduce((sum, claim) => sum + claim.boxes, 0);
          return {
            ...material,
            litematicId: litematic.id,
            litematicName: litematic.filename,
            claimedBoxes,
            remainingBoxes: material.boxes - claimedBoxes,
            myClaims: user
              ? claims.filter((claim) => sameUsername(claim.username, user.username))
              : [],
            allClaims: claims,
          };
        })
        .filter((material) => {
          const matchesSearch =
            normalizedSearch === "" ||
            material.displayName.toLowerCase().includes(normalizedSearch) ||
            material.blockId.toLowerCase().includes(normalizedSearch);

          return (
            matchesSearch &&
            (categoryFilter === "all" || getBlockCategory(material.blockId) === categoryFilter) &&
            (claimFilter === "all" ||
              (claimFilter === "claimed" && material.remainingBoxes === 0) ||
              (claimFilter === "unclaimed" && material.remainingBoxes > 0))
          );
        })
        .sort((a, b) => b.remainingBoxes - a.remainingBoxes),
    }));
  }, [categoryFilter, claimFilter, project, searchTerm, user]);

  const activeMaterialLitematic =
    filteredLitematics.find((litematic) => litematic.id === activeMaterialLitematicId) ??
    filteredLitematics[0] ??
    null;

  useEffect(() => {
    if (filteredLitematics.length === 0) {
      if (activeMaterialLitematicId !== null) setActiveMaterialLitematicId(null);
      return;
    }

    if (!filteredLitematics.some((litematic) => litematic.id === activeMaterialLitematicId)) {
      setActiveMaterialLitematicId(filteredLitematics[0].id);
    }
  }, [activeMaterialLitematicId, filteredLitematics]);

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

  const totalClaimedBoxes = project.claims.reduce((sum, c) => sum + c.boxes, 0);
  const myClaims = user
    ? project.claims.filter((c) => sameUsername(c.username, user.username))
    : [];
  const myTotalClaims = myClaims.reduce((sum, c) => sum + c.boxes, 0);
  const myCollectedBoxes = myClaims
    .filter((c) => c.collectedAt != null)
    .reduce((sum, c) => sum + c.boxes, 0);
  const myPendingBoxes = Math.max(myTotalClaims - myCollectedBoxes, 0);
  const myCollectProgress = myTotalClaims > 0 ? Math.round((myCollectedBoxes / myTotalClaims) * 100) : 0;
  const myProjectShare = totalClaimedBoxes > 0 ? Math.round((myTotalClaims / totalClaimedBoxes) * 100) : 0;
  const totalBoxes = project.litematics.reduce(
    (sum, l) => sum + l.materials.reduce((s, m) => s + m.boxes, 0),
    0
  );
  const claimProgress = totalBoxes > 0 ? (totalClaimedBoxes / totalBoxes) * 100 : 0;
  const boundedClaimProgress = Math.min(Math.max(claimProgress, 0), 100);
  const totalBlocks = project.litematics.reduce((sum, l) => sum + l.totalBlocks, 0);
  const totalMaterialTypes = new Set(allMaterials.map((m) => m.blockId)).size;
  const claimedMaterialTypes = new Set(project.claims.map((c) => c.blockId)).size;
  const totalCollectedBoxes = project.claims
    .filter((claim) => claim.collectedAt != null)
    .reduce((sum, claim) => sum + claim.boxes, 0);
  const collectionProgress = totalClaimedBoxes > 0 ? (totalCollectedBoxes / totalClaimedBoxes) * 100 : 0;
  const boundedCollectedShare = totalBoxes > 0
    ? Math.min(Math.max((totalCollectedBoxes / totalBoxes) * 100, 0), 100)
    : 0;
  const remainingBoxes = Math.max(totalBoxes - totalClaimedBoxes, 0);
  const progressTone = getProgressTone(boundedClaimProgress);
  const materialClaimMap: Record<string, { claimed: number; total: number; displayName: string }> = {};
  allMaterials.forEach((material) => {
    if (!materialClaimMap[material.blockId]) {
      materialClaimMap[material.blockId] = {
        claimed: 0,
        total: 0,
        displayName: material.displayName,
      };
    }
    materialClaimMap[material.blockId].total += material.boxes;
  });
  project.claims.forEach((claim) => {
    if (materialClaimMap[claim.blockId]) {
      materialClaimMap[claim.blockId].claimed += claim.boxes;
    }
  });
  const mostClaimedMaterial = Object.entries(materialClaimMap)
    .filter(([, data]) => data.claimed > 0)
    .sort(([, a], [, b]) => b.claimed - a.claimed)[0];
  const leastClaimedMaterial = Object.entries(materialClaimMap)
    .filter(([, data]) => data.total - data.claimed > 0)
    .sort(([, a], [, b]) => (b.total - b.claimed) - (a.total - a.claimed))[0];
  const materialClaimData = Object.entries(materialClaimMap)
    .map(([blockId, data]) => ({
      blockId,
      name: data.displayName.length > 6 ? data.displayName.slice(0, 6) + "…" : data.displayName,
      fullName: data.displayName,
      claimed: data.claimed,
      remaining: data.total - data.claimed,
      total: data.total,
    }))
    .filter((material) => material.claimed > 0)
    .sort((a, b) => b.claimed - a.claimed)
    .slice(0, 10);
  const litematicSummaries = project.litematics.map((litematic) => {
    const litematicClaims = project.claims.filter((claim) => claim.litematicId === litematic.id);
    const claimedBoxes = litematicClaims.reduce((sum, claim) => sum + claim.boxes, 0);
    const collectedBoxes = litematicClaims
      .filter((claim) => claim.collectedAt != null)
      .reduce((sum, claim) => sum + claim.boxes, 0);
    const totalLitematicBoxes = litematic.materials.reduce((sum, material) => sum + material.boxes, 0);
    return {
      ...litematic,
      claimedBoxes,
      collectedBoxes,
      totalBoxes: totalLitematicBoxes,
      progress: totalLitematicBoxes > 0 ? Math.min(Math.round((claimedBoxes / totalLitematicBoxes) * 100), 100) : 0,
      collectionProgress: claimedBoxes > 0 ? Math.min(Math.round((collectedBoxes / claimedBoxes) * 100), 100) : 0,
    };
  });
  const memberStats = project.members
    .map((member) => {
      const memberClaims = project.claims.filter((claim) => sameUsername(claim.username, member.username));
      const claimedBoxes = memberClaims.reduce((sum, claim) => sum + claim.boxes, 0);
      const collectedBoxes = memberClaims
        .filter((claim) => claim.collectedAt != null)
        .reduce((sum, claim) => sum + claim.boxes, 0);
      return {
        ...member,
        claimCount: memberClaims.length,
        claimedBoxes,
        collectedBoxes,
        contributionPercent: totalClaimedBoxes > 0 ? Math.round((claimedBoxes / totalClaimedBoxes) * 100) : 0,
        collectedPercent: claimedBoxes > 0 ? Math.round((collectedBoxes / claimedBoxes) * 100) : 0,
      };
    })
    .sort((a, b) => {
      const roleOrder: Record<ProjectRole, number> = { owner: 0, admin: 1, member: 2 };
      return (
        b.claimedBoxes - a.claimedBoxes ||
        b.collectedBoxes - a.collectedBoxes ||
        roleOrder[a.role] - roleOrder[b.role] ||
        a.joinedAt - b.joinedAt
      );
    });
  const activeMemberCount = memberStats.filter((member) => member.claimedBoxes > 0).length;
  const topContributor = memberStats.find((member) => member.claimedBoxes > 0);
  const pieData = (() => {
    const contributors = memberStats.filter((member) => member.claimedBoxes > 0);
    const top = contributors.slice(0, 8);
    const rest = contributors.slice(8);
    const restTotal = rest.reduce((sum, member) => sum + member.claimedBoxes, 0);
    const data = top.map((member) => ({
      name: formatUser(member.username, member.nickname),
      value: member.claimedBoxes,
    }));
    if (restTotal > 0) data.push({ name: "其他", value: restTotal });
    return data;
  })();

  return (
    <div className="min-h-screen">
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

        <div className="flex overflow-x-auto border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            概况
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "about"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            关于
          </button>
          <button
            onClick={() => setActiveTab("materials")}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "materials"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            材料列表
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "members"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            参与人员
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "stats"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            统计
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <section className="lt-hero p-6 sm:p-8 md:p-10">
              <div className="lt-wave" aria-hidden="true">
                <div className="lt-wave-layer lt-wave-claim" style={{ height: `${boundedClaimProgress}%` }}>
                  <svg className="lt-wave-svg lt-wave-svg-back" viewBox="0 0 1200 60" preserveAspectRatio="none">
                    <path d="M0,30 C75,22 225,38 300,30 C375,22 525,38 600,30 C675,22 825,38 900,30 C975,22 1125,38 1200,30 L1200,60 L0,60 Z" />
                  </svg>
                  <svg className="lt-wave-svg lt-wave-svg-front" viewBox="0 0 1200 60" preserveAspectRatio="none">
                    <path d="M0,30 C75,38 225,22 300,30 C375,38 525,22 600,30 C675,38 825,22 900,30 C975,38 1125,22 1200,30 L1200,60 L0,60 Z" />
                  </svg>
                </div>
                {boundedCollectedShare > 0 && (
                  <div className="lt-wave-layer lt-wave-collect" style={{ height: `${boundedCollectedShare}%` }}>
                    <svg className="lt-wave-svg lt-wave-svg-back" viewBox="0 0 1200 60" preserveAspectRatio="none">
                      <path d="M0,30 C75,22 225,38 300,30 C375,22 525,38 600,30 C675,22 825,38 900,30 C975,22 1125,38 1200,30 L1200,60 L0,60 Z" />
                    </svg>
                    <svg className="lt-wave-svg lt-wave-svg-front" viewBox="0 0 1200 60" preserveAspectRatio="none">
                      <path d="M0,30 C75,38 225,22 300,30 C375,38 525,22 600,30 C675,38 825,22 900,30 C975,38 1125,22 1200,30 L1200,60 L0,60 Z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
                  <span className={`h-1.5 w-1.5 rounded-full ${progressTone.bar}`} />
                  {progressTone.label}
                </span>

                <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background/65 px-3 py-2 backdrop-blur">
                  <McAvatar username={project.owner} size={36} className="block-icon h-9 w-9 rounded" />
                  <div className="min-w-0 leading-tight">
                    <div className="text-[11px] text-muted-foreground">发起人</div>
                    <div className="truncate text-sm font-medium">
                      {formatUser(project.owner, project.ownerNickname)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString("zh-CN")} 创建
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-baseline gap-3">
                  <AnimatedNumber
                    value={totalBoxes > 0 ? boundedClaimProgress : 0}
                    duration={1400}
                    className="font-mono text-[96px] font-light leading-none tracking-tight text-foreground sm:text-[128px]"
                  />
                  <span className="text-4xl font-light text-foreground/40">%</span>
                </div>
                <div className="mt-2 text-base font-medium text-foreground">整体认领进度</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  共 <AnimatedNumber value={totalBoxes} className="font-mono text-foreground tabular-nums" /> 盒
                  <span className="mx-2 text-foreground/25">·</span>
                  覆盖 <AnimatedNumber value={totalMaterialTypes} className="font-mono text-foreground tabular-nums" /> 种材料
                </div>
              </div>

              <div className="mt-8 space-y-2.5">
                <div className="lt-hairline relative h-px w-full">
                  <div
                    className="absolute inset-y-[-2px] left-0 h-[5px] rounded-full bg-foreground shadow-[0_0_14px_color-mix(in_oklch,var(--foreground)_30%,transparent)] transition-[width] duration-1000"
                    style={{ width: `${boundedClaimProgress}%` }}
                  />
                  {boundedCollectedShare > 0 && (
                    <div
                      className="absolute inset-y-[-2px] left-0 h-[5px] rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)] transition-[width] duration-1000"
                      style={{ width: `${boundedCollectedShare}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-[3px] w-4 rounded-full bg-foreground" />
                    <span className="text-foreground/80">认领</span>
                    <AnimatedNumber value={boundedClaimProgress} format={(v) => `${v}%`} className="font-mono tabular-nums text-foreground" />
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-[3px] w-4 rounded-full bg-emerald-500" />
                    <span className="text-foreground/80">收集</span>
                    <AnimatedNumber value={boundedCollectedShare} format={(v) => `${v}%`} className="font-mono tabular-nums text-foreground" />
                  </span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-4 border-t border-foreground/10 pt-5 sm:gap-6">
                <div>
                  <div className="text-xs font-medium text-muted-foreground sm:text-sm">已认领</div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <AnimatedNumber
                      value={totalClaimedBoxes}
                      className="font-mono text-2xl font-light tabular-nums text-foreground sm:text-3xl"
                    />
                    <span className="text-xs text-muted-foreground">盒</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-emerald-700 sm:text-sm dark:text-emerald-400">已收集</div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <AnimatedNumber
                      value={totalCollectedBoxes}
                      className="font-mono text-2xl font-light tabular-nums text-emerald-600 sm:text-3xl dark:text-emerald-400"
                    />
                    <span className="text-xs text-muted-foreground">
                      盒 · <AnimatedNumber value={totalClaimedBoxes > 0 ? collectionProgress : 0} format={(v) => `${v}%`} className="font-mono tabular-nums" />
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground sm:text-sm">待认领</div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <AnimatedNumber
                      value={remainingBoxes}
                      className="font-mono text-2xl font-light tabular-nums text-foreground sm:text-3xl"
                    />
                    <span className="text-xs text-muted-foreground">
                      盒 · <AnimatedNumber value={totalBoxes > 0 ? (remainingBoxes / totalBoxes) * 100 : 0} format={(v) => `${v}%`} className="font-mono tabular-nums" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-foreground/10 pt-5 sm:grid-cols-4 sm:gap-x-6">
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">投影</div>
                  <div className="flex items-baseline gap-1.5">
                    <AnimatedNumber value={project.litematics.length} className="font-mono text-xl font-light tabular-nums text-foreground" />
                    <span className="text-xs text-muted-foreground">个</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">成员</div>
                  <div className="flex items-baseline gap-1.5">
                    <AnimatedNumber value={project.members.length} className="font-mono text-xl font-light tabular-nums text-foreground" />
                    <span className="text-xs text-muted-foreground">
                      人 · <AnimatedNumber value={activeMemberCount} className="font-mono text-foreground" /> 活跃
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">材料覆盖</div>
                  <div className="flex items-baseline gap-1.5">
                    <AnimatedNumber value={claimedMaterialTypes} className="font-mono text-xl font-light tabular-nums text-foreground" />
                    <span className="text-xs text-muted-foreground">
                      / <AnimatedNumber value={totalMaterialTypes} className="font-mono text-foreground" /> 种
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">方块总数</div>
                  <div className="flex items-baseline gap-1.5">
                    <AnimatedNumber value={totalBlocks} className="font-mono text-xl font-light tabular-nums text-foreground" />
                  </div>
                </div>
              </div>
            </section>

            {user && myTotalClaims > 0 && (
              <div className="lt-panel overflow-hidden">
                <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-stretch sm:p-6">
                  <div className="flex items-center gap-4 sm:w-64 sm:shrink-0">
                    <McAvatar username={user.username} size={56} className="block-icon h-14 w-14 rounded-lg" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">我的贡献</div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <AnimatedNumber value={myTotalClaims} className="font-mono text-4xl font-light tabular-nums leading-none" />
                        <span className="text-sm text-muted-foreground">盒</span>
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <AnimatedNumber value={myProjectShare} format={(v) => `${v}%`} className="font-mono tabular-nums text-foreground" />
                        项目占比
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground">认领</div>
                        <div className="mt-1 font-mono text-lg font-light tabular-nums">{myTotalClaims}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">已完成</div>
                        <div className="mt-1 font-mono text-lg font-light tabular-nums text-emerald-600 dark:text-emerald-400">
                          {myCollectedBoxes}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">待完成</div>
                        <div className="mt-1 font-mono text-lg font-light tabular-nums">{myPendingBoxes}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>个人完成进度</span>
                        <span className="font-mono tabular-nums text-foreground">{myCollectProgress}%</span>
                      </div>
                      <div className="lt-bar-track h-1.5">
                        <div className="lt-bar-fill-emerald" style={{ width: `${myCollectProgress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="lt-panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4 sm:px-6">
                <div className="text-base font-semibold sm:text-lg">投影进度</div>
                <div className="text-xs text-muted-foreground">
                  {project.litematics.length} 个投影
                </div>
              </div>

              {project.litematics.length > 0 ? (
                <div className="divide-y divide-foreground/10">
                  {litematicSummaries.map((litematic, idx) => {
                    const collectedShare = litematic.totalBoxes > 0
                      ? Math.min(Math.round((litematic.collectedBoxes / litematic.totalBoxes) * 100), 100)
                      : 0;
                    const isDone = litematic.progress >= 100;
                    return (
                      <div
                        key={litematic.id}
                        className="lt-row grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[36px_minmax(0,1.4fr)_minmax(140px,1fr)_auto_auto] sm:px-6"
                      >
                        <div className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileBox className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{litematic.filename}</span>
                            {isDone && (
                              <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {litematic.totalTypes} 种材料 · {litematic.totalBlocks.toLocaleString()} 方块
                          </div>
                          <div className="mt-3 sm:hidden">
                            <div className="lt-bar-track">
                              <div className="lt-bar-fill" style={{ width: `${litematic.progress}%` }} />
                              {collectedShare > 0 && (
                                <div className="lt-bar-fill-emerald" style={{ width: `${collectedShare}%` }} />
                              )}
                            </div>
                            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                              <span className="font-mono tabular-nums">{litematic.progress}%</span>
                              <span>{litematic.claimedBoxes}/{litematic.totalBoxes} · 收集 {litematic.collectedBoxes}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:block">
                          <div className="lt-bar-track">
                            <div className="lt-bar-fill" style={{ width: `${litematic.progress}%` }} />
                            {collectedShare > 0 && (
                              <div className="lt-bar-fill-emerald" style={{ width: `${collectedShare}%` }} />
                            )}
                          </div>
                          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                            <span>认领 {litematic.progress}%</span>
                            <span>收集 {collectedShare}%</span>
                          </div>
                        </div>

                        <div className="hidden text-right sm:block">
                          <div className="font-mono text-base font-light tabular-nums">
                            {litematic.progress}<span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>

                        {canEdit && (
                          <button
                            onClick={() => handleDeleteLitematic(litematic.id)}
                            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <FileBox className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">还没有上传投影文件</p>
                </div>
              )}
            </section>

            {user && myTotalClaims > 0 && (
              <section className="lt-panel overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4 sm:px-6">
                  <div className="text-base font-semibold sm:text-lg">我的任务</div>
                  <div className="text-xs text-muted-foreground">{myTotalClaims} 项</div>
                </div>
                <div className="divide-y divide-foreground/10">
                  {project.litematics.flatMap((litematic) =>
                    project.claims
                      .filter((claim) => litematic.id === claim.litematicId && sameUsername(claim.username, user.username))
                      .map((claim) => {
                        const material = litematic.materials.find((m) => m.blockId === claim.blockId);
                        const isCollected = claim.collectedAt != null;
                        return (
                          <div key={claim.id} className="lt-row flex items-center gap-3 px-5 py-3 sm:px-6">
                            <BlockIcon blockId={claim.blockId} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className={`truncate font-medium ${isCollected ? "text-muted-foreground line-through" : ""}`}>
                                {material?.displayName || claim.blockId}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {litematic.filename} · <span className="font-mono tabular-nums">{claim.boxes}</span> 盒
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                onClick={() => handleToggleCollected(claim.id, isCollected)}
                                disabled={togglingClaim === claim.id}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                  isCollected
                                    ? "border-foreground/10 text-muted-foreground hover:bg-foreground/5"
                                    : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                                }`}
                              >
                                {isCollected ? "标为未完成" : "标为完成"}
                              </button>
                              {!isCollected && (
                                <button
                                  onClick={() => handleUnclaim(claim.id)}
                                  className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                  取消认领
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "about" && (
          <Card>
            <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
              <CardTitle>关于项目</CardTitle>
              {canEdit && !editingAbout && (
                <button
                  onClick={startEditingAbout}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                  编辑
                </button>
              )}
            </CardHeader>
            <CardContent>
              {editingAbout ? (
                <div className="space-y-3">
                  <textarea
                    value={aboutDraft}
                    onChange={(e) => setAboutDraft(e.target.value)}
                    rows={6}
                    maxLength={5000}
                    placeholder="写下项目介绍、施工说明、坐标、规则或注意事项..."
                    className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                      {aboutDraft.length}/5000
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAbout(false);
                          setAboutDraft("");
                        }}
                        disabled={savingAbout}
                        className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAbout}
                        disabled={savingAbout}
                        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {savingAbout ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : project.about.trim() ? (
                <p className="whitespace-pre-wrap break-words leading-7 text-muted-foreground">
                  {project.about}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {canEdit ? "还没有关于信息，点击编辑补充项目说明。" : "暂无关于信息"}
                </p>
              )}
            </CardContent>
          </Card>
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
                    <Tabs
                      value={activeMaterialLitematic?.id}
                      onValueChange={setActiveMaterialLitematicId}
                    >
                      <TabsList className="w-full justify-start mb-4 h-auto flex-wrap gap-1">
                        {filteredLitematics.map((litematic) => {
                          const name = litematic.filename.replace(/\.litematic$/i, "");
                          const label = name.length > 10 ? name.slice(0, 10) + "…" : name;
                          return (
                            <TabsTrigger key={litematic.id} value={litematic.id} className="gap-1 shrink-0 text-xs" title={litematic.filename}>
                              <FileBox className="w-3 h-3" />
                              {label}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                      {activeMaterialLitematic && (
                        <TabsContent value={activeMaterialLitematic.id}>
                          <MaterialTable
                            key={activeMaterialLitematic.id}
                            litematic={activeMaterialLitematic}
                            user={user}
                            claiming={claiming}
                            onClaim={handleClaim}
                          />
                        </TabsContent>
                      )}
                    </Tabs>
                  ) : (
                    activeMaterialLitematic && (
                      <div key={activeMaterialLitematic.id}>
                        <MaterialTable
                          key={activeMaterialLitematic.id}
                          litematic={activeMaterialLitematic}
                          user={user}
                          claiming={claiming}
                          onClaim={handleClaim}
                        />
                      </div>
                    )
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

        {activeTab === "members" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                参与人员
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberStats.length > 0 ? (
                <div className="overflow-hidden rounded-xl border">
                  <div className="hidden md:grid grid-cols-[48px_minmax(0,1fr)_120px_120px_120px] gap-3 bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
                    <div>排名</div>
                    <div>成员</div>
                    <div className="text-right">认领</div>
                    <div className="text-right">已收集</div>
                    <div className="text-right">占比</div>
                  </div>
                  <div className="divide-y">
                    {memberStats.map((member, index) => {
                      const roleLabel = member.role === "owner" ? "发起人" : member.role === "admin" ? "管理员" : "成员";
                      return (
                        <div
                          key={member.username}
                          className="grid gap-3 px-4 py-3 md:grid-cols-[48px_minmax(0,1fr)_120px_120px_120px] md:items-center"
                        >
                          <div className="hidden md:block text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="md:hidden w-7 shrink-0 text-sm font-medium text-muted-foreground">
                              #{index + 1}
                            </div>
                            <McAvatar
                              username={member.username}
                              size={40}
                              className="w-10 h-10 rounded block-icon shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{formatUser(member.username, member.nickname)}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                加入于 {new Date(member.joinedAt).toLocaleDateString("zh-CN")}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                member.role === "owner"
                                  ? "bg-primary/10 text-primary"
                                  : member.role === "admin"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {roleLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 md:contents">
                            <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-right md:bg-transparent md:p-0">
                              <div className="text-[11px] text-muted-foreground md:hidden">认领</div>
                              <div className="font-semibold tabular-nums flex items-center justify-end gap-1">
                                {member.claimedBoxes}
                                <BlockIconRaw blockId="minecraft:shulker_box" size={14} />
                              </div>
                              <div className="text-[11px] text-muted-foreground">{member.claimCount} 条</div>
                            </div>
                            <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-right md:bg-transparent md:p-0">
                              <div className="text-[11px] text-muted-foreground md:hidden">已收集</div>
                              <div className="font-semibold tabular-nums flex items-center justify-end gap-1">
                                {member.collectedBoxes}
                                <BlockIconRaw blockId="minecraft:shulker_box" size={14} />
                              </div>
                              <div className="text-[11px] text-muted-foreground">{member.collectedPercent}%</div>
                            </div>
                            <div className="rounded-lg bg-muted/40 px-2 py-1.5 md:bg-transparent md:p-0">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-muted-foreground md:hidden">占比</span>
                                <span className="ml-auto font-semibold tabular-nums">{member.contributionPercent}%</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${member.contributionPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  暂无参与人员
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "stats" && (
          <>
            {allMaterials.length > 0 ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">认领完成度</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{Math.round(claimProgress)}%</div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${claimProgress}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {totalClaimedBoxes}/{totalBoxes} 盒已认领
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">收集完成度</CardTitle>
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{Math.round(collectionProgress)}%</div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${collectionProgress}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {totalCollectedBoxes}/{totalClaimedBoxes} 盒已收集
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">核心数据</CardTitle>
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xl font-bold">{activeMemberCount}</div>
                          <div className="text-xs text-muted-foreground">活跃人</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold">{claimedMaterialTypes}</div>
                          <div className="text-xs text-muted-foreground">材料种</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold">{project.claims.length}</div>
                          <div className="text-xs text-muted-foreground">认领条</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">贡献占比</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                              <PieChart>
                                <Pie data={pieData} cx="50%" cy="45%" innerRadius={58} outerRadius={92} paddingAngle={2} dataKey="value">
                                  {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} 盒`, "认领"]} />
                                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">暂无认领数据</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">材料认领 Top 10</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {materialClaimData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                              <BarChart data={materialClaimData} layout="vertical" margin={{ top: 5, right: 24, left: 5, bottom: 5 }}>
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 11 }} />
                                <Tooltip
                                  formatter={(value, name) => [`${value} 盒`, name === "claimed" ? "已认领" : "剩余"]}
                                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                                />
                                <Legend formatter={(value) => value === "claimed" ? "已认领" : "剩余"} />
                                <Bar dataKey="claimed" stackId="a" fill="#82ca9d" />
                                <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">暂无认领数据</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">关键材料</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {mostClaimedMaterial && (
                          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                            <BlockIcon blockId={mostClaimedMaterial[0]} size={32} />
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">最热门</div>
                              <div className="font-medium truncate">{mostClaimedMaterial[1].displayName}</div>
                              <div className="text-xs text-muted-foreground">
                                已认领 {mostClaimedMaterial[1].claimed}/{mostClaimedMaterial[1].total} 盒
                              </div>
                            </div>
                          </div>
                        )}
                        {leastClaimedMaterial && (
                          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                            <BlockIcon blockId={leastClaimedMaterial[0]} size={32} />
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">最需帮助</div>
                              <div className="font-medium truncate">{leastClaimedMaterial[1].displayName}</div>
                              <div className="text-xs text-muted-foreground">
                                剩余 {leastClaimedMaterial[1].total - leastClaimedMaterial[1].claimed} 盒
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">贡献最高</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topContributor ? (
                          <div className="flex items-center gap-3">
                            <McAvatar username={topContributor.username} size={40} className="h-10 w-10 rounded block-icon" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{formatUser(topContributor.username, topContributor.nickname)}</div>
                              <div className="text-xs text-muted-foreground">
                                {topContributor.claimedBoxes} 盒 · {topContributor.contributionPercent}%
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${topContributor.contributionPercent}%` }} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">暂无贡献数据</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">投影完成度</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {litematicSummaries.map((litematic) => (
                        <div key={litematic.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_160px_160px] md:items-center">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{litematic.filename}</div>
                            <div className="text-xs text-muted-foreground">
                              {litematic.totalTypes} 种 · {litematic.totalBlocks.toLocaleString()} 方块
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>认领</span>
                              <span>{litematic.progress}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${litematic.progress}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>收集</span>
                              <span>{litematic.collectionProgress}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-green-500" style={{ width: `${litematic.collectionProgress}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
