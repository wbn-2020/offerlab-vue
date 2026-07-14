import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuards } from './guards'

const enableLegacyTrainingRoutes = import.meta.env.VITE_OFFERLAB_ENABLE_LEGACY_TRAINING === 'true'
const legacyTrainingRedirect = () => ({ name: 'Questions', query: { legacy: 'training-disabled' } })

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/explore',
    name: 'Explore',
    component: () => import('@/views/ExploreView.vue'),
    meta: { title: '发现' },
  },
  {
    path: '/collaboration',
    name: 'CollaborationHub',
    component: () => import('@/views/CollaborationHubView.vue'),
    meta: { title: '公共共建' },
  },
  {
    path: '/trend',
    name: 'TrendDashboard',
    component: () => import('@/views/TrendDashboardView.vue'),
    meta: { title: '趋势看板' },
  },
  {
    path: '/questions',
    name: 'Questions',
    component: () => import('@/views/QuestionsView.vue'),
    meta: { title: '知识库' },
  },
  {
    path: '/questions/:id',
    name: 'QuestionDetail',
    component: () => import('@/views/QuestionDetailView.vue'),
    meta: { title: '知识卡详情' },
  },
  {
    path: '/companies/:company/prep',
    name: 'CompanyPrep',
    ...(enableLegacyTrainingRoutes
      ? { component: () => import('@/views/CompanyPrepView.vue') }
      : { redirect: legacyTrainingRedirect }),
    meta: { title: '主题学习包' },
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('@/views/PostDetailView.vue'),
    meta: { title: '帖子详情' },
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('@/views/EditorView.vue'),
    meta: { title: '发布社区内容', requiresAuth: true },
  },
  {
    path: '/editor/:id',
    name: 'PostEditor',
    component: () => import('@/views/EditorView.vue'),
    meta: { title: '编辑社区内容', requiresAuth: true },
  },
  {
    path: '/series/workbench',
    name: 'SeriesWorkbench',
    component: () => import('@/views/SeriesWorkbenchView.vue'),
    meta: { title: '合集工作台', requiresAuth: true },
  },
  {
    path: '/collections/:id',
    name: 'CollectionDetail',
    component: () => import('@/views/CollectionDetailView.vue'),
    meta: { title: '合集详情' },
  },
  {
    path: '/favorite-folders/:id',
    name: 'FavoriteFolderDetail',
    component: () => import('@/views/FavoriteFolderDetailView.vue'),
    meta: { title: '公开收藏夹' },
  },
  {
    path: '/growth/profile',
    name: 'GrowthProfile',
    component: () => import('@/views/GrowthProfileView.vue'),
    meta: { title: '成长档案', requiresAuth: true },
  },
  {
    path: '/growth/report',
    name: 'GrowthReport',
    component: () => import('@/views/GrowthReportView.vue'),
    meta: { title: '成长周报月报', requiresAuth: true },
  },
  {
    path: '/growth/community',
    name: 'CommunityGrowth',
    component: () => import('@/views/CommunityGrowthView.vue'),
    meta: { title: '社区成长', requiresAuth: true },
  },
  {
    path: '/knowledge/explore',
    name: 'KnowledgeExplore',
    component: () => import('@/views/KnowledgeExploreView.vue'),
    meta: { title: '知识关系探索' },
  },
  {
    path: '/certification/apply',
    name: 'CertificationApply',
    component: () => import('@/views/CertificationApplyView.vue'),
    meta: { title: '认证作者申请', requiresAuth: true },
  },
  {
    path: '/u/:uid',
    name: 'UserProfile',
    component: () => import('@/views/UserProfileView.vue'),
    meta: { title: '用户主页' },
  },
  {
    path: '/me',
    name: 'MeProfile',
    component: () => import('@/views/MeProfileView.vue'),
    meta: { title: '我的主页', requiresAuth: true },
  },
  {
    path: '/me/contact-requests',
    name: 'ContactRequests',
    component: () => import('@/views/ContactRequestsView.vue'),
    meta: { title: '联系请求', requiresAuth: true },
  },
  {
    path: '/me/creator',
    alias: '/creator/workbench',
    name: 'CreatorWorkbench',
    component: () => import('@/views/MeProfileView.vue'),
    meta: { title: '创作者工作台', requiresAuth: true },
  },
  {
    path: '/me/prep',
    name: 'MePrep',
    ...(enableLegacyTrainingRoutes
      ? { component: () => import('@/views/MePrepView.vue') }
      : { redirect: legacyTrainingRedirect }),
    meta: { title: '个人学习空间', requiresAuth: true, legacyFeature: 'private-training' },
  },
  {
    path: '/mock-interview',
    name: 'MockInterview',
    ...(enableLegacyTrainingRoutes
      ? { component: () => import('@/views/MockInterviewView.vue') }
      : { redirect: legacyTrainingRedirect }),
    meta: { title: '个人练习归档', requiresAuth: true, legacyFeature: 'mock-interview' },
  },
  {
    path: '/me/notifications',
    alias: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/NotificationsView.vue'),
    meta: { title: '通知', requiresAuth: true },
  },
  {
    path: '/me/reports',
    name: 'MyReports',
    component: () => import('@/views/MyReportsView.vue'),
    meta: { title: '我的举报', requiresAuth: true },
  },
  {
    path: '/me/reports/:sourceType/:reportId',
    name: 'MyReportDetail',
    component: () => import('@/views/MyReportsView.vue'),
    meta: { title: 'Report Detail', requiresAuth: true },
  },
  {
    path: '/me/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置', requiresAuth: true },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/admin',
    name: 'Admin',
    redirect: '/admin/ops',
    meta: { title: '后台中心', requiresAuth: true, adminPermission: ['ops', 'questionOperator', 'contentModerator', 'admin'] },
  },
  {
    path: '/admin/ops',
    name: 'AdminOps',
    component: () => import('@/views/OpsView.vue'),
    meta: { title: '运维中心', requiresAuth: true, adminPermission: ['ops', 'questionOperator', 'contentModerator', 'admin'] },
  },
  {
    path: '/admin/operations',
    name: 'AdminOperations',
    component: () => import('@/views/AdminOperationsView.vue'),
    meta: { title: '运营编排', requiresAuth: true, adminPermission: 'admin' },
  },
  {
    path: '/admin/collaboration',
    name: 'AdminCollaboration',
    component: () => import('@/views/AdminCollaborationView.vue'),
    meta: {
      title: '公共共建治理',
      requiresAuth: true,
      adminPermission: ['contentModerator', 'domainModerator', 'admin'],
    },
  },
  {
    path: '/admin/community-growth',
    name: 'AdminCommunityGrowth',
    component: () => import('@/views/AdminCommunityGrowthView.vue'),
    meta: { title: '激励与角色治理', requiresAuth: true, adminPermission: 'admin' },
  },
  {
    path: '/admin/questions',
    name: 'AdminQuestions',
    component: () => import('@/views/AdminQuestionsView.vue'),
    meta: { title: '结构化内容审核', requiresAuth: true, adminPermission: ['questionOperator', 'admin'] },
  },
  {
    path: '/admin/company-aliases',
    name: 'AdminCompanyAliases',
    component: () => import('@/views/AdminCompanyAliasesView.vue'),
    meta: { title: '实体别名维护', requiresAuth: true, adminPermission: ['questionOperator', 'admin'] },
  },
  {
    path: '/admin/governance',
    name: 'AdminGovernance',
    component: () => import('@/views/AdminGovernanceView.vue'),
    meta: {
      title: '治理中心',
      requiresAuth: true,
      adminPermission: ['contentModerator', 'domainModerator', 'ops', 'admin'],
      governanceDomainTabs: ['featured', 'queue', 'review'],
      governanceGlobalTabs: ['keywords', 'hits', 'users', 'topics', 'tags'],
      governanceOpsTabs: ['migration', 'audit'],
    },
  },
  {
    path: '/admin/tags',
    name: 'AdminTags',
    component: () => import('@/views/AdminGovernanceView.vue'),
    meta: { title: '标签治理', requiresAuth: true, adminPermission: ['contentModerator', 'admin'], governanceTab: 'tags' },
  },
  {
    path: '/tag/:slug',
    name: 'TagDetail',
    component: () => import('@/views/TagDetailView.vue'),
    meta: { title: '标签详情' },
  },
  {
    path: '/topics/:slug',
    name: 'TopicDetail',
    component: () => import('@/views/TopicDetailView.vue'),
    meta: { title: '话题详情' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册' },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/AboutView.vue'),
    meta: { title: '关于' },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: '无权访问' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Setup guards
setupRouterGuards(router)

export default router
