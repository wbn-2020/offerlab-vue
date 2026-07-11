<template>
  <section
    class="revisit-panel"
    :class="{ 'revisit-panel-compact': compact }"
    data-phase14-retention-summary
    data-non-external-push
    data-existing-notification-preferences
  >
    <div class="revisit-head">
      <div class="min-w-0">
        <p class="revisit-eyebrow">站内轻量复访</p>
        <h2>{{ compact ? '回来看看' : '回来看看：收藏、讨论和关注更新' }}</h2>
        <p>
          {{ authStore.isLoggedIn
            ? '只汇总站内公开内容和你已有的社区关系，不生成新的外部推送。'
            : '登录后可以从收藏、参与过的讨论和关注作者更新里继续查看。' }}
        </p>
      </div>
      <RouterLink :to="authStore.isLoggedIn ? '/me?tab=favorites' : '/login'" class="revisit-action">
        {{ authStore.isLoggedIn ? '打开我的复访' : '登录查看' }}
      </RouterLink>
    </div>

    <div v-if="!authStore.isLoggedIn" class="revisit-empty">
      <LogIn class="h-4 w-4" />
      <span>登录后显示个人复访摘要；当前不会拉取私有接口。</span>
    </div>

    <div v-else-if="loading" class="revisit-empty">
      <RefreshCcw class="h-4 w-4 animate-spin" />
      <span>正在整理站内入口...</span>
    </div>

    <div v-else-if="visibleBlocks.length" class="revisit-block-grid">
      <article v-for="block in visibleBlocks" :key="block.key" class="revisit-block">
        <div class="revisit-block-title">
          <component :is="iconFor(block.key)" class="h-4 w-4" />
          <strong>{{ block.title }}</strong>
        </div>
        <p>{{ block.description }}</p>
        <div class="revisit-link-list">
          <RouterLink v-for="item in block.items" :key="item.id" :to="item.href" class="revisit-link">
            <span>{{ item.title }}</span>
            <small>{{ item.description || sourceLabel(item.source) }}</small>
          </RouterLink>
        </div>
        <span v-if="block.degraded" class="revisit-degraded">已使用兜底来源</span>
      </article>
    </div>

    <div v-else class="revisit-empty">
      <BookOpen class="h-4 w-4" />
      <span>{{ errorText || '暂时没有可回看的个人摘要，可以先去发现内容或整理收藏。' }}</span>
    </div>

    <p class="revisit-preference-note">
      这是前端基于现有收藏、关注和通知接口即时整理的摘要，不是独立后端留存服务；内容会遵循互动通知和系统通知偏好。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { BookOpen, BookmarkCheck, LogIn, MessageCircle, RefreshCcw, UserRoundCheck } from 'lucide-vue-next'
import { retentionApi, type RetentionSource, type RetentionSummary, type RetentionSummaryBlock } from '@/api/retention'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  compact?: boolean
}>()

const authStore = useAuthStore()
const summary = ref<RetentionSummary | null>(null)
const loading = ref(false)
const errorText = ref('')

const visibleBlocks = computed(() => (
  summary.value?.blocks
    .map((block) => ({ ...block, items: block.items.slice(0, 5) }))
    .filter((block) => block.items.length > 0) || []
))

const sourceLabel = (source: RetentionSource) => {
  if (source === 'discussion_revisit') return '来自你参与过的讨论'
  if (source === 'following_author_update') return '来自你关注的作者'
  if (source === 'following_topic_update') return '来自你关注的话题'
  if (source === 'unorganized_favorite') return '来自未整理收藏'
  return '来自收藏内容'
}

const iconFor = (key: RetentionSummaryBlock['key']) => {
  if (key === 'discussion_revisits') return MessageCircle
  if (key === 'following_author_updates') return UserRoundCheck
  return BookmarkCheck
}

const loadSummary = async () => {
  if (!authStore.isLoggedIn) {
    summary.value = null
    errorText.value = ''
    return
  }
  loading.value = true
  try {
    const res = await retentionApi.getSummary(authStore.isLoggedIn)
    summary.value = res.data
    errorText.value = ''
  } catch {
    summary.value = null
    errorText.value = '复访摘要暂时不可用，可以从我的收藏或通知中心继续查看。'
  } finally {
    loading.value = false
  }
}

onMounted(loadSummary)

watch(() => authStore.isLoggedIn, () => {
  void loadSummary()
})
</script>

<style scoped>
.revisit-panel {
  min-width: 0;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 1rem;
}

.revisit-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.revisit-eyebrow {
  color: rgb(37 99 235);
  font-size: 0.75rem;
  font-weight: 900;
}

.revisit-head h2 {
  margin-top: 0.15rem;
  color: rgb(15 23 42);
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1.35;
}

.revisit-head p,
.revisit-block p,
.revisit-preference-note {
  margin-top: 0.35rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.6;
}

.revisit-action {
  display: inline-flex;
  min-height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: white;
  padding: 0.45rem 0.8rem;
  color: rgb(29 78 216);
  font-size: 0.8125rem;
  font-weight: 900;
}

.revisit-block-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.revisit-panel-compact .revisit-block-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.revisit-block {
  min-width: 0;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.625rem;
  background: white;
  padding: 0.85rem;
}

.revisit-block-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  color: rgb(37 99 235);
}

.revisit-block-title strong {
  min-width: 0;
  overflow: hidden;
  color: rgb(15 23 42);
  font-size: 0.9rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.revisit-link-list {
  margin-top: 0.7rem;
  display: grid;
  gap: 0.5rem;
}

.revisit-link {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.65rem;
}

.revisit-link span,
.revisit-link small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.revisit-link span {
  color: rgb(15 23 42);
  font-size: 0.84rem;
  font-weight: 900;
  white-space: nowrap;
}

.revisit-link small {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.45;
}

.revisit-degraded {
  margin-top: 0.65rem;
  display: inline-flex;
  border-radius: 999px;
  background: rgb(255 251 235);
  padding: 0.25rem 0.55rem;
  color: rgb(146 64 14);
  font-size: 0.7rem;
  font-weight: 900;
}

.revisit-empty {
  margin-top: 1rem;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
  border-radius: 0.625rem;
  background: white;
  padding: 0.85rem;
  color: rgb(71 85 105);
  font-size: 0.85rem;
  font-weight: 700;
}

.revisit-preference-note {
  margin-top: 0.85rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.dark .revisit-panel {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .revisit-action,
.dark .revisit-block,
.dark .revisit-empty {
  background: rgb(2 6 23);
}

.dark .revisit-head h2,
.dark .revisit-block-title strong,
.dark .revisit-link span {
  color: rgb(248 250 252);
}

.dark .revisit-head p,
.dark .revisit-block p,
.dark .revisit-preference-note,
.dark .revisit-empty,
.dark .revisit-link small {
  color: rgb(203 213 225);
}

.dark .revisit-link {
  background: rgb(15 23 42);
}

@media (max-width: 768px) {
  .revisit-head {
    flex-direction: column;
  }

  .revisit-action {
    width: 100%;
  }

  .revisit-block-grid,
  .revisit-panel-compact .revisit-block-grid {
    grid-template-columns: 1fr;
  }
}
</style>
