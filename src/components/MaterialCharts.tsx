"use client";

import { useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockIconRaw } from "@/components/BlockIcon";

interface Material {
  blockId: string;
  displayName: string;
  count: number;
  boxes: number;
  stacks: number;
}

interface MaterialChartsProps {
  materials: Material[];
}

const DIMENSION_COLORS = {
  "主世界": "#82ca9d",
  "下界": "#ff7300",
  "末地": "#8884d8",
};

function getDimension(blockId: string): string {
  const id = blockId.replace("minecraft:", "");
  
  if (id.includes("nether") || id.includes("quartz") || id.includes("blackstone") ||
      id.includes("basalt") || id.includes("soul") || id.includes("crimson") ||
      id.includes("warped") || id.includes("shroomlight") || id.includes("glowstone") ||
      id.includes("magma") || id.includes("netherrack") || id.includes("ancient_debris") ||
      id.includes("gilded") || id.includes("weeping") || id.includes("twisting")) {
    return "下界";
  }
  if (id.includes("end_") || id.includes("purpur") || id.includes("chorus") ||
      id.includes("shulker") || id.includes("dragon") || id.includes("elytra")) {
    return "末地";
  }
  return "主世界";
}

export function MaterialCharts({ materials }: MaterialChartsProps) {
  const top10Data = useMemo(() => {
    return materials
      .slice(0, 10)
      .map((m) => ({
        name: m.displayName.length > 8 ? m.displayName.slice(0, 8) + "..." : m.displayName,
        fullName: m.displayName,
        value: m.count,
      }));
  }, [materials]);

  const dimensionData = useMemo(() => {
    const dimensionMap: Record<string, number> = {
      "主世界": 0,
      "下界": 0,
      "末地": 0,
    };
    
    materials.forEach((m) => {
      const dimension = getDimension(m.blockId);
      dimensionMap[dimension] += m.count;
    });

    return Object.entries(dimensionMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [materials]);

  const storageStats = useMemo(() => {
    const totalBoxes = materials.reduce((sum, m) => sum + m.boxes, 0);
    const totalStacks = materials.reduce((sum, m) => sum + m.stacks, 0);
    const doubleChests = Math.ceil(totalBoxes / 54);
    
    const top5ByBoxes = materials
      .slice()
      .sort((a, b) => b.boxes - a.boxes)
      .slice(0, 5)
      .map((m) => ({
        name: m.displayName.length > 6 ? m.displayName.slice(0, 6) + "..." : m.displayName,
        fullName: m.displayName,
        blockId: m.blockId,
        boxes: m.boxes,
        percentage: Math.round((m.boxes / totalBoxes) * 100),
      }));

    return { totalBoxes, totalStacks, doubleChests, top5ByBoxes };
  }, [materials]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName?: string; name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-2 text-sm">
          <p className="font-medium">{data.fullName || data.name}</p>
          <p className="text-muted-foreground">{data.value.toLocaleString()} 个</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">材料数量 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10Data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
              >
                <XAxis type="number" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">材料来源分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dimensionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {dimensionData.map((entry) => (
                    <Cell 
                      key={`cell-${entry.name}`} 
                      fill={DIMENSION_COLORS[entry.name as keyof typeof DIMENSION_COLORS]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">存储需求</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex flex-col">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">{storageStats.totalBoxes}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <BlockIconRaw blockId="minecraft:shulker_box" size={14} />
                  潜影盒
                </div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">{storageStats.doubleChests}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <BlockIconRaw blockId="minecraft:chest" size={14} />
                  大箱子
                </div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">{storageStats.totalStacks}</div>
                <div className="text-xs text-muted-foreground">总组数</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2">占用存储最多的材料：</div>
            <div className="flex-1 space-y-2">
              {storageStats.top5ByBoxes.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <BlockIconRaw blockId={item.blockId} size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate" title={item.fullName}>{item.name}</span>
                      <span className="text-muted-foreground ml-1">{item.boxes}盒 ({item.percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
