<template>
  <header class="community-header">
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
          v-for="item in navItems.slice(0, 3)"
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
            type="button"
            class="community-header__nav-link community-header__channel-trigger"
            :aria-expanded="showDomainMenu"
            @click="showDomainMenu = !showDomainMenu"
          >
            频道
            <ChevronDown class="h-3.5 w-3.5" />
          </button>
          <div v-if="showDomainMenu" class="community-header__dropdown community-header__channel-menu">
            <RouterLink
              to="/"
              class="community-header__channel-item"
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

        <div class="community-header__menu" data-user-menu>
          <button
            type="button"
            class="community-header__avatar"
            :aria-expanded="showUserMenu"
            aria-label="用户菜单"
            @click.stop="showUserMenu = !showUserMenu"
          >
            <UserAvatar
              v-if="authStore.isLoggedIn"
              class="community-header__avatar-image"
              :src="authStore.user?.avatar"
              :name="authStore.user?.nickname"
              alt=""
              fallback="我"
            />
            <User v-else class="h-[18px] w-[18px]" />
          </button>
          <div
            v-if="showUserMenu"
            class="community-header__dropdown community-header__user-menu"
            :data-permission-state="permissionViewState"
          >
            <template v-if="authStore.isLoggedIn">
              <div class="community-header__user-summary">
                <strong>{{ authStore.user?.nickname || `${siteBrand.shortName}用户` }}</strong>
                <small>{{ userMenuSignature }}</small>
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
              <div class="community-header__menu-divider" />
              <p class="community-header__menu-group-label">个人空间</p>
              <RouterLink to="/me" class="community-header__menu-item" @click="showUserMenu = false">我的主页</RouterLink>
              <RouterLink to="/me/relationships" class="community-header__menu-item" @click="showUserMenu = false">关系与订阅中心</RouterLink>
              <RouterLink to="/me/collaboration" class="community-header__menu-item" @click="showUserMenu = false">协作行动中心</RouterLink>
              <RouterLink to="/me/governance-todos" class="community-header__menu-item" @click="showUserMenu = false">我的治理待办</RouterLink>
              <RouterLink to="/me/notifications" class="community-header__menu-item" @click="showUserMenu = false">通知中心</RouterLink>
              <RouterLink to="/series/workbench" class="community-header__menu-item" @click="showUserMenu = false">内容合集</RouterLink>
              <div class="community-header__menu-divider" />
              <p class="community-header__menu-group-label">创作与成长</p>
              <RouterLink to="/growth/profile" class="community-header__menu-item" @click="showUserMenu = false">作者数据</RouterLink>
              <RouterLink to="/growth/report" class="community-header__menu-item" @click="showUserMenu = false">历史报告</RouterLink>
              <RouterLink to="/growth/community" class="community-header__menu-item" @click="showUserMenu = false">社区成长</RouterLink>
              <RouterLink to="/me/knowledge" class="community-header__menu-item" @click="showUserMenu = false">知识维护</RouterLink>
              <RouterLink to="/knowledge/explore" class="community-header__menu-item" @click="showUserMenu = false">知识探索</RouterLink>
              <RouterLink to="/certification/apply" class="community-header__menu-item" @click="showUserMenu = false">认证作者申请</RouterLink>
              <div class="community-header__menu-divider" />
              <RouterLink to="/me/settings" class="community-header__menu-item" @click="showUserMenu = false">设置</RouterLink>
              <div v-if="adminLinks.length" class="community-header__menu-divider" />
              <p v-if="adminLinks.length" class="community-header__menu-group-label">管理后台</p>
              <RouterLink
                v-for="item in adminLinks"
                :key="item.to"
                :to="item.to"
                class="community-header__menu-item"
                @click="showUserMenu = false"
              >
                {{ item.label }}
              </RouterLink>
              <div class="community-header__menu-divider" />
              <button type="button" class="community-header__menu-item community-header__menu-item--danger" @click="handleLogout">
                退出登录
              </button>
            </template>
            <template v-else>
              <RouterLink to="/login" class="community-header__menu-item" @click="showUserMenu = false">登录</RouterLink>
              <RouterLink to="/register" class="community-header__menu-item" @click="showUserMenu = false">注册</RouterLink>
            </template>
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
      <RouterLink to="/collaboration" :class="{ 'community-mobile-dock__item--active': isNavActive('/collaboration') }">
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
  { to: '/collaboration', label: '共建', icon: HeartHandshake },
  { to: '/editor', label: '发布', icon: PenLine },
]

