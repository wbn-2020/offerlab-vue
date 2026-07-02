<template>
  <header class="sticky top-0 z-40 border-b border-slate-200/75 bg-white/88 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <RouterLink to="/" class="brand-link group flex flex-shrink-0 items-center gap-2.5 text-slate-950 dark:text-white" :aria-label="`${siteBrand.displayName} 综合社区首页`">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-sm font-black text-white shadow-sm shadow-primary-600/20 transition-transform group-hover:-translate-y-0.5">
          闻
        </span>
        <span class="hidden leading-tight sm:block">
          <span class="block text-base font-black tracking-normal">{{ siteBrand.displayName }}</span>
          <span class="block text-xs font-medium text-slate-500 dark:text-slate-400">{{ siteBrand.tagline || '真实经验与有用内容社区' }}</span>
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
        <div class="relative domain-menu-container" @click.stop>
          <button @click="showDomainMenu = !showDomainMenu"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white">
            <Grid3x3 class="h-4 w-4" />
            频道
            <ChevronDown class="h-3 w-3" />
          </button>
          <div v-if="showDomainMenu" class="absolute left-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <router-link v-for="d in headerDomainOptions" :key="d.domain"
              :to="{ path: '/', query: { domain: d.domain } }"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              @click="showDomainMenu = false">
              <span class="text-lg">{{ d.icon }}</span>
              <div>
                <div class="font-semibold">{{ d.domainName }}</div>
                <div class="text-xs text-slate-500">{{ d.description }}</div>
              </div>
            </router-link>
            <div class="domain-menu-footer">
              {{ headerDomainSourceSummary }}
            </div>
          </div>
        </div>
      </nav>

      <form class="hidden max-w-sm flex-1 items-center gap-2 md:flex" @submit.prevent="submitSearch">
        <div class="relative w-full">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索经验、攻略、资源、话题或作者"
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
          class="header-icon-button relative rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
          class="header-icon-button rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          data-theme-toggle
          :title="themeStore.isDark() ? '切换亮色模式' : '切换暗色模式'"
        >
          <Sun v-if="themeStore.isDark()" class="h-5 w-5" />
          <Moon v-else class="h-5 w-5" />
        </button>

        <button
          type="button"
          class="header-icon-button rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
          :aria-expanded="showMobileMenu"
          aria-controls="mobile-main-nav"
          :aria-label="showMobileMenu ? '关闭主导航' : '打开主导航'"
          data-mobile-toggle
          @click.stop="toggleMobileMenu"
        >
          <X v-if="showMobileMenu" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>

        <div class="relative" data-user-menu>
          <button
            type="button"
            @click.stop="showUserMenu = !showUserMenu"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-sky-500 font-semibold text-white shadow-sm shadow-primary-600/20 transition-all hover:-translate-y-0.5 hover:shadow-md"
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
                <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ authStore.user?.nickname || `${siteBrand.shortName}用户` }}</div>
                <div class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ userMenuSignature }}</div>
              </div>
              <div class="menu-divider" />
              <RouterLink to="/me" class="menu-item" @click="showUserMenu = false">个人主页</RouterLink>
              <RouterLink to="/me/notifications" class="menu-item" @click="showUserMenu = false">通知中心</RouterLink>
              <RouterLink to="/me/settings" class="menu-item" @click="showUserMenu = false">设置</RouterLink>
              <RouterLink to="/series/workbench" class="menu-item" @click="showUserMenu = false">内容合集</RouterLink>
              <RouterLink to="/growth/profile" class="menu-item" @click="showUserMenu = false">作者数据</RouterLink>
              <RouterLink to="/growth/report" class="menu-item" @click="showUserMenu = false">历史报告</RouterLink>
              <RouterLink to="/knowledge/explore" class="menu-item" @click="showUserMenu = false">知识探索</RouterLink>
              <RouterLink to="/certification/apply" class="menu-item" @click="showUserMenu = false">认证作者申请</RouterLink>
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

    <button
      v-if="showMobileMenu"
      type="button"
      class="mobile-menu-backdrop"
      aria-label="关闭主导航"
      data-mobile-backdrop
      @click="closeMobileMenu"
    />

    <div
      v-if="showMobileMenu"
      id="mobile-main-nav"
      class="mobile-menu-panel border-t border-slate-200/75 bg-white px-4 py-4 shadow-lg shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-950 lg:hidden"
      data-mobile-menu
    >
      <div class="mx-auto max-w-7xl space-y-4">
        <form class="relative" @submit.prevent="submitSearch">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索经验、攻略、资源、话题或作者"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-primary-700 dark:focus:ring-primary-950"
          />
        </form>

        <nav class="grid gap-2" aria-label="移动主导航">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'mobile-nav-link',
              themeStore.isDark() ? 'mobile-nav-link-dark' : ''
            ]"
            active-class="mobile-nav-link-active"
            @click="closeMobileMenu"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <div class="grid grid-cols-2 gap-2">
          <RouterLink
            to="/search"
            :class="['mobile-quick-action', themeStore.isDark() ? 'mobile-quick-action-dark' : '']"
            @click="closeMobileMenu"
          >
            <Search class="h-4 w-4" />
            搜索
          </RouterLink>
          <RouterLink
            to="/editor"
            :class="[
              'mobile-quick-action mobile-quick-action-primary',
              themeStore.isDark() ? 'mobile-quick-action-primary-dark' : ''
            ]"
            @click="closeMobileMenu"
          >
            <PenLine class="h-4 w-4" />
            发布
          </RouterLink>
          <RouterLink
            v-if="authStore.token"
            to="/me/notifications"
            :class="['mobile-quick-action', themeStore.isDark() ? 'mobile-quick-action-dark' : '']"
            @click="closeMobileMenu"
          >
            <Bell class="h-4 w-4" />
            通知
          </RouterLink>
          <RouterLink
            v-if="authStore.isLoggedIn"
            to="/series/workbench"
            :class="['mobile-quick-action', themeStore.isDark() ? 'mobile-quick-action-dark' : '']"
            @click="closeMobileMenu"
          >
            <Grid3x3 class="h-4 w-4" />
            内容合集
          </RouterLink>
          <RouterLink
            v-if="authStore.isLoggedIn"
            to="/growth/profile"
            :class="['mobile-quick-action', themeStore.isDark() ? 'mobile-quick-action-dark' : '']"
            @click="closeMobileMenu"
          >
            <Tags class="h-4 w-4" />
            作者数据
          </RouterLink>
          <RouterLink
            to="/knowledge/explore"
            :class="['mobile-quick-action', themeStore.isDark() ? 'mobile-quick-action-dark' : '']"
            @click="closeMobileMenu"
          >
            <Library class="h-4 w-4" />
            知识关系
          </RouterLink>
          <RouterLink
            :to="authStore.isLoggedIn ? '/me' : '/login'"
            :class="['mobile-quick-action', themeStore.isDark() ? 'mobile-quick-action-dark' : '']"
            @click="closeMobileMenu"
          >
            <User class="h-4 w-4" />
            {{ authStore.isLoggedIn ? '个人中心' : '登录' }}
          </RouterLink>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Bell, ChevronDown, Compass, Flame, Grid3x3, Library, Menu, MessageCircle, Moon, PenLine, Search, Sun, Tags, User, X } from 'lucide-vue-next'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { authApi } from '@/api/auth'
