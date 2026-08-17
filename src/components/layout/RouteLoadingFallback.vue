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

  <main v-else class="route-loading-generic">
    <div>
      <Loader2 class="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400" aria-hidden="true" />
      <span>正在加载页面</span>
    </div>
  </main>
</template>

<script setup lang="ts">
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
</script>

<style scoped>
.collaboration-route-shell {
  min-height: 100vh;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
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
  background: rgb(37 99 235);
  color: white;
}

.collaboration-route-header p,
.collaboration-route-header h1,
.collaboration-route-header span {
  margin: 0;
}

.collaboration-route-header p {
  color: rgb(37 99 235);
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
  color: rgb(71 85 105);
  font-size: 0.875rem;
}

.collaboration-route-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
  margin-top: 1.5rem;
  border-bottom: 1px solid rgb(226 232 240);
}

.collaboration-route-tabs span {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
  font-weight: 800;
}

.collaboration-route-tabs .active {
  border-bottom: 2px solid rgb(37 99 235);
  color: rgb(29 78 216);
}

.collaboration-route-content {
  margin-top: 1.25rem;
}

.collaboration-route-toolbar {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgb(226 232 240);
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
  background: rgb(226 232 240);
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
  border-bottom: 1px solid rgb(226 232 240);
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
  background: rgb(248 250 252);
  padding: 1.5rem;
  color: rgb(51 65 85);
}

.route-loading-generic > div {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: white;
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 700;
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
  background: rgb(2 6 23);
  color: rgb(241 245 249);
}

.dark .collaboration-route-header span,
.dark .collaboration-route-tabs span {
  color: rgb(148 163 184);
}

.dark .collaboration-route-tabs,
.dark .collaboration-route-toolbar,
.dark .collaboration-route-row {
  border-color: rgb(30 41 59);
}

.dark .collaboration-route-toolbar i,
.dark .collaboration-route-toolbar b,
.dark .collaboration-route-toolbar span,
.dark .collaboration-route-row i,
.dark .collaboration-route-row b,
.dark .collaboration-route-row span {
  background: rgb(51 65 85);
}

.dark .route-loading-generic > div {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}
</style>
