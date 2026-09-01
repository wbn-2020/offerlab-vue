<template>
  <div class="app-shell action-center-page">
    <AppHeader />
    <main class="community-page action-center-shell">
      <nav class="workspace-tabs" aria-label="个人协作工作台">
        <RouterLink to="/me/collaboration" class="workspace-tab is-active" aria-current="page">
          <ListChecks class="tab-icon" />
          协作行动
        </RouterLink>
        <RouterLink to="/me/relationships" class="workspace-tab">
          <UsersRound class="tab-icon" />
          关系订阅
        </RouterLink>
        <RouterLink to="/me/maintenance" class="workspace-tab">
          <Wrench class="tab-icon" />
          维护任务
        </RouterLink>
      </nav>

      <header class="action-workspace-header">
        <div>
          <p class="workspace-kicker">我的协作</p>
          <h1>协作行动中心</h1>
          <p>先处理服务端确认的待办，再进入个人工作区跟进投稿、策展、预约、管理和权益事项。</p>
        </div>
        <RouterLink to="/collaboration?tab=needs" class="public-hub-link">
          <Compass class="tab-icon" aria-hidden="true" />
          浏览公共共建
          <ArrowRight class="tab-icon" aria-hidden="true" />
        </RouterLink>
      </header>

      <section class="workspace-directory" aria-labelledby="collaboration-workspace-directory-title">
        <div class="directory-heading">
          <h2 id="collaboration-workspace-directory-title">个人工作区</h2>
          <p>公共资源浏览与个人管理分开呈现，避免在同一组标签中混杂不同任务。</p>
        </div>
        <div class="directory-groups">
          <section aria-labelledby="participation-workspaces-title">
            <h3 id="participation-workspaces-title">参与与跟进</h3>
            <nav class="directory-links" aria-label="参与与跟进工作区">
              <RouterLink to="/me/collaboration/needs/new">
                <Plus class="directory-icon" aria-hidden="true" />
                <span><strong>发起内容需求</strong><small>明确目标、交付形式与验收条件</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
              <RouterLink to="/me/collaboration/series/submit">
                <Send class="directory-icon" aria-hidden="true" />
                <span><strong>提交合集内容</strong><small>把本人公开内容投到已加入的合集</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
              <RouterLink to="/me/collaboration/activities/submit">
                <Upload class="directory-icon" aria-hidden="true" />
                <span><strong>参与共创活动</strong><small>向开放活动提交本人公开内容</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
              <RouterLink to="/collaboration?tab=my-collaborations">
                <Hand class="directory-icon" aria-hidden="true" />
                <span><strong>我的共建</strong><small>认领、投稿与反馈记录</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
              <RouterLink to="/collaboration?tab=curation">
                <ListPlus class="directory-icon" aria-hidden="true" />
                <span><strong>频道策展</strong><small>提交建议并跟进审核</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
              <RouterLink to="/collaboration?tab=office-hours">
                <CalendarClock class="directory-icon" aria-hidden="true" />
                <span><strong>经验交流</strong><small>预约、评审与后续确认</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
            </nav>
          </section>
          <section aria-labelledby="management-workspaces-title">
            <h3 id="management-workspaces-title">管理与权益</h3>
            <nav class="directory-links" aria-label="管理与权益工作区">
              <RouterLink to="/collaboration?tab=manage">
                <Settings2 class="directory-icon" aria-hidden="true" />
                <span><strong>我的管理</strong><small>负责资源与协作流程</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
              <RouterLink to="/collaboration?tab=cases">
                <ShieldAlert class="directory-icon" aria-hidden="true" />
                <span><strong>报告与申诉</strong><small>处理进度、说明与申诉</small></span>
                <ArrowRight class="directory-arrow" aria-hidden="true" />
              </RouterLink>
            </nav>
          </section>
        </div>
      </section>

      <div class="collaboration-action-center">
        <CollaborationActionCenter />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  CalendarClock,
  Compass,
  Hand,
  ListChecks,
  ListPlus,
  Plus,
  Send,
  Settings2,
  ShieldAlert,
  Upload,
  UsersRound,
  Wrench,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationActionCenter from '@/components/collaboration/CollaborationActionCenter.vue'
</script>

<style scoped>
.action-center-page {
  background: var(--surface-2);
}

