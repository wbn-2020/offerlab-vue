# OfferLab Vue Frontend

OfferLab 前端是一个面向求职者的面经与技术内容社区应用，使用 Vue 3、Vite、TypeScript、Pinia、Vue Router、Axios、TailwindCSS 和 Lucide 图标。当前开发分支为 `dev-v1`。

## 当前状态

已完成并接入真实后端能力：

- 首页、发现页、帖子详情、编辑器、用户主页、我的主页、设置页。
- 登录、注册、当前用户、资料编辑。
- 帖子发布、编辑、详情、列表、标签详情。
- 点赞、收藏、评论、评论点赞。
- 通知中心：未读数、分类筛选、单条已读、全部已读、通知跳转。
- 搜索页：关键词、公司、岗位、类型筛选、建议词、热词、URL 状态同步、搜索服务状态。
- 运维中心 `/admin/ops`：ES 状态、Outbox 状态、异步索引重建任务和轮询。
- 趋势看板 `/trend`：调用真实统计接口展示发布趋势、热门公司、高频标签、岗位分布。

## 技术栈

- Vue 3 + Composition API + `<script setup>`
- Vite 5
- TypeScript 5
- Vue Router 4
- Pinia
- Axios
- TailwindCSS 3
- Lucide Vue Next
- vue-sonner
- md-editor-v3 / markdown-it

## 环境要求

- Node.js 18+
- npm 9+
- 后端服务：`http://localhost:8080`

## 安装与启动

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

如果 5173 被占用，可指定端口：

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

构建：

```bash
npm run build
```

类型检查：

```bash
npm run typecheck
```

## 环境变量

开发环境 `.env.development`：

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:9001/ws
```

当前主要接口走 HTTP API；WebSocket/Netty 长连接仍属于后续增强方向。

## 页面路由

| Path | 页面 | 说明 |
|---|---|---|
| `/` | 首页 | 推荐内容与入口 |
| `/explore` | 发现 | 内容浏览 |
| `/trend` | 趋势看板 | 真实统计数据 |
| `/search` | 搜索 | ES/MySQL fallback 搜索 |
| `/post/:id` | 帖子详情 | 内容、评论、互动 |
| `/editor` | 编辑器 | 发布/编辑帖子，需登录 |
| `/u/:uid` | 用户主页 | 用户资料与内容 |
| `/me` | 我的主页 | 当前用户资料，需登录 |
| `/me/notifications` | 通知中心 | 需登录 |
| `/me/settings` | 设置 | 需登录 |
| `/admin/ops` | 运维中心 | 需登录，后端 admin 校验 |
| `/login` | 登录 | 认证 |
| `/register` | 注册 | 认证 |

## 本机验证

最近一次本机验证：

- `npm run build` 通过。
- `http://127.0.0.1:5174/trend` 正常展示真实统计数据。
- `http://127.0.0.1:5174/admin/ops` 登录后可查看运维状态并触发异步索引重建。

验证截图：

- `C:\codeware\offerlab-trend-real-data.png`
- `C:\codeware\offerlab-ops-5174.png`

## 后续可选增强

- Outbox 失败消息详情页和单条重试 UI。
- Admin 角色管理页。
- Settings 隐私设置接入后端配置模型。
- 移动端细节回归和 E2E 测试脚本。
