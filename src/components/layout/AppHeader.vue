<template>
  <header class="community-header">
    <button type="button" class="community-skip-link" @click="focusMainContent">
      跳到主要内容
    </button>
    <div class="community-header__inner">
      <RouterLink
        to="/"
        class="community-header__brand"
        :aria-label="`${siteBrand.displayName} 综合社区首页`"
      >
        <span class="community-header__brand-mark">闻</span>
        <span class="community-header__brand-copy">
          <strong>{{ siteBrand.displayName }}</strong>
          <small>{{ siteBrand.tagline || '真实经验与有用内容社区' }}</small>
        </span>
      </RouterLink>

      <nav class="community-header__nav" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="community-header__nav-link"
          :class="{ 'community-header__nav-link--active': isNavActive(item.to) }"
          :aria-current="isNavActive(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>

        <div class="community-header__menu" @click.stop>
          <button
            ref="domainMenuButton"
            type="button"
            class="community-header__nav-link community-header__channel-trigger"
            :aria-expanded="showDomainMenu"
            aria-haspopup="menu"
            aria-controls="header-domain-menu"
            @click="toggleDomainMenu"
          >
            频道
            <ChevronDown class="h-3.5 w-3.5" />
          </button>
          <div
            v-if="showDomainMenu"
            id="header-domain-menu"
            class="community-header__dropdown community-header__channel-menu"
            role="menu"
          >
            <RouterLink
              to="/"
              class="community-header__channel-item"
              role="menuitem"
              @click="showDomainMenu = false"
            >
              <span class="community-header__channel-icon">全</span>
              <span>
                <strong>综合</strong>
                <small>跨频道的真实经验与讨论</small>
              </span>
            </RouterLink>
            <RouterLink
              v-for="domain in headerDomainOptions"
              :key="domain.domain"
              :to="{ path: '/', query: { domain: domain.domain } }"
              class="community-header__channel-item"
              role="menuitem"
              @click="showDomainMenu = false"
            >
              <span class="community-header__channel-icon">{{ domain.icon }}</span>
              <span>
                <strong>{{ domain.domainName }}</strong>
                <small>{{ domain.description }}</small>
              </span>
            </RouterLink>
          </div>
        </div>
      </nav>

      <form class="community-header__search" role="search" @submit.prevent="submitSearch">
        <Search class="h-4 w-4" aria-hidden="true" />
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索经验、攻略、资源、话题或作者"
          aria-label="搜索经验、攻略、资源、话题或作者"
          @keydown.enter.prevent="submitSearch"
        >
      </form>

      <div class="community-header__actions">
        <RouterLink to="/editor" class="community-header__publish">
          <PenLine class="h-4 w-4" />
          <span>发布</span>
        </RouterLink>
        <RouterLink
          v-if="authStore.token"
          to="/me/notifications"
          class="community-header__icon-button"
          title="通知"
          aria-label="通知"
        >
          <Bell class="h-5 w-5" />
          <span v-if="unreadCount > 0" class="community-header__notification-count">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </RouterLink>
        <button
          type="button"
          class="community-header__icon-button community-header__theme-button"
          data-theme-toggle
          :title="themeStore.isDark() ? '切换亮色模式' : '切换暗色模式'"
          :aria-label="themeStore.isDark() ? '切换亮色模式' : '切换暗色模式'"
          @click="toggleTheme"
        >
          <Sun v-if="themeStore.isDark()" class="h-[18px] w-[18px]" />
          <Moon v-else class="h-[18px] w-[18px]" />
        </button>

        <template v-if="!authStore.isLoggedIn">
          <RouterLink to="/login" class="community-header__auth-link">登录</RouterLink>
          <RouterLink to="/register" class="community-header__register-link">注册</RouterLink>
        </template>

        <div v-else class="community-header__menu" data-user-menu>
          <button
            ref="userMenuButton"
            type="button"
            class="community-header__avatar"
            :aria-expanded="showUserMenu"
            aria-haspopup="menu"
            aria-controls="header-user-menu"
            aria-label="用户菜单"
            @click.stop="toggleUserMenu"
          >
            <UserAvatar
              class="community-header__avatar-image"
              :src="authStore.user?.avatar"
              :name="authStore.user?.nickname"
              alt=""
              fallback="我"
            />
          </button>
          <div
            v-if="showUserMenu"
            id="header-user-menu"
            class="community-header__dropdown community-header__user-menu"
            :data-permission-state="permissionViewState"
            role="menu"
          >
            <div class="community-header__user-summary">
              <strong>{{ authStore.user?.nickname || `${siteBrand.shortName}用户` }}</strong>
              <small>{{ userMenuSignature }}</small>
            </div>
            <div class="community-header__menu-divider" />
            <p class="community-header__menu-group-label">常用</p>
            <RouterLink to="/me" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">我的主页</RouterLink>
            <RouterLink to="/me/notifications" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">通知中心</RouterLink>
            <RouterLink to="/me/collaboration" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">协作行动中心</RouterLink>
            <div class="community-header__menu-divider" />
            <p class="community-header__menu-group-label">工作台</p>
            <RouterLink to="/series/workbench" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">内容合集</RouterLink>
            <RouterLink to="/me/relationships" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">关系与订阅中心</RouterLink>
            <RouterLink to="/me/knowledge" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">知识维护</RouterLink>
            <RouterLink to="/knowledge/explore" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">知识探索</RouterLink>
            <RouterLink to="/growth/profile" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">成长档案</RouterLink>
            <RouterLink to="/me/settings" class="community-header__menu-item" role="menuitem" @click="showUserMenu = false">设置</RouterLink>

            <div v-if="adminLinks.length || permissionStatus !== 'ready'" class="community-header__admin-tools">
              <div class="community-header__admin-tools-head">
                <span class="community-header__menu-group-label">管理工具</span>
                <RouterLink
                  v-if="adminLinks.length"
                  to="/admin"
                  class="community-header__admin-entry"
                  role="menuitem"
                  @click="showUserMenu = false"
                >
                  进入后台中心 →
                </RouterLink>
              </div>
              <div v-if="permissionStatus === 'loading'" class="community-header__permission-state" role="status">
                <Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>正在确认管理权限</span>
              </div>
              <div
                v-else-if="permissionStatus === 'unavailable'"
                class="community-header__permission-state community-header__permission-state--error"
                role="alert"
              >
                <AlertCircle class="h-4 w-4" aria-hidden="true" />
                <span>{{ permissionError }}</span>
                <button type="button" @click="loadPermissions">
                  <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
                  重试
                </button>
              </div>
              <RouterLink
                v-for="item in adminLinks"
                :key="item.to"
                :to="item.to"
                class="community-header__menu-item"
                role="menuitem"
                @click="showUserMenu = false"
              >
                {{ item.label }}
              </RouterLink>
            </div>
            <div class="community-header__menu-divider" />
            <button type="button" class="community-header__menu-item community-header__menu-item--danger" role="menuitem" @click="handleLogout">
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>

    <nav class="community-mobile-dock" aria-label="移动导航">
      <RouterLink to="/" :class="{ 'community-mobile-dock__item--active': isNavActive('/') }">
        <Flame class="h-5 w-5" />
        <span>首页</span>
      </RouterLink>
      <RouterLink to="/explore" :class="{ 'community-mobile-dock__item--active': isNavActive('/explore') }">
        <Compass class="h-5 w-5" />
        <span>发现</span>
      </RouterLink>
      <RouterLink to="/editor" class="community-mobile-dock__publish">
        <PenLine class="h-5 w-5" />
        <span>发布</span>
      </RouterLink>
      <RouterLink to="/co-build" :class="{ 'community-mobile-dock__item--active': isNavActive('/co-build') }">
        <HeartHandshake class="h-5 w-5" />
        <span>共建</span>
      </RouterLink>
      <RouterLink :to="authStore.isLoggedIn ? '/me' : '/login'" :class="{ 'community-mobile-dock__item--active': isNavActive('/me') }">
        <User class="h-5 w-5" />
        <span>我的</span>
      </RouterLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AlertCircle,
  Bell,
  BookOpen,
  ChevronDown,
  Compass,
  Flame,
  HeartHandshake,
  Loader2,
  Moon,
  PenLine,
  RefreshCw,
  Search,
  Sun,
  User,
} from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/api/client'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { useDomainCatalog } from '@/composables/useDomainCatalog'
import { useAuthStore } from '@/stores/auth'
import { emptyUnreadCount, useRealtimeStore } from '@/stores/realtime'
import { useThemeStore } from '@/stores/theme'
import { siteBrand } from '@/utils/brand'
import { isSyntheticVisibleText } from '@/utils/textQuality'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const realtimeStore = useRealtimeStore()
const router = useRouter()
const route = useRoute()