import { domainApi, localDomainConfigs, type DomainConfigSource, type PublicDomainConfig } from '@/api/domains'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import { useAuthStore } from '@/stores/auth'
import { emptyUnreadCount, useRealtimeStore } from '@/stores/realtime'
import { useThemeStore } from '@/stores/theme'
import { siteBrand } from '@/utils/brand'
import { isSyntheticVisibleText } from '@/utils/textQuality'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const realtimeStore = useRealtimeStore()
const router = useRouter()

const showUserMenu = ref(false)
const showDomainMenu = ref(false)
const showMobileMenu = ref(false)
const keyword = ref('')
const permissions = ref<MyAdminPermissions | null>(null)
const headerDomainOptions = ref<PublicDomainConfig[]>([...localDomainConfigs])
const domainSource = ref<DomainConfigSource>('fallback')
const unreadCount = computed(() => realtimeStore.unreadCount.total)
const userMenuSignature = computed(() => {
  const signature = authStore.user?.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '分享经验、收藏攻略、参与讨论'
})
const headerDomainSourceSummary = computed(() => (
  domainSource.value === 'remote'
    ? `已同步 /api/v1/domains · 当前 ${headerDomainOptions.value.length} 个领域`
    : `接口未返回时使用本地 fallback · 当前 ${headerDomainOptions.value.length} 个领域`
))
const navItems = [
  { to: '/', label: '首页', icon: Flame },
  { to: '/explore', label: '发现', icon: Compass },
  { to: '/questions', label: '知识库', icon: MessageCircle },
  { to: '/editor', label: '发布', icon: PenLine },
]
const adminLinks = computed(() => {
  const value = permissions.value
  if (!value) return []
  const links: Array<{ to: string; label: string }> = []
  if (value.ops || value.questionOperator || value.contentModerator || value.admin) links.push({ to: '/admin/ops', label: '运维中心' })
  if (value.questionOperator || value.admin) {
    links.push({ to: '/admin/questions', label: '结构化内容审核' })
    links.push({ to: '/admin/company-aliases', label: '实体别名维护' })
  }
  if (value.contentModerator || value.domainModerator || value.ops || value.admin) links.push({ to: '/admin/governance', label: '治理中心' })
  if (value.contentModerator || value.admin) links.push({ to: '/admin/tags', label: '标签治理' })
  return links
})

