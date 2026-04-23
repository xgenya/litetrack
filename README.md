# LiteTrack

**LiteTrack** 是一个基于 Next.js + SQLite 的 Minecraft Litematica 投影协作备货平台。

团队成员可以认领材料、追踪收集进度，项目管理员可以管理投影、分配任务。

## 功能特性

- 📋 **项目管理** — 创建投影项目，管理多个 `.litematic` 文件
- 👥 **协作认领** — 成员认领材料，实时查看收集进度
- 📊 **数据可视化** — 材料完成情况图表
- 🔐 **权限管理** — 管理员 / 普通用户，支持白名单注册
- 🏷️ **昵称系统** — 自定义显示名，MC 皮肤头像
- 🌙 **深色模式** — 完整 Dark Mode 支持

## 快速开始（Docker）

> 确保已安装 [Docker](https://docs.docker.com/get-docker/) 和 Docker Compose。

**一、获取配置文件**

```bash
mkdir litetrack && cd litetrack

curl -O https://raw.githubusercontent.com/xgenya/litetrack/master/docker-compose.yml
curl -O https://raw.githubusercontent.com/xgenya/litetrack/master/.env.example
cp .env.example .env
```

**二、配置管理员**

编辑 `.env`，将 `your_username` 替换为你注册时使用的用户名（支持多个，逗号分隔）：

```env
ADMIN_USERNAMES=your_username
```

**三、启动服务**

```bash
mkdir -p data
docker compose up -d
```

打开浏览器访问 **http://localhost:3000**，注册账号后即为管理员。

**四、更新镜像**

```bash
docker compose pull
docker compose up -d
```

**五、停止服务**

```bash
docker compose down
```

> **数据持久化**：SQLite 数据库保存在 `./data/litematic.db`，`.env` 通过 `env_file` 注入容器环境变量，重建容器数据不丢失。

## 本地开发

```bash
npm install
cp .env.example .env
npm run dev
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ADMIN_USERNAMES` | — | 超级管理员用户名，逗号分隔 |

## 技术栈

- [Next.js 15](https://nextjs.org/) · React 19
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Tailwind CSS](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/)
