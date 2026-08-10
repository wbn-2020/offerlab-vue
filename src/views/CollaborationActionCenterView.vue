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

      <div class="collaboration-action-center">
        <CollaborationActionCenter />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ListChecks, UsersRound, Wrench } from 'lucide-vue-next'
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

.collaboration-action-center {
  min-width: 0;
  padding-top: 1.25rem;
}

.collaboration-action-center :deep(.action-center-header) {
  align-items: flex-end;
  padding: 0 0 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.collaboration-action-center :deep(.title-block) {
  gap: 0.75rem;
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
  grid-template-areas:
    "links links"
    "list summary";
  align-items: start;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.collaboration-action-center :deep(.action-center-links) {
  grid-area: links;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 0.65rem;
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
  .collaboration-action-center :deep(.action-center-surface) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "links"
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
