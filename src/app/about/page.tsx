import { TopBar } from "@/components/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Box,
  ChartNoAxesCombined,
  ClipboardCheck,
  Layers,
  ShieldCheck,
} from "lucide-react";

const changelog = [
  {
    title: "材料清单性能优化",
    items: [
      "材料列表新增 30 / 50 / 100 分页，减少大投影一次性渲染压力。",
      "多投影项目只渲染当前选中的材料表，切换 Tab 更流畅。",
      "认领数据按材料建立索引，减少筛选和切换时的重复计算。",
    ],
  },
  {
    title: "用户与权限体验",
    items: [
      "保留 Minecraft 用户名原始大小写，并兼容大小写不敏感登录和权限判断。",
      "用户管理新增搜索，可按用户名、显示名或昵称检索。",
      "顶栏导航统一显示我的认领、我的主页和后台管理入口。",
    ],
  },
  {
    title: "项目与数据可靠性",
    items: [
      "删除项目时同步清理成员、投影、材料和认领数据。",
      "支持管理后台刷新项目方块显示名称。",
      "增强头像代理、材料收集状态和移动端布局表现。",
    ],
  },
];

const features = [
  {
    icon: Layers,
    title: "投影解析",
    description: "上传 .litematic 文件后自动解析材料清单，支持一个项目管理多个投影。",
  },
  {
    icon: ClipboardCheck,
    title: "协作认领",
    description: "成员按潜影盒为单位认领材料，减少重复收集和沟通成本。",
  },
  {
    icon: ChartNoAxesCombined,
    title: "进度统计",
    description: "展示认领进度、收集状态、参与人数和材料排行榜。",
  },
  {
    icon: ShieldCheck,
    title: "权限管理",
    description: "支持白名单注册、管理员后台、成员管理和密码重置。",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <TopBar title="关于" />

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <section className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">关于 LiteTrack</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Minecraft 建筑材料协作追踪平台
              </p>
            </div>
          </div>
          <p className="text-muted-foreground leading-7">
            LiteTrack 面向使用 Litematica 投影协作建造的团队。你可以上传投影文件，
            自动得到材料需求，成员在线认领材料并追踪收集进度，让备货、分工和统计更清晰。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-6">
                  {feature.description}
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">更新日志</h2>
            <p className="text-sm text-muted-foreground mt-1">
              记录近期主要功能和体验优化。
            </p>
          </div>

          <div className="space-y-3">
            {changelog.map((entry) => (
              <Card key={entry.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {entry.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
