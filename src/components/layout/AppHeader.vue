<template>
  <header class="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
    <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-6">
      <!-- Logo -->
      <RouterLink to="/" class="flex-shrink-0">
        <div class="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">面试圈</div>
      </RouterLink>

      <!-- Search Bar -->
      <div class="flex-1 max-w-md">
        <input
          type="text"
          placeholder="搜索面经、公司、岗位..."
          class="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-4">
        <!-- Notification Bell -->
        <button class="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span class="text-xl">🔔</span>
          <span
            v-if="unreadCount > 0"
            class="absolute top-1 right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>

        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          :title="themeStore.isDark() ? '切换亮色模式' : '切换暗色模式'"
        >
          <span class="text-xl">{{ themeStore.isDark() ? '☀️' : '🌙' }}</span>
        </button>

        <!-- User Menu -->
        <div class="relative">
          <button
            @click="showUserMenu = !showUserMenu"
            class="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors font-semibold"
          >
            {{ authStore.isLoggedIn ? (authStore.user?.nickname?.[0] || 'U') : '👤' }}
          </button>

          <!-- User Dropdown Menu -->
          <div
            v-if="showUserMenu"
            class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-2 z-50"
          >
            <template v-if="authStore.isLoggedIn">
              <RouterLink
                to="/me"
                class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click="showUserMenu = false"
              >
                个人主页
              </RouterLink>
              <RouterLink
                to="/me/settings"
                class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click="showUserMenu = false"
              >
                设置
              </RouterLink>
              <button
                @click="handleLogout"
                class="w-full text-left px-4 py-2 text-sm text-danger hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                退出登录
              </button>
            </template>
            <template v-else>
              <RouterLink
                to="/login"
                class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click="showUserMenu = false"
              >
                登录
              </RouterLink>
              <RouterLink
                to="/register"
                class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click="showUserMenu = false"
              >
                注册
              </RouterLink>
            </template>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useRealtimeStore } from '@/stores/realtime'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const realtimeStore = useRealtimeStore()
const router = useRouter()

const showUserMenu = ref(false)

const unreadCount = computed(() => realtimeStore.unreadCount.total)

const toggleTheme = () => {
  const newMode = themeStore.mode === 'dark' ? 'light' : 'dark'
  themeStore.setMode(newMode)
}

const handleLogout = async () => {
  try {
    authStore.logout()
    showUserMenu.value = false
    toast.success('已退出登录')
    router.push('/login')
  } catch (error) {
    toast.error('退出登录失败')
  }
}

// Close menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-user-menu]')) {
      showUserMenu.value = false
    }
  })
})
</script>

