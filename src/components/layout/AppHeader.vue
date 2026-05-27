<template>
  <header class="sticky top-0 z-40 border-b border-slate-200/75 bg-white/88 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <RouterLink to="/" class="group flex flex-shrink-0 items-center gap-2.5 text-slate-950 dark:text-white" aria-label="OfferLab 首页">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-sm font-black text-white shadow-sm shadow-primary-600/20 transition-transform group-hover:-translate-y-0.5">
          OL
        </span>
        <span class="hidden leading-tight sm:block">
          <span class="block text-base font-black tracking-normal">OfferLab</span>
          <span class="block text-xs font-medium text-slate-500 dark:text-slate-400">面试经验社区</span>
        </span>
      </RouterLink>

      <nav class="hidden items-center gap-1 lg:flex" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
          active-class="bg-primary-100 text-primary-700 dark:bg-slate-800 dark:text-primary-200 dark:ring-1 dark:ring-primary-500/25"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <form class="hidden max-w-sm flex-1 items-center gap-2 md:flex" @submit.prevent="submitSearch">
        <div class="relative w-full">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索面经、公司、岗位..."
            class="w-full rounded-lg border border-slate-200 bg-slate-50/90 py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-inner shadow-slate-200/30 transition-colors placeholder:text-slate-400 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none dark:focus:border-primary-700 dark:focus:bg-slate-900 dark:focus:ring-primary-950"
          />
        </div>
      </form>

      <div class="flex items-center gap-2 sm:gap-3">
        <RouterLink to="/editor" class="primary-action hidden sm:inline-flex">
          <PenLine class="h-4 w-4" />
          发布内容
        </RouterLink>

        <RouterLink
          v-if="authStore.token"
          to="/me/notifications"
          class="relative rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          title="通知"
        >
          <Bell class="h-5 w-5" />
          <span
            v-if="unreadCount > 0"
            class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold text-white"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </RouterLink>

        <button
          type="button"
          @click="toggleTheme"
          class="rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          :title="themeStore.isDark() ? '切换亮色模式' : '切换暗色模式'"
        >
          <Sun v-if="themeStore.isDark()" class="h-5 w-5" />
          <Moon v-else class="h-5 w-5" />
        </button>

        <div class="relative" data-user-menu>
          <button
            type="button"
            @click.stop="showUserMenu = !showUserMenu"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-sky-500 font-semibold text-white shadow-sm shadow-primary-600/20 transition-all hover:-translate-y-0.5 hover:shadow-md"
            aria-label="用户菜单"
          >
            <span v-if="authStore.isLoggedIn">{{ authStore.user?.nickname?.[0] || 'U' }}</span>
            <User v-else class="h-5 w-5" />
          </button>

          <div
            v-if="showUserMenu"
            class="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30"
          >
            <template v-if="authStore.isLoggedIn">
              <div class="px-4 py-3">
                <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ authStore.user?.nickname || 'OfferLab 用户' }}</div>
                <div class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ authStore.user?.signature || '继续完善你的求职档案' }}</div>
              </div>
              <div class="menu-divider" />
              <RouterLink to="/me" class="menu-item" @click="showUserMenu = false">个人主页</RouterLink>
              <RouterLink to="/me/prep" class="menu-item" @click="showUserMenu = false">我的准备台</RouterLink>
              <RouterLink to="/me/notifications" class="menu-item" @click="showUserMenu = false">通知中心</RouterLink>
              <RouterLink to="/me/settings" class="menu-item" @click="showUserMenu = false">设置</RouterLink>
              <div v-if="adminLinks.length" class="menu-divider" />
              <RouterLink
                v-for="item in adminLinks"
                :key="item.to"
                :to="item.to"
                class="menu-item"
                @click="showUserMenu = false"
              >
                {{ item.label }}
              </RouterLink>
              <button type="button" @click="handleLogout" class="menu-item w-full text-left text-danger">
                退出登录
              </button>
            </template>
            <template v-else>
              <RouterLink to="/login" class="menu-item" @click="showUserMenu = false">登录</RouterLink>
              <RouterLink to="/register" class="menu-item" @click="showUserMenu = false">注册</RouterLink>
            </template>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bell, BookOpen, Compass, Flame, Moon, PenLine, Search, Sun, User } from 'lucide-vue-next'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { notificationApi } from '@/api/notification'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { useThemeStore } from '@/stores/theme'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const realtimeStore = useRealtimeStore()
const router = useRouter()

const showUserMenu = ref(false)
const keyword = ref('')
const permissions = ref<MyAdminPermissions | null>(null)
const unreadCount = computed(() => realtimeStore.unreadCount.total)
const navItems = [
  { to: '/', label: '信息流', icon: Flame },
  { to: '/explore', label: '发现', icon: Compass },
  { to: '/questions', label: '题库', icon: BookOpen },
]
const adminLinks = computed(() => {
  const value = permissions.value
  if (!value) return []
  const links: Array<{ to: string; label: string }> = []
  if (value.ops || value.questionOperator || value.contentModerator || value.admin) links.push({ to: '/admin/ops', label: '运维中心' })
  if (value.questionOperator) {
    links.push({ to: '/admin/questions', label: '题目审核' })
    links.push({ to: '/admin/company-aliases', label: '公司别名维护' })
  }
  if (value.contentModerator || value.ops || value.admin) links.push({ to: '/admin/governance', label: '治理中心' })
  return links
})

const loadUnread = async () => {
  if (!authStore.token) return
  try {
    const res = await notificationApi.getUnreadCount()
    if (res.code === 0 && res.data) realtimeStore.setUnreadCount(res.data)
  } catch {
    realtimeStore.setUnreadCount({ total: 0, like: 0, comment: 0, favorite: 0, follower: 0, mention: 0, system: 0 })
  }
}

const loadPermissions = async () => {
  if (!authStore.token) {
    permissions.value = null
    return
  }
  try {
    const res = await opsApi.myPermissions()
    permissions.value = res.code === 0 ? res.data : null
  } catch {
    permissions.value = null
  }
}

const submitSearch = () => {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { q } : {} })
}

const toggleTheme = () => {
  themeStore.setMode(themeStore.mode === 'dark' ? 'light' : 'dark')
}

const handleLogout = async () => {
  authStore.logout()
  realtimeStore.setUnreadCount({ total: 0, like: 0, comment: 0, favorite: 0, follower: 0, mention: 0, system: 0 })
  permissions.value = null
  showUserMenu.value = false
  toast.success('已退出登录')
  router.push('/login')
}

onMounted(() => {
  loadUnread()
  loadPermissions()
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-user-menu]')) showUserMenu.value = false
  })
})

watch(() => authStore.token, () => {
  loadUnread()
  loadPermissions()
})
</script>

<style scoped>
.menu-item {
  display: block;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(51 65 85);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.menu-item:hover {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.menu-divider {
  margin: 0.35rem 0;
  border-top: 1px solid rgb(226 232 240);
}

:global(.dark) .menu-item {
  color: rgb(203 213 225);
}

:global(.dark) .menu-item:hover {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

:global(.dark) .menu-divider {
  border-color: rgb(30 41 59);
}
</style>
