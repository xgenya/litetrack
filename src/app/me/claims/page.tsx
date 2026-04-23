"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import { TopBar } from "@/components/TopBar";
import { BlockIcon } from "@/components/BlockIcon";
import { Check, Package, ChevronDown, ChevronRight } from "lucide-react";
import { BlockIconRaw } from "@/components/BlockIcon";
import Link from "next/link";

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
      });
    }
    const proj = projectMap.get(c.projectId)!;
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

  const groups = groupClaims(claims);
  const totalPending = claims.filter((c) => c.collectedAt == null).length;
  const totalCollected = claims.filter((c) => c.collectedAt != null).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="我的认领" />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted-foreground">
          请先登录
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="我的认领" />
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            我的认领
          </h2>
          {!claimsLoading && (
            <span className="text-sm text-muted-foreground">
              待收集 <span className="font-medium text-foreground">{totalPending}</span>
              {totalCollected > 0 && (
                <> · 已收集 <span className="font-medium">{totalCollected}</span></>
              )}
            </span>
          )}
        </div>

        {claimsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl">
            暂无认领记录
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((proj) => (
              <div key={proj.projectId} className="border rounded-xl overflow-hidden">
                <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
                  <Link
                    href={`/project/${proj.projectId}`}
                    className="font-medium text-sm hover:text-primary transition-colors"
                  >
                    {proj.projectName}
                  </Link>
                  {proj.pendingCount > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      待收集 {proj.pendingCount}
                    </span>
                  )}
                </div>

                <div className="divide-y">
                  {proj.litematics.map((lm) => {
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
                              <span className="text-green-600">{lm.collectedClaims.length} 已收集</span>
                            )}
                          </span>
                        </button>

                        {!collapsed && (
                          <div className="px-4 pb-3 space-y-1.5">
                            {allClaims.map((claim) => {
                              const isCollected = claim.collectedAt != null;
                              const isToggling = toggling === claim.claimId;
                              return (
                                <div
                                  key={claim.claimId}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                                    isCollected
                                      ? "bg-muted/30 border-border/50 opacity-60"
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
                                    {isCollected ? "取消" : "收集"}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