const isNavActive = (target: string) => (
  target === '/'
    ? route.path === '/'
    : route.path === target || route.path.startsWith(`${target}/`)
)

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

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target?.closest('[data-user-menu]')) showUserMenu.value = false
  if (!target?.closest('.community-header__channel-trigger') && !target?.closest('.community-header__channel-menu')) {
    showDomainMenu.value = false
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
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
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
  background: var(--surface);
}

.community-header__inner {
  display: grid;
  grid-template-columns: auto auto minmax(180px, 1fr) auto;
  align-items: center;
  gap: 1.15rem;
  width: min(1320px, 100%);
  min-height: 68px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
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
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border-radius: 8px;
  background: var(--primary-600);
  color: white;
  font-size: 1rem;
  font-weight: 900;
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
.community-header__publish {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 650;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.community-header__nav-link {
  position: relative;
  padding: 0 0.65rem;
}

.community-header__nav-link:hover,
.community-header__icon-button:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.community-header__nav-link--active {
  color: var(--primary-600);
  font-weight: 750;
}

.community-header__nav-link--active::after {
  position: absolute;
  right: 0.65rem;
  bottom: 0.15rem;
  left: 0.65rem;
  height: 2px;
  border-radius: 999px;
  background: var(--primary-600);
  content: "";
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
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-muted);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.community-header__search:focus-within {
  border-color: rgb(147 197 253);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgb(219 234 254 / 0.82);
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
  color: #98a2b3;
}

.community-header__actions {
  justify-content: flex-end;
}

.community-header__publish {
  gap: 0.35rem;
  padding: 0 0.85rem;
  background: var(--primary-600);
  color: white;
  font-weight: 750;
}

.community-header__publish:hover {
  background: var(--primary-700);
  transform: translateY(-1px);
}

.community-header__icon-button {
  position: relative;
  width: 44px;
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
  width: 44px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: var(--surface-3);
  color: var(--text-primary);
  cursor: pointer;
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
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 4px 8px rgb(16 24 40 / 0.08);
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
  border-radius: 6px;
  background: var(--primary-50);
  color: var(--primary-600);
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
  color: var(--text-3, rgb(148 163 184));
  text-transform: none;
}

.dark .community-header__menu-group-label {
  color: rgb(100 116 139);
}

.community-mobile-dock {
  display: none;
}

.dark .community-header {
  border-color: rgb(39 39 42);
  background: rgb(15 17 21);
}

.dark .community-header__brand,
.dark .community-header__nav-link--active,
.dark .community-header__search input {
  color: rgb(248 250 252);
}

.dark .community-header__brand-copy small,
.dark .community-header__nav-link,
.dark .community-header__icon-button,
.dark .community-header__avatar,
.dark .community-header__search,
.dark .community-header__channel-item,
.dark .community-header__menu-item,
.dark .community-header__user-summary small {
  color: rgb(203 213 225);
}

.dark .community-header__nav-link:hover,
.dark .community-header__nav-link--active,
.dark .community-header__icon-button:hover,
.dark .community-header__channel-item:hover,
.dark .community-header__menu-item:hover {
  background: rgb(39 39 42);
  color: white;
}

.dark .community-header__permission-state--error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .community-header__search,
.dark .community-header__avatar,
.dark .community-header__dropdown {
  border-color: rgb(63 63 70);
  background: rgb(24 26 32);
}

.dark .community-header__search:focus-within {
  border-color: rgb(59 130 246);
  background: rgb(24 26 32);
  box-shadow: 0 0 0 3px rgb(30 58 138 / 0.48);
}

.dark .community-header__channel-icon {
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
}

.dark .community-header__channel-item strong,
.dark .community-header__user-summary strong {
  color: rgb(248 250 252);
}

.dark .community-header__menu-divider {
  border-color: rgb(63 63 70);
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
    min-height: 58px;
    gap: 0.6rem;
    padding: 0.6rem 0.9rem;
  }

  .community-header__brand-mark {
    width: 1.8rem;
    height: 1.8rem;
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
  .community-header__theme-button {
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
    grid-template-columns: repeat(5, minmax(0, 1fr));
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
    border-radius: var(--radius-control);
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
    border-color: rgb(63 63 70);
    background: rgb(15 17 21 / 0.99);
  }

  .dark .community-mobile-dock > a {
    color: rgb(161 161 170);
  }

  .dark .community-mobile-dock > a.community-mobile-dock__item--active,
  .dark .community-mobile-dock > .community-mobile-dock__publish {
    color: rgb(147 197 253);
  }
}
</style>
