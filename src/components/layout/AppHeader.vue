<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
      <RouterLink to="/" class="flex-shrink-0 text-2xl font-bold text-primary-600 transition-colors hover:text-primary-700">
        面试场
      </RouterLink>

      <form class="hidden max-w-md flex-1 items-center gap-2 sm:flex" @submit.prevent="submitSearch">
        <div class="relative w-full">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索面经、公司、岗位..."
            class="w-full rounded-lg border border-slate-200 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </form>

      <div class="flex items-center gap-3">
        <RouterLink
          to="/questions"
          class="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:inline-flex"
        >
          题库
        </RouterLink>

        <RouterLink
          v-if="authStore.token"
          to="/me/notifications"
          class="relative rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          title="通知"
        >
          <Bell class="h-5 w-5 text-slate-700 dark:text-slate-200" />
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
          class="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          :title="themeStore.isDark() ? '切换亮色模式' : '切换暗色模式'"
        >
          <Sun v-if="themeStore.isDark()" class="h-5 w-5 text-slate-700 dark:text-slate-200" />
          <Moon v-else class="h-5 w-5 text-slate-700 dark:text-slate-200" />
        </button>

        <div class="relative" data-user-menu>
          <button
            type="button"
            @click.stop="showUserMenu = !showUserMenu"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <span v-if="authStore.isLoggedIn">{{ authStore.user?.nickname?.[0] || 'U' }}</span>
            <User v-else class="h-5 w-5" />
          </button>

          <div
            v-if="showUserMenu"
            class="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <template v-if="authStore.isLoggedIn">
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
import { Bell, Moon, Search, Sun, User } from 'lucide-vue-next'
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
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: rgb(51 65 85);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.menu-item:hover {
  background: rgb(241 245 249);
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
}

:global(.dark) .menu-divider {
  border-color: rgb(30 41 59);
}
</style>
