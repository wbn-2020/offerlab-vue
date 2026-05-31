# OfferLab Vue Frontend

OfferLab 前端是一个面向求职者的面经、技术内容、面试题库和求职备战社区应用。项目使用 Vue 3、Vite、TypeScript、Pinia、Vue Router、Axios、TailwindCSS、ECharts 和 Lucide 图标，当前主开发分支为 `dev-v2`。

## 项目能力

- 内容社区：首页、发现页、帖子详情、标签详情、Markdown 编辑器、发布和编辑帖子。
- 用户体系：登录、注册、当前用户、用户主页、我的主页、资料设置、求职意向和隐私设置。
- 互动体验：点赞、收藏、评论、评论点赞、通知中心和通知跳转。
- 搜索体验：关键词、公司、岗位、类型筛选、建议词、热词、URL 状态同步和搜索服务状态展示。
- 面试题库：题目列表、题目详情、公司备战页、个人备战进度。
- 趋势看板：发布趋势、热门公司、高频标签、岗位分布等真实后端统计数据展示。
- 后台运维：ES 状态、Outbox 状态、异步索引重建、AI 提取任务、Admin 角色、内容治理和公司别名治理。
- 权限保护：登录态路由守卫、后台权限校验、403 页面和统一错误提示。

## 技术栈

- Vue 3 + Composition API + `<script setup>`
- Vite 5
- TypeScript 5
- Vue Router 4
- Pinia
- Axios
- TailwindCSS 3
- shadcn-vue
- Lucide Vue Next
- ECharts / vue-echarts
- md-editor-v3 / markdown-it / highlight.js
- vue-sonner
- zod / vee-validate

## 环境要求

- Node.js 18+
- npm 9+
- OfferLab 后端服务：`http://localhost:8080`

## 安装与启动

安装依赖：

```powershell
npm install
```

启动开发服务：

```powershell
npm run dev
```

如果 5173 被占用，可指定端口：

```powershell
npm run dev -- --host 127.0.0.1 --port 5174
```

构建：

```powershell
npm run build
```

类型检查：

```powershell
npm run typecheck
```

完整本地验证：

```powershell
npm run verify
```

## 环境变量

开发环境默认读取 `.env.development`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WS_URL=ws://localhost:9001/ws
```

当前主要能力走 HTTP API。`VITE_WS_URL` 只有在后端
`/api/v1/notifications/realtime-status` 返回 `websocketEnabled=true` 时才会被使用。

## 页面路由

| Path | 页面 | 说明 |
|---|---|---|
| `/` | 首页 | 推荐内容与核心入口 |
| `/explore` | 发现 | 内容浏览 |
| `/trend` | 趋势看板 | 真实统计数据 |
| `/questions` | 面试题库 | 题目列表、筛选和搜索 |
| `/questions/:id` | 题目详情 | 题目、参考思路和学习进度 |
| `/companies/:company/prep` | 公司备战 | 公司维度题目和备战信息 |
| `/search` | 搜索 | ES/MySQL fallback 搜索 |
| `/post/:id` | 帖子详情 | 内容、评论和互动 |
| `/editor` | 编辑器 | 发布帖子，需登录 |
| `/editor/:id` | 编辑帖子 | 编辑已有帖子，需登录 |
| `/tag/:slug` | 标签详情 | 标签下内容聚合 |
| `/u/:uid` | 用户主页 | 用户资料与内容 |
| `/me` | 我的主页 | 当前用户资料，需登录 |
| `/me/prep` | 我的备战 | 当前用户刷题和备战进度，需登录 |
| `/me/notifications` | 通知中心 | 需登录 |
| `/me/settings` | 设置 | 账号、资料、求职意向、隐私设置，需登录 |
| `/admin/ops` | 运维中心 | 需后台权限 |
| `/admin/questions` | 题目治理 | 需后台权限 |
| `/admin/company-aliases` | 公司别名治理 | 需后台权限 |
| `/admin/governance` | 内容治理 | 需后台权限 |
| `/login` | 登录 | 认证 |
| `/register` | 注册 | 认证 |
| `/about` | 关于 | 项目介绍 |
| `/403` | 无权限 | 权限拒绝 |

## 后端接口依赖

前端默认通过 `VITE_API_BASE_URL` 访问后端，主要接口分组包括：

- `/api/v1/auth/**`：注册、登录、退出。
- `/api/v1/users/**`：用户资料、主页、关注、隐私设置。
- `/api/v1/posts/**`：帖子、评论、点赞、收藏、举报。
- `/api/v1/feeds/**`：最新、热门、关注流。
- `/api/v1/notifications/**`：通知列表和已读状态。
- `/api/v1/search/**`：搜索、建议词、热词、索引状态。
- `/api/v1/questions/**`：面试题库、题目详情、备战进度。
- `/api/v1/dashboard/trend`：趋势看板。
- `/api/v1/ops/**`：运维状态、Outbox、Admin 角色。
- `/api/v1/admin/**`：题目提取任务、公司别名、内容治理等后台能力。

## AI 相关说明

前端没有直接调用 OpenAI、DeepSeek、DashScope 等模型 API。AI 相关页面只调用 OfferLab 后端接口：

- `GET /api/v1/admin/ai-tasks`
- `POST /api/v1/admin/ai-tasks/{id}/retry`
- `POST /api/v1/admin/posts/{postId}/extract-questions`

真实大模型调用由后端控制，默认关闭并可回退到规则提取。前端只展示任务状态、失败原因和重试入口。

## 权限与错误处理

- 登录态由前端 store 和路由守卫维护。
- 需要登录的页面会跳转到 `/login?redirect=...`。
- 后台页面依赖后端返回的 Admin 权限；权限不足时进入 `/403`。
- API 错误通过统一错误处理和 toast 提示展示。
- Markdown 内容经过安全渲染检查，避免直接渲染不可信脚本。

## 本地验证

Guard 检查：

```powershell
npm run test:guards
```

完整验证：

```powershell
npm run verify
```

该命令会执行权限、错误处理、编辑器/通知错误、Markdown 安全、搜索权限、路由元信息、冒烟页面检查，并执行生产构建。

## 常见问题

- 后端未启动时，页面会出现接口错误或空数据；先确认 `http://localhost:8080` 可访问。
- 后台页面需要登录且具备 Admin 权限；本地开发可配合后端 `t_user_admin` 或 Admin UID 白名单。
- 搜索数据为空时，检查后端 Elasticsearch 状态；ES 不可用时后端会走 MySQL fallback，但索引状态展示会不同。
- AI 提取任务失败时，先查看后端是否启用了 DeepSeek 配置；未启用时通常应回退到规则提取。