const showUserMenu = ref(false)
const showDomainMenu = ref(false)
const userMenuButton = ref<HTMLButtonElement | null>(null)
const domainMenuButton = ref<HTMLButtonElement | null>(null)
const keyword = ref('')
const permissions = ref<MyAdminPermissions | null>(null)
const permissionStatus = ref<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
const permissionError = ref('')
let permissionRequestGeneration = 0
const { domains: headerDomainOptions, loadDomains } = useDomainCatalog()
const unreadCount = computed(() => realtimeStore.unreadCount.total)
const userMenuSignature = computed(() => {
  const signature = authStore.user?.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '分享经验、收藏攻略、参与讨论'
})

const navItems = [
  { to: '/', label: '首页', icon: Flame },
  { to: '/explore', label: '发现', icon: Compass },
  { to: '/knowledge', label: '知识库', icon: BookOpen },
  { to: '/co-build', label: '共建', icon: HeartHandshake },
]

// Routes that expose a canonical path and a more semantic alias. Either form
// must light up the matching navigation item.
const NAV_ALIAS_GROUPS: Array<[string, string]> = [
  ['/questions', '/knowledge'],
  ['/collaboration', '/co-build'],
]

const isNavActive = (target: string) => {
  if (target === '/') return route.path === '/'
  const group = NAV_ALIAS_GROUPS.find((pair) => pair.includes(target))
  const candidates = group ?? [target]
  return candidates.some(
    (path) => route.path === path || route.path.startsWith(`${path}/`),
  )
}

