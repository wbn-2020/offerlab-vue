<template>
  <div v-if="collaboration" class="collaboration-route-shell" aria-busy="true" aria-label="公共共建页面加载中">
    <AppHeader />
    <main class="collaboration-route-main">
      <header class="collaboration-route-header">
        <span class="collaboration-route-mark" aria-hidden="true">
          <Users class="h-6 w-6" />
        </span>
        <div>
          <p>闻野 / 公共共建</p>
          <h1>公共共建中心</h1>
          <span>正在准备公开需求、合集、活动和讨论。</span>
        </div>
      </header>

      <nav class="collaboration-route-tabs" aria-label="公共共建浏览">
        <span v-for="tab in tabs" :key="tab.label" :class="{ active: tab.active }">
          <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
          {{ tab.label }}
        </span>
      </nav>

      <section class="collaboration-route-content" aria-label="共建内容加载中">
        <div class="collaboration-route-toolbar">
          <div>
            <i />
            <b />
          </div>
          <span />
        </div>
        <div v-for="index in 4" :key="index" class="collaboration-route-row">
          <i />
          <b />
          <span />
        </div>
      </section>
    </main>
  </div>

  <main v-else class="route-loading-generic" aria-live="polite">
    <div>
      <Loader2 class="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400" aria-hidden="true" />
      <span>{{ loadingMessage }}</span>
      <button v-if="showRetry" type="button" @click="reloadPage">重新加载</button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { CalendarDays, Layers3, Loader2, Scale, Target, Users } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'

defineProps<{
  collaboration?: boolean
}>()

const tabs = [
  { label: '需求', icon: Target, active: true },
  { label: '合集', icon: Layers3, active: false },
  { label: '活动', icon: CalendarDays, active: false },
  { label: '讨论', icon: Scale, active: false },
]

const loadingMessage = ref('正在加载页面')
const showRetry = ref(false)
const slowTimer = window.setTimeout(() => {
  loadingMessage.value = '页面加载时间比预期更长'
}, 3_000)
const retryTimer = window.setTimeout(() => {
  loadingMessage.value = '页面资源仍未完成加载，可以重新尝试'
  showRetry.value = true
}, 8_000)

const reloadPage = () => window.location.reload()

onBeforeUnmount(() => {
  window.clearTimeout(slowTimer)
  window.clearTimeout(retryTimer)
})
</script>

<style scoped>
.collaboration-route-shell {
  min-height: 100vh;
  background: var(--surface-soft);
  color: var(--text-strong);
}

.collaboration-route-main {
  width: min(80rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 3rem;
}

.collaboration-route-header {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

.collaboration-route-mark {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
  flex: 0 0 3rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(26 127 90);
  color: white;
}

.collaboration-route-header p,
.collaboration-route-header h1,
.collaboration-route-header span {
  margin: 0;
}

.collaboration-route-header p {
  color: rgb(26 127 90);
  font-size: 0.75rem;
  font-weight: 800;
}

.collaboration-route-header h1 {
  margin-top: 0.15rem;
  font-size: 1.65rem;
  line-height: 1.2;
}

.collaboration-route-header span {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.collaboration-route-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
  margin-top: 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.collaboration-route-tabs span {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 800;
}

.collaboration-route-tabs .active {
  border-bottom: 2px solid rgb(26 127 90);
  color: rgb(18 99 74);
}

.collaboration-route-content {
  margin-top: 1.25rem;
}

.collaboration-route-toolbar {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
}

.collaboration-route-toolbar div {
  display: grid;
  gap: 0.45rem;
}

.collaboration-route-toolbar i,
.collaboration-route-toolbar b,
.collaboration-route-toolbar span,
.collaboration-route-row i,
.collaboration-route-row b,
.collaboration-route-row span {
  display: block;
  border-radius: 0.25rem;
  background: var(--surface-2);
  animation: route-shell-pulse 1.4s ease-in-out infinite;
}

.collaboration-route-toolbar i {
  width: 8rem;
  height: 0.8rem;
}

.collaboration-route-toolbar b {
  width: 5rem;
  height: 0.65rem;
}

.collaboration-route-toolbar span {
  width: 2.5rem;
  height: 2.5rem;
}

.collaboration-route-row {
  display: grid;
  gap: 0.65rem;
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.collaboration-route-row i {
  width: min(14rem, 55%);
  height: 0.8rem;
}

.collaboration-route-row b {
  width: 100%;
  height: 0.7rem;
}

.collaboration-route-row span {
  width: min(22rem, 75%);
  height: 0.7rem;
}

.route-loading-generic {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: var(--surface-soft);
  padding: 1.5rem;
  color: var(--text-primary);
}

.route-loading-generic > div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.route-loading-generic button {
  min-height: 2.25rem;
  border-radius: 0.4rem;
  background: rgb(26 127 90);
  padding: 0.45rem 0.75rem;
  color: white;
  font-size: 0.8rem;
  font-weight: 800;
}

.route-loading-generic button:focus-visible {
  outline: 3px solid rgb(124 195 165);
  outline-offset: 2px;
}

@keyframes route-shell-pulse {
  0%,
  100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@media (max-width: 640px) {
  .collaboration-route-main {
    width: min(100% - 1.25rem, 80rem);
    padding-top: 1rem;
  }

  .collaboration-route-header h1 {
    font-size: 1.35rem;
  }

  .collaboration-route-header span {
    font-size: 0.8rem;
  }

  .collaboration-route-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.dark .collaboration-route-shell,
.dark .route-loading-generic {
  background: var(--surface-1);
  color: var(--text-strong);
}

.dark .collaboration-route-header span,
.dark .collaboration-route-tabs span {
  color: var(--text-muted);
}

.dark .collaboration-route-tabs,
.dark .collaboration-route-toolbar,
.dark .collaboration-route-row {
  border-color: var(--border-subtle);
}

.dark .collaboration-route-toolbar i,
.dark .collaboration-route-toolbar b,
.dark .collaboration-route-toolbar span,
.dark .collaboration-route-row i,
.dark .collaboration-route-row b,
.dark .collaboration-route-row span {
  background: var(--surface-2);
}

.dark .route-loading-generic > div {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}
</style>
