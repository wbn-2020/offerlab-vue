# 面试圈 - Vue 3 前端

一个面向求职者的垂直内容社区前端，主打面经分享、技术博客、求职问答、面试题检索。

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
pnpm dev
```

访问 http://localhost:5173

### 构建

```bash
pnpm build
```

### 类型检查

```bash
pnpm typecheck
```

### 代码检查

```bash
pnpm lint
```

## 技术栈

- **框架**: Vue 3.4 + Composition API + `<script setup>`
- **构建**: Vite 5
- **语言**: TypeScript 5
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **数据请求**: TanStack Query + Axios
- **样式**: TailwindCSS 3 + shadcn-vue
- **图标**: Lucide Vue Next
- **表单**: vee-validate + Zod
- **通知**: vue-sonner
- **Markdown**: vue-markdown-render + highlight.js
- **图表**: vue-echarts

## 目录结构

```
src/
├── api/                    # API 客户端
│   ├── client.ts          # axios 实例 + 拦截器
│   ├── types.ts           # 共用类型
│   ├── auth.ts
│   ├── user.ts
│   ├── post.ts
│   ├── interaction.ts
│   ├── feed.ts
│   ├── search.ts
│   ├── notification.ts
│   └── dashboard.ts
├── stores/                # Pinia 状态管理
│   ├── auth.ts
│   ├── theme.ts
│   └── realtime.ts
├── router/                # 路由
│   ├── index.ts
│   └── guards.ts
├── views/                 # 页面
│   ├── HomeView.vue
│   ├── ExploreView.vue
│   ├── TrendDashboardView.vue
│   ├── PostDetailView.vue
│   ├── EditorView.vue
│   ├── UserProfileView.vue
│   ├── MeProfileView.vue
│   ├── NotificationsView.vue
│   ├── SettingsView.vue
│   ├── SearchView.vue
│   ├── TagDetailView.vue
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── AboutView.vue
│   └── NotFoundView.vue
├── components/            # 组件
│   ├── layout/
│   ├── post/
│   ├── user/
│   ├── feed/
│   ├── search/
│   ├── notification/
│   ├── dashboard/
│   ├── common/
│   └── ui/
├── composables/           # 自定义 hooks
│   ├── useAuth.ts
│   ├── useRealtime.ts
│   ├── useInfiniteFeed.ts
│   └── useDebounce.ts
├── lib/                   # 工具库
│   ├── packet-codec.ts    # 二进制协议编解码
│   ├── cn.ts              # tailwind class merge
│   └── format.ts          # 时间/数字格式化
├── styles/                # 全局样式
│   ├── globals.css
│   └── markdown.css
├── main.ts
├── App.vue
└── env.d.ts
```

## 关键特性

### 1. 完整的 API 集成

- 统一的 axios 客户端，支持请求/响应拦截
- 自动注入 Authorization header 和 X-Trace-Id
- 业务异常自动解包和错误处理

### 2. 状态管理

- **auth.ts**: 用户认证状态（token、user）
- **theme.ts**: 主题切换（亮/暗/自动）
- **realtime.ts**: 实时通知状态

### 3. 数据请求

- TanStack Query 管理服务端状态
- 自动缓存、重试、SWR 模式
- 无限滚动 Feed 支持

### 4. WebSocket 实时通知

- 自定义二进制协议（与 Netty 后端对齐）
- 心跳机制 + 自动重连
- 消息分发到 Pinia store

### 5. 响应式设计

- 桌面优先（≥1280px 三栏布局）
- 平板适配（1024px-1280px 两栏）
- 移动端可用（<1024px 单列）

### 6. 暗色模式

- 跟随系统偏好
- 手动切换支持
- 无闪烁初始化

## 环境变量

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:9001/ws

# .env.production
VITE_API_BASE_URL=https://api.offerlab.com
VITE_WS_URL=wss://ws.offerlab.com/ws
```

## 关联文档

- [PRD.md](../社区-PRD/PRD.md) - 产品需求文档
- [09-API规范.md](../社区-PRD/09-API规范.md) - API 设计规范
- [10-前端设计.md](../社区-PRD/10-前端设计.md) - 前端设计文档

## 下一步

- [ ] 完成登录/注册页面
- [ ] 实现帖子详情页和评论树
- [ ] 完成编辑器（Markdown）
- [ ] 实现搜索和自动补全
- [ ] 完成趋势看板（图表）
- [ ] 用户主页和个人设置
- [ ] 通知中心
- [ ] 性能优化（路由懒加载、图片懒加载、虚拟滚动）
- [ ] 单元测试和 E2E 测试

## 许可证

MIT
