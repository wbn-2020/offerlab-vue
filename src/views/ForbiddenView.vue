<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto flex min-h-[calc(100vh-76px)] max-w-5xl items-center px-4 py-10">
      <section class="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-sm font-semibold text-amber-600 dark:text-amber-400">403 Forbidden</p>
        <h1 class="mt-3 text-3xl font-bold text-slate-950 dark:text-slate-50">当前账号没有访问权限</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          这个入口需要 {{ roleText }}。如果你刚刚被授予角色，请稍后刷新；如果仍然无法访问，请让系统管理员检查 RBAC 配置。
        </p>

        <div class="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-950 sm:grid-cols-2">
          <div>
            <span class="block text-xs font-bold uppercase tracking-wide text-slate-400">访问路径</span>
            <strong class="mt-1 block break-all font-mono text-slate-800 dark:text-slate-100">{{ fromPath }}</strong>
          </div>
          <div>
            <span class="block text-xs font-bold uppercase tracking-wide text-slate-400">需要角色</span>
            <strong class="mt-1 block text-slate-800 dark:text-slate-100">{{ roleText }}</strong>
          </div>
        </div>

        <div class="mt-7 flex flex-wrap gap-3">
          <RouterLink to="/" class="primary-button">返回首页</RouterLink>
          <RouterLink to="/me" class="secondary-button">查看我的主页</RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const fromPath = computed(() => String(route.query.from || '/admin'))
const roleText = computed(() => String(route.query.role || '对应的管理角色'))
</script>

<style scoped>
.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
}

.primary-button {
  background: rgb(37 99 235);
  color: white;
}

.secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

:global(.dark) .secondary-button {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}
</style>