.action-center-shell {
  padding-top: 1rem;
  padding-bottom: 4rem;
}

.workspace-tabs {
  display: flex;
  min-width: 0;
  gap: 1.25rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
  scrollbar-width: none;
}

.workspace-tabs::-webkit-scrollbar {
  display: none;
}

.workspace-tab {
  display: inline-flex;
  min-height: 2.75rem;
  flex: none;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 750;
}

.workspace-tab:hover,
.workspace-tab.is-active {
  border-bottom-color: var(--primary-600);
  color: var(--primary-700);
}

.tab-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.action-workspace-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 2rem 0 1.5rem;
}

.workspace-kicker {
  margin: 0 0 0.25rem;
  color: var(--primary-700);
  font-size: 0.75rem;
  font-weight: 800;
}

.action-workspace-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.75rem;
  font-weight: 850;
  letter-spacing: 0;
  text-wrap: balance;
}

.action-workspace-header p:last-child {
  max-width: 68ch;
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.public-hub-link {
  display: inline-flex;
  min-height: 2.75rem;
  flex: none;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0.65rem 0.8rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 750;
}

.public-hub-link:hover {
  border-color: var(--primary-500);
  background: var(--primary-50);
  color: var(--primary-700);
}

.workspace-directory {
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  padding: 1.25rem 0;
}

.directory-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.directory-heading h2,
.directory-groups h3 {
  margin: 0;
  color: var(--text-primary);
  letter-spacing: 0;
}

.directory-heading h2 {
  font-size: 1rem;
  font-weight: 820;
}

.directory-heading p {
  max-width: 56ch;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
  text-align: right;
}

.directory-groups {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(15rem, 2fr);
  gap: 1.5rem;
  margin-top: 1rem;
}

.directory-groups h3 {
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.directory-links {
  display: grid;
  gap: 0.35rem;
}

.directory-links a {
  display: grid;
  min-height: 3.5rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  border-radius: var(--radius-control);
  background: var(--surface);
  padding: 0.65rem 0.75rem;
  color: var(--text-primary);
}

.directory-links a:hover {
  background: var(--surface-3);
  color: var(--primary-700);
}

.directory-links span {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.directory-links strong {
  font-size: 0.8125rem;
  line-height: 1.3;
}

.directory-links small {
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.35;
}

.directory-icon,
.directory-arrow {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.directory-icon {
  color: var(--primary-600);
}

.directory-arrow {
  color: var(--text-muted);
}

.dark .public-hub-link:hover,
.dark .directory-links a:hover {
  background: var(--surface-3);
}

.dark .workspace-kicker,
.dark .directory-icon {
  color: #7cc3a5;
}

.collaboration-action-center {
  min-width: 0;
  padding-top: 1.25rem;
}

.collaboration-action-center :deep(.action-center-header) {
  justify-content: flex-end;
  padding: 0 0 0.75rem;
  border-bottom: 0;
}

.collaboration-action-center :deep(.title-block) {
  display: none;
}

.collaboration-action-center :deep(.title-mark) {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid color-mix(in srgb, var(--primary-600) 16%, var(--border-subtle));
  border-radius: var(--radius-control);
}

.collaboration-action-center :deep(.title-block h1) {
  font-size: 1.75rem;
  font-weight: 850;
}

.collaboration-action-center :deep(.title-block p:last-child) {
  max-width: 68ch;
  font-size: 0.875rem;
}

.collaboration-action-center :deep(.refresh-button),
.collaboration-action-center :deep(.primary-action),
.collaboration-action-center :deep(.secondary-action),
.collaboration-action-center :deep(.clear-filter),
.collaboration-action-center :deep(.load-more) {
  min-height: 2.75rem;
}

.collaboration-action-center :deep(.action-center-surface) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16.5rem;
  grid-template-areas: "list summary";
  align-items: start;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.collaboration-action-center :deep(.action-center-links) {
  display: none;
}

.collaboration-action-center :deep(.action-center-links a) {
  min-height: 2.35rem;
  border-color: transparent;
  background: var(--surface-2);
  color: var(--text-primary);
}

.collaboration-action-center :deep(.action-summary) {
  grid-area: summary;
  margin-left: 1.25rem;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 0;
  padding: 1rem 0 0;
}

.collaboration-action-center :deep(.summary-heading) {
  align-items: flex-start;
  flex-direction: column;
  gap: 0.25rem;
}

.collaboration-action-center :deep(.summary-heading h2) {
  font-size: 1rem;
}

.collaboration-action-center :deep(.summary-grid) {
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  margin-top: 0.75rem;
}

.collaboration-action-center :deep(.summary-tile),
.collaboration-action-center :deep(.summary-skeleton) {
  min-height: 3.25rem;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  padding: 0.65rem 0;
}

.collaboration-action-center :deep(.summary-tile) {
  align-items: center;
  flex-direction: row;
}

.collaboration-action-center :deep(.summary-tile:hover),
.collaboration-action-center :deep(.summary-tile-active) {
  background: transparent;
  color: var(--primary-700);
}

.collaboration-action-center :deep(.summary-tile strong) {
  font-size: 1rem;
}

.collaboration-action-center :deep(.summary-state) {
  align-items: flex-start;
  min-height: 0;
  margin-top: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0.8rem;
}

.collaboration-action-center :deep(.action-list) {
  grid-area: list;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 0;
}

.collaboration-action-center :deep(.list-heading) {
  margin: 0;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.collaboration-action-center :deep(.action-items) {
  border-top: 0;
}

.collaboration-action-center :deep(.action-item) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 7.5rem;
  gap: 1rem;
  margin: 0;
  padding: 1rem 1.1rem;
}

.collaboration-action-center :deep(.action-item-topline time) {
  margin-left: 0;
}

.collaboration-action-center :deep(.action-item .primary-action),
.collaboration-action-center :deep(.action-item .secondary-action) {
  width: 100%;
}

.collaboration-action-center :deep(.list-state),
.collaboration-action-center :deep(.list-loading) {
  margin: 1rem 1.1rem;
}

.collaboration-action-center :deep(.list-state) {
  min-height: 12rem;
}

.collaboration-action-center :deep(.load-more),
.collaboration-action-center :deep(.loading-more),
.collaboration-action-center :deep(.load-more-error) {
  margin: 1rem 1.1rem;
  width: calc(100% - 2.2rem);
}

@media (max-width: 860px) {
  .directory-groups {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  .collaboration-action-center :deep(.action-center-surface) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "summary"
      "list";
  }

  .collaboration-action-center :deep(.action-summary) {
    margin: 0 0 1.25rem;
    padding-top: 0;
    border-top: 0;
  }

  .collaboration-action-center :deep(.summary-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .collaboration-action-center :deep(.summary-tile),
  .collaboration-action-center :deep(.summary-skeleton) {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-control);
    padding: 0.7rem;
  }
}

@media (max-width: 560px) {
  .action-center-shell {
    padding-top: 1rem;
  }

  .workspace-tabs {
    margin-right: calc(var(--community-page-gutter) * -1);
    margin-left: calc(var(--community-page-gutter) * -1);
    padding-right: var(--community-page-gutter);
    padding-left: var(--community-page-gutter);
  }

  .action-workspace-header {
    align-items: stretch;
    flex-direction: column;
    padding-top: 1.5rem;
  }

  .action-workspace-header h1 {
    font-size: 1.45rem;
  }

  .public-hub-link {
    justify-content: center;
  }

  .directory-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }

  .directory-heading p {
    text-align: left;
  }

  .collaboration-action-center :deep(.action-center-header) {
    align-items: stretch;
  }

  .collaboration-action-center :deep(.title-block h1) {
    font-size: 1.45rem;
  }

  .collaboration-action-center :deep(.action-center-links) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .collaboration-action-center :deep(.action-center-links a) {
    justify-content: center;
    text-align: center;
  }

  .collaboration-action-center :deep(.summary-grid) {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    margin-right: calc(var(--community-page-gutter) * -1);
    padding-right: var(--community-page-gutter);
    scrollbar-width: none;
  }

  .collaboration-action-center :deep(.summary-grid::-webkit-scrollbar) {
    display: none;
  }

  .collaboration-action-center :deep(.summary-tile),
  .collaboration-action-center :deep(.summary-skeleton) {
    width: 8.75rem;
    flex: none;
  }

  .collaboration-action-center :deep(.action-item) {
    grid-template-columns: minmax(0, 1fr);
  }

  .collaboration-action-center :deep(.list-state-error .secondary-action) {
    margin-left: 0;
  }
}
</style>