const loadPermissions = async () => {
  if (!authStore.token) {
    permissions.value = null
    return
  }
  try {
    const res = await opsApi.myPermissions({ skipAuthRedirect: true })
    permissions.value = res.code === 0 ? res.data : null
  } catch {
    permissions.value = null
  }
}

const loadHeaderDomains = async () => {
  try {
    const res = await domainApi.listPublic()
    headerDomainOptions.value = res.data?.length ? res.data : [...localDomainConfigs]
    domainSource.value = res.source
  } catch {
    headerDomainOptions.value = [...localDomainConfigs]
    domainSource.value = 'fallback'
  }
}

const submitSearch = () => {
  const q = keyword.value.trim()
  closeMobileMenu()
  router.push({ path: '/search', query: q ? { q } : {} })
}

const toggleTheme = () => {
  themeStore.toggleExplicitMode()
}

const closeMobileMenu = () => {
  showMobileMenu.value = false
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  if (showMobileMenu.value) showUserMenu.value = false
}

const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  if (!target?.closest('[data-user-menu]')) showUserMenu.value = false
  if (!target?.closest('[data-mobile-menu]') && !target?.closest('[data-mobile-toggle]')) showMobileMenu.value = false
  if (!target?.closest('.domain-menu-container')) showDomainMenu.value = false
}

const handleLogout = async () => {
  try {
    await authApi.logout()
  } catch {
    // Local logout still clears private client state if the server session is already gone.
  }
  authStore.logout()
  realtimeStore.setUnreadCount(emptyUnreadCount())
  permissions.value = null
  showUserMenu.value = false
  showMobileMenu.value = false
  toast.success('已退出登录')
  router.push('/login')
}

onMounted(() => {
  loadPermissions()
  loadHeaderDomains()
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

watch(() => authStore.token, () => {
  loadPermissions()
})
</script>

<style scoped>
.menu-item {
  display: flex;
  min-height: 44px;
  align-items: center;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(51 65 85);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.brand-link,
.header-icon-button {
  min-height: 44px;
}

.series-workbench-link {
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.65rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(51 65 85);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.series-workbench-link:hover {
  border-color: rgb(191 219 254);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.header-icon-button {
  min-width: 44px;
  align-items: center;
  justify-content: center;
}

.menu-item:hover {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.menu-divider {
  margin: 0.35rem 0;
  border-top: 1px solid rgb(226 232 240);
}

.domain-menu-footer {
  margin-top: 0.4rem;
  border-top: 1px solid rgb(226 232 240);
  padding: 0.75rem 0.75rem 0.15rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgb(100 116 139);
}

.mobile-menu-backdrop {
  position: fixed;
  inset: 64px 0 0;
  z-index: 30;
  border: 0;
  background: rgb(15 23 42 / 0.36);
  backdrop-filter: blur(2px);
}

.mobile-menu-panel {
  position: fixed;
  inset: 64px 0 auto;
  z-index: 40;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  box-shadow: 0 18px 45px rgb(15 23 42 / 0.18);
}

.mobile-nav-link,
.mobile-quick-action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.mobile-nav-link {
  padding: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(30 41 59);
}

.mobile-nav-link:hover,
.mobile-nav-link:focus-visible,
.mobile-nav-link-active {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
  outline: none;
}

.mobile-nav-link-dark {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.mobile-nav-link-dark:hover,
.mobile-nav-link-dark:focus-visible,
.mobile-nav-link-active.mobile-nav-link-dark {
  border-color: rgb(96 165 250);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.mobile-quick-action {
  justify-content: center;
  border: 1px solid rgb(226 232 240);
  padding: 0.7rem 0.85rem;
  color: rgb(51 65 85);
}

.mobile-quick-action:hover {
  border-color: rgb(191 219 254);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.mobile-quick-action-primary {
  border-color: rgb(37 99 235);
  background: rgb(37 99 235);
  color: white;
}

.mobile-quick-action-primary:hover {
  border-color: rgb(29 78 216);
  background: rgb(29 78 216);
  color: white;
}

.mobile-quick-action-dark {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(226 232 240);
}

.mobile-quick-action-dark:hover,
.mobile-quick-action-dark:focus-visible {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(248 250 252);
}

.mobile-quick-action-primary-dark {
  border-color: rgb(37 99 235);
  background: rgb(37 99 235);
  color: white;
}

.mobile-quick-action-primary-dark:hover,
.mobile-quick-action-primary-dark:focus-visible {
  border-color: rgb(29 78 216);
  background: rgb(29 78 216);
  color: white;
}

.dark .menu-item {
  color: rgb(203 213 225);
}

.dark .menu-item:hover {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.dark .series-workbench-link {
  border-color: rgb(51 65 85);
  color: rgb(203 213 225);
}

.dark .series-workbench-link:hover {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(248 250 252);
}

.dark .menu-divider {
  border-color: rgb(30 41 59);
}

.dark .domain-menu-footer {
  border-color: rgb(30 41 59);
  color: rgb(148 163 184);
}

</style>