const adminLinks = computed(() => {
  const value = permissions.value
  if (!value) return []
  const links: Array<{ to: string; label: string }> = []
  if (value.ops || value.questionOperator || value.contentModerator || value.admin) links.push({ to: '/admin/ops', label: '运维中心' })
  if (value.admin) links.push({ to: '/admin/operations', label: '运营编排' })
  if (value.contentModerator || value.domainModerator || value.admin) links.push({ to: '/admin/collaboration', label: '公共共建治理' })
  if (value.contentModerator || value.domainModerator || value.admin) links.push({ to: '/admin/community-health', label: '频道健康度' })
  if (value.contentModerator || value.domainModerator || value.admin) links.push({ to: '/admin/community-health/quality-governance-analytics', label: '频道质量治理分析' })
  if (value.contentModerator || value.domainModerator || value.admin) links.push({ to: '/admin/content-maintenance', label: '内容维护治理' })
  if (value.admin) links.push({ to: '/admin/community-growth', label: '激励与角色治理' })
  if (value.questionOperator || value.admin) {
    links.push({ to: '/admin/questions', label: '结构化内容审核' })
    links.push({ to: '/admin/company-aliases', label: '实体别名维护' })
  }
  if (value.contentModerator || value.domainModerator || value.ops || value.admin) links.push({ to: '/admin/governance', label: '治理中心' })
  if (value.contentModerator || value.admin) links.push({ to: '/admin/tags', label: '标签治理' })
  return links
})

const permissionViewState = computed(() => {
  if (permissionStatus.value !== 'ready') return permissionStatus.value
  return adminLinks.value.length ? 'granted' : 'empty'
})

