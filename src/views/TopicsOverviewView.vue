<template>
  <div class="app-shell topics-overview-page">
    <AppHeader />

    <main class="community-page topics-main" aria-labelledby="topics-title">
      <section class="topics-hero surface-card">
        <div class="hero-mark" aria-hidden="true">
          <Hash class="h-5 w-5" />
        </div>
        <div class="hero-copy">
          <p class="hero-kicker">社区话题</p>
          <h1 id="topics-title">话题总览</h1>
          <p class="hero-summary">
            按主题汇集社区公开内容：精选话题由运营持续维护，活跃话题跟随社区讨论实时更新。
          </p>
        </div>
      </section>

      <div v-if="loading" class="topics-loading" role="status" aria-live="polite">
        <span class="loading-spinner" aria-hidden="true"></span>
        正在整理话题列表…
      </div>

      <EmptyState
        v-else-if="loadError"
        title="话题列表暂时无法读取"
        description="稍后刷新重试，或先回到发现页浏览公开内容。"
        action-text="重新加载"
        @click="reload"
      />

      <template v-else>
        <section class="topics-section" aria-labelledby="featured-topics-title">
          <div class="section-head">
            <h2 id="featured-topics-title">精选话题</h2>
            <p class="section-note">运营团队维护的主题集合，适合系统性阅读。</p>
          </div>
          <div v-if="featuredTopics.length" class="topic-grid">
            <RouterLink
              v-for="topic in featuredTopics"
              :key="topic.id"
              :to="topicHref(topic)"
              class="topic-card surface-card"
            >
              <div class="topic-card-icon" aria-hidden="true">
                <Hash class="h-4 w-4" />
              </div>
              <div class="topic-card-body">
                <h3 class="topic-card-title">{{ topic.title }}</h3>
                <p v-if="topic.summary" class="topic-card-summary">{{ topic.summary }}</p>
                <span class="topic-card-cta">进入话题 →</span>
              </div>
            </RouterLink>
          </div>
          <EmptyState
            v-else
            title="暂无精选话题"
            description="运营精选话题上线后会在这里展示。"
            action-text="去发现页看看"
            action-href="/explore"
          />
        </section>

        <section class="topics-section" aria-labelledby="active-topics-title">
          <div class="section-head">
            <h2 id="active-topics-title">活跃话题</h2>
            <p class="section-note">近期社区讨论正在聚集的主题。</p>
          </div>
          <div v-if="activeTopics.length" class="topic-list">
            <RouterLink
              v-for="topic in activeTopics"
              :key="topic.id"
              :to="topicHref(topic)"
              class="topic-row surface-card"
            >
              <Hash class="topic-row-icon h-4 w-4" aria-hidden="true" />
              <div class="topic-row-body">
                <span class="topic-row-title">{{ topic.title }}</span>
                <span v-if="topic.summary" class="topic-row-summary">{{ topic.summary }}</span>
              </div>
              <ChevronRight class="topic-row-arrow h-4 w-4" aria-hidden="true" />
            </RouterLink>
          </div>
          <EmptyState
            v-else
            title="暂无活跃话题"
            description="社区讨论聚集后会自动形成活跃话题。"
          />
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, Hash } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { discoveryApi, type DiscoveryItem } from '@/api/discovery'
import { toast } from 'vue-sonner'

const loading = ref(true)
const loadError = ref(false)
const featuredTopics = ref<DiscoveryItem[]>([])
const activeTopics = ref<DiscoveryItem[]>([])

const topicHref = (topic: DiscoveryItem) => {
  if (topic.href) return topic.href
  return topic.slug ? `/topics/${encodeURIComponent(topic.slug)}` : '/explore'
}

const load = async () => {
  loading.value = true
  loadError.value = false
  try {
    const res = await discoveryApi.getDiscoveryMap()
    const data = res.data
    featuredTopics.value = (data?.featuredTopics || []).filter((item) => item.title && item.href)
    activeTopics.value = (data?.activeTopics || []).filter((item) => item.title && item.href)
  } catch (error) {
    console.warn('[topics] failed to load discovery map', error)
    loadError.value = true
    toast.error('话题列表加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const reload = () => {
  void load()
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.topics-main {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.topics-hero {
  display: flex;
  gap: 0.875rem;
  padding: 1.25rem 1.5rem;
  align-items: flex-start;
}

.hero-mark {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: var(--primary-50, #e8f3ed);
  color: var(--primary-600, #1a7f5a);
}

.hero-kicker {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--primary-600, #1a7f5a);
  margin: 0 0 0.25rem;
}

.topics-hero h1 {
  font-size: 1.375rem;
  font-weight: 900;
  color: var(--text-primary, #16201b);
  margin: 0 0 0.375rem;
}

.hero-summary {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--text-muted, #6b756e);
  margin: 0;
}

.topics-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.section-head h2 {
  font-size: 1.0625rem;
  font-weight: 800;
  color: var(--text-primary, #16201b);
  margin: 0 0 0.125rem;
}

.section-note {
  font-size: 0.8125rem;
  color: var(--text-muted, #6b756e);
  margin: 0;
}

.topic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.875rem;
}

.topic-card {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.125rem;
  text-decoration: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.topic-card:hover {
  border-color: var(--primary-300, #7cc3a5);
  box-shadow: 0 6px 20px rgba(26, 127, 90, 0.08);
  transform: translateY(-1px);
}

.topic-card:focus-visible {
  outline: 2px solid var(--primary-500, #219a70);
  outline-offset: 2px;
}

.topic-card-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: var(--primary-50, #e8f3ed);
  color: var(--primary-600, #1a7f5a);
}

.topic-card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.topic-card-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary, #16201b);
  margin: 0;
}

.topic-card-summary {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-muted, #6b756e);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-card-cta {
  margin-top: auto;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary-600, #1a7f5a);
}

.topic-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.topic-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  transition: border-color 0.15s ease;
}

.topic-row:hover {
  border-color: var(--primary-300, #7cc3a5);
}

.topic-row:focus-visible {
  outline: 2px solid var(--primary-500, #219a70);
  outline-offset: 2px;
}

.topic-row-icon {
  flex-shrink: 0;
  color: var(--primary-600, #1a7f5a);
}

.topic-row-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.topic-row-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #16201b);
}

.topic-row-summary {
  font-size: 0.75rem;
  color: var(--text-muted, #6b756e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topic-row-arrow {
  flex-shrink: 0;
  color: var(--text-muted, #6b756e);
}

.topics-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 0;
  font-size: 0.875rem;
  color: var(--text-muted, #6b756e);
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid var(--border-subtle, #e5e8de);
  border-top-color: var(--primary-500, #219a70);
  animation: topics-spin 0.8s linear infinite;
}

@keyframes topics-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .topics-main {
    padding: 1rem 0.75rem 5rem;
  }

  .topic-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .topic-card,
  .topic-row,
  .loading-spinner {
    transition: none;
    animation: none;
  }
}
</style>
