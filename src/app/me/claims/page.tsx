"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@/lib/user-context";
import { TopBar } from "@/components/TopBar";
import { BlockIcon } from "@/components/BlockIcon";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { BlockIconRaw } from "@/components/BlockIcon";

interface ClaimDetail {
  claimId: string;
  blockId: string;
  displayName: string;
  boxes: number;
  createdAt: number;
  collectedAt: number | null;
  projectId: string;
  projectName: string;
  litematicId: string;
  litematicFilename: string;
}

interface LitematicGroup {
  litematicId: string;
  litematicFilename: string;
  pendingClaims: ClaimDetail[];
  collectedClaims: ClaimDetail[];
}

interface ProjectGroup {
  projectId: string;
  projectName: string;
  litematics: LitematicGroup[];
  pendingCount: number;
  collectedCount: number;
  totalCount: number;
  totalBoxes: number;
}

function groupClaims(claims: ClaimDetail[]): ProjectGroup[] {
  const projectMap = new Map<string, ProjectGroup>();

  for (const c of claims) {
    if (!projectMap.has(c.projectId)) {
      projectMap.set(c.projectId, {
        projectId: c.projectId,
        projectName: c.projectName,
        litematics: [],
        pendingCount: 0,
        collectedCount: 0,
        totalCount: 0,
        totalBoxes: 0,
      });
    }
    const proj = projectMap.get(c.projectId)!;
    proj.totalCount++;
    proj.totalBoxes += c.boxes;
    let lm = proj.litematics.find((l) => l.litematicId === c.litematicId);
    if (!lm) {
      lm = {
        litematicId: c.litematicId,
        litematicFilename: c.litematicFilename,
        pendingClaims: [],
        collectedClaims: [],
      };
      proj.litematics.push(lm);
    }
    if (c.collectedAt == null) {
      lm.pendingClaims.push(c);
      proj.pendingCount++;
    } else {
      lm.collectedClaims.push(c);
      proj.collectedCount++;
    }
  }

  return Array.from(projectMap.values()).sort(
    (a, b) => b.pendingCount - a.pendingCount || a.projectName.localeCompare(b.projectName)
  );
}