const loadPermissions = async () => {
  const requestGeneration = ++permissionRequestGeneration
  const accountKey = `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
  if (!authStore.token) {
    permissions.value = null
    permissionStatus.value = 'idle'
    permissionError.value = ''
    return
  }
  const retrying = permissionStatus.value === 'unavailable'
  permissionStatus.value = 'loading'
  if (!retrying) permissionError.value = ''
  try {
    const res = await opsApi.myPermissions()
    if (
      requestGeneration !== permissionRequestGeneration
      || accountKey !== `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
    ) return
    if (res.code !== 0 || !res.data) {
      throw new Error('权限服务暂时不可用')
    }
    permissions.value = res.data
    permissionStatus.value = 'ready'
    permissionError.value = ''
  } catch (error: unknown) {
    if (
      requestGeneration !== permissionRequestGeneration
      || accountKey !== `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
    ) return
    permissions.value = null
    permissionStatus.value = 'unavailable'
    permissionError.value = getErrorMessage(error, '管理权限暂时无法确认，这不代表当前账号没有权限。')
  }
}

const submitSearch = () => {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { q } : {} })
}

const toggleTheme = () => {
  themeStore.toggleExplicitMode()
}

const focusMainContent = () => {
  const main = document.querySelector<HTMLElement>('main')
  if (!main) return
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
  main.focus()
}

const toggleDomainMenu = () => {
  showDomainMenu.value = !showDomainMenu.value
  if (showDomainMenu.value) showUserMenu.value = false
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) showDomainMenu.value = false
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target?.closest('[data-user-menu]')) showUserMenu.value = false
  if (!target?.closest('.community-header__channel-trigger') && !target?.closest('.community-header__channel-menu')) {
    showDomainMenu.value = false
  }
}

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  if (showUserMenu.value) {
    showUserMenu.value = false
    userMenuButton.value?.focus()
    return
  }
  if (showDomainMenu.value) {
    showDomainMenu.value = false
    domainMenuButton.value?.focus()
  }
}

const handleLogout = async () => {
  try {
    await authApi.logout()
  } catch {
    // Local logout remains valid if the server session has already expired.
  }
  authStore.logout()
  realtimeStore.setUnreadCount(emptyUnreadCount())
  permissionRequestGeneration += 1
  permissions.value = null
  permissionStatus.value = 'idle'
  permissionError.value = ''
  showUserMenu.value = false
  toast.success('已退出登录')
  router.push('/login')
}

onMounted(() => {
  loadPermissions()
  loadDomains()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})

watch([() => authStore.user?.uid, () => authStore.token], () => {
  loadPermissions()
})
</script>

<style scoped>
.community-header {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
}

.community-header__inner {
  display: grid;
  grid-template-columns: auto auto minmax(220px, 360px) auto;
  align-items: center;
  gap: 1rem;
  width: min(var(--community-page-max), 100%);
  min-height: var(--community-header-height);
  margin: 0 auto;
  padding: 0 1.25rem;
}

.community-header__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.7rem;
  color: var(--text-strong);
}

.community-header__brand-mark {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: 11px;
  background-image: linear-gradient(145deg, var(--primary-700), var(--primary-600));
  color: white;
  font-size: 1.05rem;
  font-weight: 900;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-600) 42%, transparent);
}

.community-header__brand-copy {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}

.community-header__brand-copy strong {
  font-size: 1.025rem;
  line-height: 1.15;
  letter-spacing: 0.01em;
}

.community-header__brand-copy small {
  overflow: hidden;
  max-width: 13.25rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.community-header__nav,
.community-header__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.community-header__nav-link,
.community-header__icon-button,
.community-header__avatar,
.community-header__publish,
.community-header__auth-link,
.community-header__register-link {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 650;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.community-header__nav-link {
  position: relative;
  padding: 0 0.75rem;
}

.community-header__nav-link:hover,
.community-header__icon-button:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.community-header__nav-link--active {
  background: var(--primary-50);
  color: var(--primary-700);
  font-weight: 750;
}

.community-skip-link {
  position: fixed;
  z-index: 60;
  top: 0.5rem;
  left: 0.5rem;
  transform: translateY(-150%);
  border-radius: var(--radius-control);
  background: var(--primary-700);
  padding: 0.55rem 0.8rem;
  color: white;
  font-size: 0.8125rem;
  font-weight: 800;
  transition: transform 0.15s ease;
}

.community-skip-link:focus-visible {
  transform: translateY(0);
}

.community-header__channel-trigger {
  gap: 0.2rem;
  cursor: pointer;
}

.community-header__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  max-width: 33rem;
  justify-self: center;
  width: 100%;
  height: 2.5rem;
  padding: 0 0.85rem;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-muted);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.community-header__search:focus-within {
  border-color: color-mix(in srgb, var(--primary-600) 50%, transparent);
  background: var(--surface);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-600) 16%, transparent);
}

.community-header__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-strong);
  font-size: 0.8125rem;
}

.community-header__search input::placeholder {
  color: var(--text-muted);
}

.community-header__actions {
  justify-content: flex-end;
}

.community-header__publish {
  gap: 0.35rem;
  padding: 0 1.05rem;
  border-radius: var(--radius-pill);
  background-image: linear-gradient(145deg, var(--primary-700), var(--primary-600));
  color: white;
  font-weight: 750;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-600) 34%, transparent);
}

.community-header__publish:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-600) 44%, transparent);
}

.community-header__auth-link,
.community-header__register-link {
  min-height: 40px;
  padding: 0 0.8rem;
}

.community-header__auth-link:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.community-header__register-link {
  background-image: linear-gradient(145deg, var(--primary-700), var(--primary-600));
  color: white;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-600) 30%, transparent);
}

.community-header__register-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-600) 40%, transparent);
}

.community-header__icon-button {
  position: relative;
  width: 40px;
  cursor: pointer;
}

.community-header__notification-count {
  position: absolute;
  top: -0.25rem;
  right: -0.3rem;
  min-width: 1rem;
  padding: 0 0.2rem;
  border: 1px solid white;
  border-radius: 999px;
  background: rgb(239 68 68);
  color: white;
  font-size: 0.625rem;
  font-weight: 800;
  line-height: 1rem;
}

.community-header__menu {
  position: relative;
}

.community-header__avatar {
  position: relative;
  width: 40px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: var(--surface-3);
  color: var(--text-primary);
  cursor: pointer;
  transition: box-shadow 0.18s ease;
}

.community-header__avatar:hover {
  box-shadow: 0 0 0 3px var(--primary-50);
}

.community-header__avatar-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  --user-avatar-fallback-background: transparent;
  --user-avatar-fallback-color: currentColor;
}

.community-header__dropdown {
  position: absolute;
  top: calc(100% + 0.55rem);
  z-index: 50;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.community-header__channel-menu {
  left: 0;
  width: 18rem;
  padding: 0.35rem;
}

.community-header__channel-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.65rem;
  border-radius: 6px;
  color: var(--text-primary);
}

.community-header__channel-item:hover {
  background: var(--surface-2);
}

.community-header__channel-icon {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 0.8rem;
  font-weight: 800;
}

.community-header__channel-item span:last-child {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.community-header__channel-item strong {
  color: var(--text-primary);
  font-size: 0.8125rem;
}

.community-header__channel-item small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.community-header__user-menu {
  right: 0;
  width: 14rem;
  padding: 0.35rem 0;
}

.community-header__user-summary {
  display: grid;
  gap: 0.25rem;
  padding: 0.7rem 0.85rem;
}

.community-header__user-summary strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.community-header__user-summary small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.community-header__permission-state {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem;
  margin: 0 0.55rem 0.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.6rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.community-header__permission-state--error {
  grid-template-columns: auto minmax(0, 1fr) auto;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.community-header__permission-state button {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid currentcolor;
  border-radius: 5px;
  padding: 0 0.45rem;
  color: inherit;
  font-size: 0.7rem;
  font-weight: 800;
}

.community-header__permission-state button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.community-header__menu-item {
  display: flex;
  width: 100%;
  min-height: 2.35rem;
  align-items: center;
  padding: 0.35rem 0.85rem;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 650;
  text-align: left;
}

.community-header__menu-item:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.community-header__menu-item--danger {
  color: rgb(220 38 38);
  cursor: pointer;
}

.community-header__menu-divider {
  margin: 0.35rem 0;
  border-top: 1px solid var(--surface-3);
}

.community-header__menu-group-label {
  padding: 0.25rem 0.85rem 0.15rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--text-3, var(--text-muted));
  text-transform: none;
}

.community-header__admin-tools {
  border-top: 1px solid var(--surface-3);
  margin-top: 0.35rem;
  padding-top: 0.35rem;
}

.community-header__admin-tools-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.community-header__admin-entry {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent, #10b981);
}

.community-header__admin-entry:hover {
  filter: brightness(1.1);
}

.community-header__admin-tools summary {
  min-height: 2.35rem;
  padding: 0.55rem 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 750;
}

.community-header__admin-tools summary:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.dark .community-header__menu-group-label {
  color: var(--text-muted);
}

.community-mobile-dock {
  display: none;
}

.dark .community-header {
  border-color: rgb(45 58 50);
  background: rgb(18 24 20 / 0.86);
}

.dark .community-header__brand,
.dark .community-header__nav-link--active,
.dark .community-header__search input {
  color: var(--text-strong);
}

.dark .community-header__brand-copy small,
.dark .community-header__nav-link,
.dark .community-header__icon-button,
.dark .community-header__avatar,
.dark .community-header__search,
.dark .community-header__channel-item,
.dark .community-header__menu-item,
.dark .community-header__auth-link,
.dark .community-header__admin-tools summary,
.dark .community-header__user-summary small {
  color: var(--text-muted);
}

.dark .community-header__nav-link:hover,
.dark .community-header__nav-link--active,
.dark .community-header__icon-button:hover,
.dark .community-header__channel-item:hover,
.dark .community-header__menu-item:hover {
  background: rgb(38 48 41);
  color: rgb(240 247 242);
}

.dark .community-header__permission-state--error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .community-header__search,
.dark .community-header__avatar,
.dark .community-header__dropdown {
  border-color: rgb(45 58 50);
  background: rgb(26 34 29);
}

.dark .community-header__search:focus-within {
  border-color: color-mix(in srgb, var(--primary-600) 60%, transparent);
  background: rgb(26 34 29);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-600) 20%, transparent);
}

.dark .community-header__channel-icon {
  background: rgb(54 184 141 / 0.22);
  color: rgb(166 232 207);
}

.dark .community-header__channel-item strong,
.dark .community-header__user-summary strong {
  color: var(--text-strong);
}

.dark .community-header__menu-divider {
  border-color: rgb(45 58 50);
}

.dark .community-header__admin-tools {
  border-color: rgb(45 58 50);
}

@media (max-width: 1100px) {
  .community-header__inner {
    grid-template-columns: auto minmax(180px, 1fr) auto;
  }

  .community-header__nav {
    display: none;
  }
}

@media (max-width: 720px) {
  .community-header__inner {
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: var(--community-header-height);
    gap: 0.6rem;
    padding: 0 0.9rem;
  }

  .community-header__brand-mark {
    width: 2rem;
    height: 2rem;
  }

  .community-header__brand-copy {
    display: none;
  }

  .community-header__search {
    justify-self: stretch;
    max-width: none;
    height: 2.25rem;
  }

  .community-header__search input {
    font-size: 0.75rem;
  }

  .community-header__publish,
  .community-header__auth-link,
  .community-header__register-link {
    display: none;
  }

  .community-header__actions {
    gap: 0.1rem;
  }

  .community-header__icon-button,
  .community-header__avatar {
    width: 44px;
    min-height: 44px;
  }

  .community-mobile-dock {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 45;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    min-height: 4.35rem;
    padding: 0.3rem max(0.65rem, env(safe-area-inset-right)) calc(0.3rem + env(safe-area-inset-bottom)) max(0.65rem, env(safe-area-inset-left));
    border-top: 1px solid var(--border-subtle);
    background: var(--surface);
  }

  .community-mobile-dock > a {
    display: grid;
    min-width: 0;
    min-height: 3.55rem;
    place-items: center;
    align-content: center;
    gap: 0.15rem;
    border-radius: 10px;
    color: var(--text-muted);
    font-size: 0.625rem;
    font-weight: 700;
  }

  .community-mobile-dock > a.community-mobile-dock__item--active {
    color: var(--primary-600);
    background: var(--primary-50);
  }

  .community-mobile-dock > .community-mobile-dock__publish {
    color: var(--primary-600);
  }

  .dark .community-mobile-dock {
    border-color: rgb(45 58 50);
    background: rgb(18 24 20 / 0.98);
  }

  .dark .community-mobile-dock > a {
    color: rgb(146 160 152);
  }

  .dark .community-mobile-dock > a.community-mobile-dock__item--active,
  .dark .community-mobile-dock > .community-mobile-dock__publish {
    color: rgb(166 232 207);
  }
}
</style>
