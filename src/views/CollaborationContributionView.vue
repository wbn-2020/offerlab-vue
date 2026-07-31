<template>
  <div class="contribution-page">
    <AppHeader />
    <main class="contribution-shell">
      <header class="page-header">
        <div>
          <p class="page-kicker">协作网络</p>
          <h1>{{ pageTitle }}</h1>
          <span>{{ pageDescription }}</span>
        </div>
      </header>

      <div class="content-grid">
        <section v-if="showContributions" class="surface-section">
          <PublicCollaborationContributionList :uid="normalizedUid" />
        </section>
        <section v-if="showAnalytics" class="surface-section">
          <CollaborationAnalyticsPanel />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationAnalyticsPanel from '@/components/collaboration/CollaborationAnalyticsPanel.vue'
import PublicCollaborationContributionList from '@/components/collaboration/PublicCollaborationContributionList.vue'
import type { ApiId } from '@/api/types'

const props = withDefaults(defineProps<{
  uid?: ApiId | null
  showContributions?: boolean
  showAnalytics?: boolean
}>(), {
  uid: null,
  showContributions: true,
  showAnalytics: false,
})

const normalizedUid = computed(() => (
  props.uid == null || String(props.uid).trim() === ''
    ? null
    : props.uid
))
const pageTitle = computed(() => (
  props.showAnalytics && !props.showContributions ? '协作运营洞察' : '公开贡献档案'
))
const pageDescription = computed(() => (
  props.showAnalytics && !props.showContributions
    ? '查看需求漏斗的服务端事实快照，保持指标口径与贡献事实分离。'
    : '回顾已经完成且可以公开归因的协作事实。'
))
</script>

<style scoped>
.contribution-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.contribution-shell {
  width: min(1120px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 4rem;
}

.page-header {
  margin-bottom: 1rem;
}

.page-kicker {
  margin: 0 0 0.2rem;
  color: var(--primary-700);
  font-size: 0.75rem;
  font-weight: 800;
}

.page-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.55rem;
  font-weight: 900;
  text-wrap: balance;
}

.page-header span {
  display: block;
  max-width: 72ch;
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.6;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.35fr);
  align-items: start;
  gap: 1rem;
}

.surface-section {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1rem;
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .contribution-shell {
    width: min(100% - 1.5rem, 1120px);
    padding-top: 1rem;
  }

  .surface-section {
    padding: 0.8rem;
  }
}
</style>
