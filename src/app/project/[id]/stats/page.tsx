"use client";

import { useState, useEffect, use } from "react";
import { Project } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockIcon, BlockIconRaw } from "@/components/BlockIcon";
import { TopBar } from "@/components/TopBar";
import { Users, Trophy, Package, TrendingUp, Layers, Clock, FileBox, Box } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#0088FE",
  "#a4de6c",
  "#d0ed57",
];

interface UserStats {
  username: string;
  totalBoxes: number;
  claimCount: number;
  materials: { blockId: string; displayName: string; boxes: number }[];
}

export default function StatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) throw new Error("项目不存在");
        const data = await res.json();
        setProject(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

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

  const allMaterials = project.litematics.flatMap((l) =>
    l.materials.map((m) => ({ ...m, litematicId: l.id, litematicName: l.filename }))
  );

  const userStatsMap: Record<string, UserStats> = {};
  project.claims.forEach((claim) => {
    if (!userStatsMap[claim.username]) {
      userStatsMap[claim.username] = {
        username: claim.username,
        totalBoxes: 0,
        claimCount: 0,
        materials: [],
      };
    }
    const stats = userStatsMap[claim.username];
    stats.totalBoxes += claim.boxes;
    stats.claimCount += 1;

    const litematic = project.litematics.find((l) => l.id === claim.litematicId);
    const material = litematic?.materials.find((m) => m.blockId === claim.blockId);
    if (material) {
      const existing = stats.materials.find((m) => m.blockId === claim.blockId);
      if (existing) {
        existing.boxes += claim.boxes;
      } else {
        stats.materials.push({
          blockId: claim.blockId,
          displayName: material.displayName,
          boxes: claim.boxes,
        });
      }
    }
  });

  const userStats = Object.values(userStatsMap).sort(
    (a, b) => b.totalBoxes - a.totalBoxes
  );

  const totalBoxes = project.litematics.reduce(
    (sum, l) => sum + l.materials.reduce((s, m) => s + m.boxes, 0),
    0
  );
  const totalClaimedBoxes = project.claims.reduce((sum, c) => sum + c.boxes, 0);
  const uniqueUsers = new Set(project.claims.map((c) => c.username)).size;
  const totalBlocks = project.litematics.reduce((sum, l) => sum + l.totalBlocks, 0);
  const totalMaterialTypes = new Set(allMaterials.map((m) => m.blockId)).size;
  const claimedMaterialTypes = new Set(project.claims.map((c) => c.blockId)).size;
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
    .sort(([, a], [, b]) => b.claimed - a.claimed)[0];
  const leastClaimedMaterial = Object.entries(materialClaimMap)
    .filter(([, data]) => data.total - data.claimed > 0)
    .sort(([, a], [, b]) => (a.total - a.claimed) - (b.total - b.claimed))
    .reverse()[0];

  const pieData = userStats.map((u) => ({
    name: u.username,
    value: u.totalBoxes,
  }));

  const materialClaimData = Object.entries(materialClaimMap)
    .map(([blockId, data]) => ({
      blockId,
      name: data.displayName.length > 6 ? data.displayName.slice(0, 6) + "..." : data.displayName,
      fullName: data.displayName,
      claimed: data.claimed,
      remaining: data.total - data.claimed,
      total: data.total,
    }))
    .filter((m) => m.claimed > 0)
    .sort((a, b) => b.claimed - a.claimed)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        title={`${project.name} - 统计`}
        backLink={`/project/${id}`}
      />

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
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
              <CardTitle className="text-sm font-medium">已认领</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                {totalClaimedBoxes}
                <BlockIconRaw blockId="minecraft:shulker_box" size={20} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                共 {project.claims.length} 次认领
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">剩余</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                {totalBoxes - totalClaimedBoxes}
                <BlockIconRaw blockId="minecraft:shulker_box" size={20} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                总计 {totalBoxes} 盒
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">完成度</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBoxes > 0
                  ? Math.round((totalClaimedBoxes / totalBoxes) * 100)
                  : 0}
                %
              </div>
              <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${
                      totalBoxes > 0 ? (totalClaimedBoxes / totalBoxes) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">认领次数</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.claims.length}</div>
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">用户贡献占比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          `${value} 盒`,
                          "认领数",
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    暂无认领数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">材料认领进度 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {materialClaimData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={materialClaimData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                    >
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={60}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} 盒`,
                          name === "claimed" ? "已认领" : "剩余",
                        ]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullName || ""
                        }
                      />
                      <Legend
                        formatter={(value) =>
                          value === "claimed" ? "已认领" : "剩余"
                        }
                      />
                      <Bar
                        dataKey="claimed"
                        stackId="a"
                        fill="#82ca9d"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="remaining"
                        stackId="a"
                        fill="#e0e0e0"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    暂无认领数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              贡献排行榜
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userStats.length > 0 ? (
              <div className="space-y-4">
                {userStats.map((stats, index) => (
                  <div
                    key={stats.username}
                    className={`flex items-start gap-4 p-4 rounded-lg ${
                      index === 0
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : index === 1
                        ? "bg-zinc-400/10 border border-zinc-400/30"
                        : index === 2
                        ? "bg-amber-700/10 border border-amber-700/30"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 text-center">
                      {index === 0 ? (
                        <span className="text-2xl">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-2xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-2xl">🥉</span>
                      ) : (
                        <span className="text-lg text-muted-foreground">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                    <img
                      src={`https://mc-heads.net/avatar/${stats.username}/48`}
                      alt={stats.username}
                      className="w-12 h-12 rounded block-icon flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://mc-heads.net/avatar/MHF_Steve/48";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{stats.username}</div>
                      <div className="text-sm text-muted-foreground">
                        认领 {stats.claimCount} 次，共 {stats.totalBoxes} 盒
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {stats.materials.slice(0, 5).map((m) => (
                          <div
                            key={m.blockId}
                            className="flex items-center gap-1 text-xs bg-background px-2 py-1 rounded"
                          >
                            <BlockIcon blockId={m.blockId} size={16} />
                            <span>x{m.boxes}</span>
                          </div>
                        ))}
                        {stats.materials.length > 5 && (
                          <span className="text-xs text-muted-foreground px-2 py-1">
                            +{stats.materials.length - 5} 种
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无认领数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
