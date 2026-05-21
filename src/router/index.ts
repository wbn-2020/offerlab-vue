import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { setupRouterGuards } from './guards'

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
    path: '/trend',
    name: 'TrendDashboard',
    component: () => import('@/views/TrendDashboardView.vue'),
    meta: { title: '趋势看板' },
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
    meta: { title: '发布帖子', requiresAuth: true },
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
    path: '/me/notifications',
    alias: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/NotificationsView.vue'),
    meta: { title: '通知', requiresAuth: true },
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
    path: '/tag/:slug',
    name: 'TagDetail',
    component: () => import('@/views/TagDetailView.vue'),
    meta: { title: '标签详情' },
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
