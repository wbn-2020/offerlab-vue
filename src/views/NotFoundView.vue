<template>
  <div class="app-shell status-page">
    <AppHeader />
    <main class="community-page status-main">
      <section class="status-surface">
        <div class="status-code">404 Not Found</div>
        <h1>这个页面不存在</h1>
        <p>链接可能已经失效、内容已被移除，或者地址输入有误。可以返回社区首页，也可以从发现页继续浏览公开内容。</p>
        <div class="status-actions">
          <router-link to="/" class="primary-action">返回首页</router-link>
          <router-link to="/explore" class="secondary-action">去发现</router-link>
          <router-link to="/search" class="secondary-action">搜索内容</router-link>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
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
  width: min(40rem, 100%);
  margin: 0 auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 2rem;
}

.status-code {
  color: var(--primary-600);
  font-size: 0.8125rem;
  font-weight: 800;
}

.status-surface h1 {
  margin: 0.4rem 0 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 900;
}

.status-surface p {
  max-width: 62ch;
  margin: 0.75rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
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
}
</style>
