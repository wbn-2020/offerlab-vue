<template>
  <div class="legacy-page">
    <AppHeader />

    <main class="community-page legacy-page__main">
      <section class="surface-panel legacy-page__notice" aria-labelledby="legacy-page-title">
        <div class="legacy-page__icon" aria-hidden="true">
          <ArchiveRestore class="h-6 w-6" />
        </div>
        <div class="legacy-page__copy">
          <p class="legacy-page__eyebrow">功能迁移说明</p>
          <h1 id="legacy-page-title">{{ content.title }}</h1>
          <p>{{ content.description }}</p>
        </div>
      </section>

      <div class="legacy-page__grid">
        <section class="surface-panel legacy-page__section">
          <h2>现在可以这样继续</h2>
          <div class="legacy-page__actions">
            <RouterLink :to="content.primaryPath" class="primary-action">
              <BookOpen class="h-4 w-4" aria-hidden="true" />
              {{ content.primaryLabel }}
            </RouterLink>
            <RouterLink to="/knowledge/explore" class="secondary-action">
              <Waypoints class="h-4 w-4" aria-hidden="true" />
              探索相关知识
            </RouterLink>
          </div>
          <ul>
            <li v-for="item in content.nextSteps" :key="item">{{ item }}</li>
          </ul>
        </section>

        <aside class="surface-panel legacy-page__section legacy-page__data">
          <h2>关于原有数据</h2>
          <p>
            打开这个页面不会修改或删除原学习记录。旧训练数据不会自动合并到公开知识库，
            新入口只展示其自身可读取的内容。
          </p>
          <p class="legacy-page__hint">
            当前保留原 URL，避免收藏夹和历史链接把你直接带到无关页面。
          </p>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArchiveRestore, BookOpen, Waypoints } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()

const content = computed(() => {
  if (route.name === 'CompanyPrep') {
    const company = String(route.params.company || '').trim()
    return {
      title: company ? `${company} 学习包已迁移` : '主题学习包已迁移',
      description: '原主题训练工作台当前不再作为默认功能开放。你仍可通过知识库查找相关主题、经验和结构化知识卡。',
      primaryPath: company ? { path: '/questions', query: { keyword: company } } : '/questions',
      primaryLabel: '在知识库中查找',
      nextSteps: [
        '使用主题或公司关键词筛选知识卡。',
        '从知识卡详情进入相关内容和复习动作。',
        '需要补充资料时，可发布新内容参与共建。',
      ],
    }
  }

  if (route.name === 'MockInterview') {
    return {
      title: '个人练习已迁移',
      description: '原模拟练习工作台当前不再作为默认功能开放。知识库保留了阅读、整理和复习知识卡的主要路径。',
      primaryPath: '/questions',
      primaryLabel: '进入知识库',
      nextSteps: [
        '先选择一个主题或场景缩小范围。',
        '在知识卡详情记录笔记和学习状态。',
        '通过收藏与复习队列组织后续练习。',
      ],
    }
  }

  return {
    title: '个人学习空间已迁移',
    description: '原个人训练总览当前不再作为默认功能开放。你可以在知识库、成长档案和个人主页继续管理内容与学习动作。',
    primaryPath: '/questions',
    primaryLabel: '进入知识库',
    nextSteps: [
      '在知识库继续查看和整理知识卡。',
      '在成长档案查看已有的真实学习证据。',
      '在个人主页管理收藏、内容和近期行动。',
    ],
  }
})
</script>

<style scoped>
.legacy-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.legacy-page__main {
  display: grid;
  gap: 1rem;
  padding-top: 2rem;
  padding-bottom: 3rem;
}

.legacy-page__notice {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
}

.legacy-page__icon {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: var(--primary-50);
  color: var(--primary-600);
}

.legacy-page__copy {
  display: grid;
  gap: 0.45rem;
}

.legacy-page__eyebrow {
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.legacy-page h1,
.legacy-page h2,
.legacy-page p {
  margin: 0;
}

.legacy-page h1 {
  color: var(--text-strong);
  font-size: 1.5rem;
  line-height: 1.3;
}

.legacy-page__copy > p:last-child,
.legacy-page__section > p,
.legacy-page__section li {
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.75;
}

.legacy-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.65fr);
  gap: 1rem;
  align-items: start;
}

.legacy-page__section {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

.legacy-page__section h2 {
  color: var(--text-strong);
  font-size: 1rem;
}

.legacy-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.legacy-page__section ul {
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding-left: 1.25rem;
}

.legacy-page__hint {
  padding-top: 0.85rem;
  border-top: 1px solid var(--border-subtle);
}

.dark .legacy-page {
  background: #0f1115;
}

.dark .legacy-page__icon {
  background: rgb(10 52 39 / 0.35);
  color: rgb(124 195 165);
}

@media (max-width: 720px) {
  .legacy-page__main {
    padding-top: 1rem;
  }

  .legacy-page__notice {
    padding: 1.1rem;
  }

  .legacy-page__grid {
    grid-template-columns: 1fr;
  }

  .legacy-page__actions > * {
    width: 100%;
  }
}
</style>