export default function ClaimsPage() {
  const { user } = useUser();

  const [claims, setClaims] = useState<ClaimDetail[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "collected">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [collapsedLitematics, setCollapsedLitematics] = useState<Set<string>>(new Set());

  const loadClaims = useCallback(() => {
    setClaimsLoading(true);
    fetch("/api/user/claims")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setClaims(data); })
      .catch(() => {})
      .finally(() => setClaimsLoading(false));
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const toggleCollected = async (claimId: string, currentCollected: boolean) => {
    setToggling(claimId);
    try {
      const res = await fetch(`/api/user/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collected: !currentCollected }),
      });
      if (res.ok) {
        setClaims((prev) =>
          prev.map((c) =>
            c.claimId === claimId
              ? { ...c, collectedAt: currentCollected ? null : Date.now() }
              : c
          )
        );
      }
    } finally {
      setToggling(null);
    }
  };

  const toggleLitematic = (litematicId: string) => {
    setCollapsedLitematics((prev) => {
      const next = new Set(prev);
      if (next.has(litematicId)) next.delete(litematicId);
      else next.add(litematicId);
      return next;
    });
  };

  const filteredClaims = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return claims.filter((claim) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && claim.collectedAt == null) ||
        (statusFilter === "collected" && claim.collectedAt != null);

      if (!matchesStatus) return false;
      if (!query) return true;

      return [
        claim.projectName,
        claim.litematicFilename,
        claim.displayName,
        claim.blockId,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [claims, searchTerm, statusFilter]);

  const groups = useMemo(() => groupClaims(filteredClaims), [filteredClaims]);
  const selectedProject = groups.find((project) => project.projectId === selectedProjectId) ?? groups[0] ?? null;
  const totalPending = claims.filter((c) => c.collectedAt == null).length;
  const totalCollected = claims.filter((c) => c.collectedAt != null).length;
  const totalBoxes = claims.reduce((sum, claim) => sum + claim.boxes, 0);

  if (!user) {
    return (
      <div className="min-h-screen">
        <TopBar title="我的认领" />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted-foreground">
          请先登录
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="我的认领" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">

        <div className="flex flex-col gap-4">
          {!claimsLoading && (
            <div className="grid gap-3 grid-cols-3">
              <div className="rounded-xl border bg-card px-4 py-3">
                <div className="text-xs text-muted-foreground">待收集</div>
                <div className="text-xl font-bold text-amber-600">{totalPending}</div>
              </div>
              <div className="rounded-xl border bg-card px-4 py-3">
                <div className="text-xs text-muted-foreground">已完成</div>
                <div className="text-xl font-bold text-green-600">{totalCollected}</div>
              </div>
              <div className="rounded-xl border bg-card px-4 py-3">
                <div className="text-xs text-muted-foreground">总盒数</div>
                <div className="text-xl font-bold flex items-center gap-1">
                  {totalBoxes}
                  <BlockIconRaw blockId="minecraft:shulker_box" size={16} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索项目、投影或材料"
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "pending", "collected"] as const).map((filter) => {
                const labels = { all: "全部", pending: "待收集", collected: "已完成" };
                return (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      statusFilter === filter
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {labels[filter]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {claimsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl">
            暂无认领记录
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl">
            没有匹配的认领记录
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-xl border overflow-hidden bg-card lg:sticky lg:top-20 lg:self-start">
              <div className="px-2.5 py-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">选择项目</span>
                  <span className="text-xs text-muted-foreground">{groups.length} 个</span>
                </div>
              </div>
              <div className="grid gap-1 p-1.5 max-h-[620px] overflow-y-auto">
                {groups.map((proj) => {
                  const isSelected = selectedProject?.projectId === proj.projectId;
                  const completedPercent = proj.totalCount > 0
                    ? Math.round((proj.collectedCount / proj.totalCount) * 100)
                    : 0;
                  return (
                    <button
                      key={proj.projectId}
                      onClick={() => setSelectedProjectId(proj.projectId)}
                      className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-950/30"
                          : "border-transparent hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-medium text-[13px] leading-5 truncate">{proj.projectName}</div>
                            {isSelected && (
                              <span className="text-[10px] leading-4 bg-blue-600 text-white px-1 rounded-full shrink-0">
                                当前
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] leading-4 text-muted-foreground">
                            {proj.litematics.length} 投影 · {proj.totalCount} 条 · {proj.totalBoxes} 盒
                          </div>
                          <div className="mt-1 h-0.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${completedPercent}%` }}
                            />
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-[10px] leading-3 text-muted-foreground">
                            <span>{completedPercent}%</span>
                            <span>{proj.collectedCount}/{proj.totalCount}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedProject && (
              <div className="border rounded-xl overflow-hidden">
                <div className="divide-y">
                  {selectedProject.litematics.map((lm) => {
                    const collapsed = collapsedLitematics.has(lm.litematicId);
                    const allClaims = [...lm.pendingClaims, ...lm.collectedClaims];
                    return (
                      <div key={lm.litematicId}>
                        <button
                          onClick={() => toggleLitematic(lm.litematicId)}
                          className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
                        >
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5 flex-1 min-w-0">
                            {collapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate">{lm.litematicFilename}</span>
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                            {lm.pendingClaims.length > 0 && (
                              <span className="text-amber-600">{lm.pendingClaims.length} 待收集</span>
                            )}
                            {lm.pendingClaims.length > 0 && lm.collectedClaims.length > 0 && " · "}
                            {lm.collectedClaims.length > 0 && (
                              <span className="text-green-600">{lm.collectedClaims.length} 已完成</span>
                            )}
                          </span>
                        </button>

                        {!collapsed && (
                          <div className="px-4 pb-3 grid gap-1.5 md:grid-cols-2">
                            {allClaims.map((claim) => {
                              const isCollected = claim.collectedAt != null;
                              const isToggling = toggling === claim.claimId;
                              return (
                                <div
                                  key={claim.claimId}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                                    isCollected
                                      ? "bg-muted/30 border-border/50 opacity-70"
                                      : "bg-background border-border"
                                  }`}
                                >
                                  <BlockIcon blockId={claim.blockId} size={24} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isCollected ? "line-through text-muted-foreground" : ""}`}>
                                      {claim.displayName}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      {claim.boxes}
                                      <BlockIconRaw blockId="minecraft:shulker_box" size={12} />
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => toggleCollected(claim.claimId, isCollected)}
                                    disabled={isToggling}
                                    title={isCollected ? "标记为待收集" : "标记为已收集"}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors disabled:opacity-50 ${
                                      isCollected
                                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                        : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    {isCollected ? "取消" : "完成"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
