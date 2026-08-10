<template>
  <div class="app-shell status-page">
    <AppHeader />
    <main class="community-page status-main">
      <section class="status-surface">
        <div class="status-code">{{ statusLabel }}</div>
        <h1>{{ pageTitle }}</h1>
        <p class="status-copy">
          {{ pageText }}
        </p>

        <dl class="status-facts">
          <div>
            <dt>访问路径</dt>
            <dd class="break-all font-mono">{{ fromPath }}</dd>
          </div>
          <div>
            <dt>需要角色</dt>
            <dd>{{ roleText }}</dd>
          </div>
        </dl>

        <div class="status-actions">
          <RouterLink :to="fromPath" class="primary-action">{{ permissionUnavailable ? '重试权限检查' : '返回来源页' }}</RouterLink>
          <RouterLink to="/" class="secondary-action">返回首页</RouterLink>
          <RouterLink v-if="!authStore.isLoggedIn" :to="{ path: '/login', query: { redirect: fromPath } }" class="secondary-action">去登录</RouterLink>
          <RouterLink v-else :to="{ path: '/login', query: { redirect: fromPath, switchAccount: '1' } }" class="secondary-action">切换账号</RouterLink>
          <RouterLink v-if="authStore.isLoggedIn" :to="adminRecoveryPath" class="secondary-action">去可访问后台</RouterLink>
          <RouterLink v-if="authStore.isLoggedIn" to="/me" class="secondary-action">查看我的主页</RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/utils/navigation'

const route = useRoute()
const authStore = useAuthStore()
const fromPath = computed(() => safeRedirect(route.query.from, '/admin'))
const roleText = computed(() => String(route.query.role || '对应的管理角色'))
const permissionUnavailable = computed(() => (
  route.query.reason === 'permission_unavailable'
  || route.query.reason === 'permission_check_failed'
))
const permissionDenied = computed(() => route.query.reason === 'permission_denied')
const statusLabel = computed(() => permissionUnavailable.value ? '权限状态不可用' : '403 Forbidden')
const adminRecoveryPath = computed(() => {
  const source = fromPath.value
  if (source.startsWith('/admin/questions')) return '/admin/questions'
  if (source.startsWith('/admin/company-aliases')) return '/admin/company-aliases'
  if (source.startsWith('/admin/governance') || source.startsWith('/admin/tags')) return '/admin/governance'
  return '/admin/ops'
})
const pageTitle = computed(() => {
  if (permissionUnavailable.value) return '权限服务暂时无法确认当前权限'
  if (permissionDenied.value) return '当前账号没有访问权限'
  return authStore.isLoggedIn ? '当前账号没有访问权限' : '请先登录或切换到有权限的账号'
})
const pageText = computed(() => authStore.isLoggedIn
  ? permissionUnavailable.value
    ? '刚才权限服务没有返回可信结果，这不代表当前账号没有权限。你可以重试权限检查，或切换账号重新登录。'
    : `这个入口需要 ${roleText.value}。如果你刚刚被授予角色，请稍后刷新；如果仍然无法访问，请让系统管理员检查 RBAC 配置。`
  : `这个入口需要 ${roleText.value}。登录后如果仍然看到此页面，说明当前账号缺少对应角色。`)
</script>

<style scoped>
.status-page {
  background: var(--surface-2);
}

.status-main {
  display: flex;
  min-height: calc(100dvh - var(--community-header-height));
  align-items: center;
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.status-surface {
  width: min(46rem, 100%);
  margin: 0 auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 2rem;
}

.status-code {
  color: var(--warning);
  font-size: 0.8125rem;
  font-weight: 800;
}

.status-surface h1 {
  margin: 0.4rem 0 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 900;
  text-wrap: balance;
}

.status-copy {
  max-width: 68ch;
  margin: 0.75rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
}

.status-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 1.5rem 0 0;
  border-top: 1px solid var(--border-subtle);
  border-left: 1px solid var(--border-subtle);
}

.status-facts > div {
  padding: 0.9rem 1rem;
  border-right: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.status-facts dt {
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 750;
}

.status-facts dd {
  margin: 0.25rem 0 0;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 750;
}

.status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.5rem;
}

@media (max-width: 640px) {
  .status-main {
    align-items: flex-start;
    padding-top: 1rem;
  }

  .status-surface {
    padding: 1.25rem 1rem;
  }

  .status-surface h1 {
    font-size: 1.4rem;
  }

  .status-facts {
    grid-template-columns: 1fr;
  }
}
</style>
