<template>
  <div :class="['app-shell', 'contribution-page', { 'admin-contribution-page': isAnalyticsOnly }]">
    <AppHeader />
    <main :class="['contribution-main', { 'community-page': !isAnalyticsOnly }]">
      <header class="page-intro">
        <div class="page-intro-copy">
          <p class="page-kicker">{{ pageModeLabel }}</p>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageDescription }}</p>
        </div>
        <nav class="page-intro-actions" aria-label="协作贡献导航">
          <RouterLink
            v-if="isPersonal"
            to="/me/collaboration"
            class="secondary-action"
          >
            返回行动中心
          </RouterLink>
          <RouterLink
            v-if="isPersonal"
            to="/me/relationships"
            class="secondary-action"
          >
            查看关系
          </RouterLink>
          <RouterLink
            v-if="isPublic"
            :to="`/u/${normalizedUid}`"
            class="secondary-action"
          >
            返回作者主页
          </RouterLink>
        </nav>
      </header>

      <div :class="['contribution-layout', { 'analytics-layout': isAnalyticsOnly }]">
        <section v-if="showContributions" class="archive-panel" data-contribution-mode="archive">
          <header class="archive-heading">
            <div>
              <p class="section-kicker">已发生的协作事实</p>
              <h2>{{ isPersonal ? '我的公开贡献' : '公开贡献记录' }}</h2>
            </div>
            <RouterLink to="/collaboration" class="text-action">浏览共建中心</RouterLink>
          </header>
          <p class="archive-intro">
            只展示已经完成、通过审核并允许公开归因的记录，作为作者参与社区共建的可读档案。
          </p>
          <PublicCollaborationContributionList :uid="normalizedUid" />
        </section>

        <section v-if="showAnalytics" class="analytics-panel-shell" data-contribution-mode="analytics">
          <header class="analytics-heading">
            <div>
              <p class="section-kicker">运营工作台</p>
              <h2>协作运营洞察</h2>
            </div>
            <span class="mode-note">服务端快照</span>
          </header>
          <p class="analytics-intro">
            查看需求漏斗、处理时长和数据新鲜度。指标口径由后台权限和服务端快照决定。
          </p>
          <CollaborationAnalyticsPanel />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
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
const isAnalyticsOnly = computed(() => props.showAnalytics && !props.showContributions)
const isPublic = computed(() => normalizedUid.value != null && !isAnalyticsOnly.value)
const isPersonal = computed(() => normalizedUid.value == null && !isAnalyticsOnly.value)
const pageModeLabel = computed(() => {
  if (isAnalyticsOnly.value) return '后台工作台 · 协作'
  return isPersonal.value ? '个人档案 · 协作' : '公开作者档案 · 协作'
})
const pageTitle = computed(() => {
  if (isAnalyticsOnly.value) return '协作运营洞察'
  return isPersonal.value ? '我的协作贡献' : '公开贡献档案'
})
const pageDescription = computed(() => {
  if (isAnalyticsOnly.value) {
    return '用服务端事实快照观察协作需求的流转、交付和维护情况。'
  }
  return isPersonal.value
    ? '整理已经完成且允许公开归因的协作事实，作为个人共建履历的一部分。'
    : '回顾已经完成且可以公开归因的协作事实，了解作者如何参与社区共建。'
})
</script>

<style scoped>
.contribution-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.contribution-main {
  width: min(var(--community-page-max), 100%);
  margin: 0 auto;
  padding-top: 1.5rem;
  padding-bottom: 4rem;
}

.page-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0 0 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.page-intro-copy {
  min-width: 0;
}

.page-kicker,
.section-kicker {
  margin: 0 0 0.3rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 850;
}

.page-intro h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0;
  text-wrap: balance;
}

.page-intro-copy > p:last-child {
  max-width: 64ch;
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.page-intro-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.contribution-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  padding-top: 1.25rem;
}

.archive-panel {
  min-width: 0;
  padding: 0.25rem 0;
}

.archive-heading,
.analytics-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.archive-heading h2,
.analytics-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.1rem;
  font-weight: 850;
}

.archive-intro,
.analytics-intro {
  max-width: 72ch;
  margin: 0.4rem 0 1rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.6;
}

.text-action {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  color: var(--primary-700);
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}

.analytics-layout {
  grid-template-columns: minmax(0, 1fr);
}

.analytics-panel-shell {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.1rem;
}

.mode-note {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  padding: 0.25rem 0.55rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
  white-space: nowrap;
}

.admin-contribution-page {
  background: var(--surface-2);
}

.admin-contribution-page .contribution-main {
  width: min(1120px, calc(100% - 2rem));
}

.admin-contribution-page .page-intro {
  padding-top: 0.25rem;
}

.admin-contribution-page .analytics-panel-shell {
  border-radius: var(--radius-surface);
}

@media (max-width: 680px) {
  .contribution-main {
    padding-top: 1rem;
  }

  .page-intro {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
  }

  .page-intro h1 {
    font-size: 1.5rem;
  }

  .page-intro-actions,
  .page-intro-actions > * {
    width: 100%;
  }

  .page-intro-actions {
    justify-content: stretch;
  }

  .archive-heading,
  .analytics-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .text-action {
    min-height: 2.75rem;
  }

  .analytics-panel-shell {
    padding: 0.85rem;
  }
}
</style>
