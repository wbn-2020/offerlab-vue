<template>
  <div class="app-shell">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="surface-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="stage4-kicker">阶段 4 差异化品牌</span>
            <h1 class="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">
              成长档案
            </h1>
            <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              用可解释的活跃度、影响力、内容深度和持续性，整理你在不同领域的成长轨迹。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in dayOptions"
              :key="option"
              type="button"
              :class="['day-chip', days === option ? 'day-chip-active' : '']"
              @click="days = option"
            >
              {{ option }} 天
            </button>
            <RouterLink to="/growth/report" class="secondary-action">
              周报 / 月报
            </RouterLink>
            <RouterLink to="/knowledge/explore" class="secondary-action">
              知识关系
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="mt-6">
        <EmptyState
          v-if="!authStore.isLoggedIn"
          title="登录后查看个人成长档案"
          description="成长档案会读取你自己的发布、互动和系列数据，不对外公开。"
          action-text="去登录"
          :action-href="loginRedirectHref"
        />

        <LoadingSkeleton v-else-if="loading" />

        <div v-else-if="error" class="surface-card p-6">
          <h2 class="text-lg font-black text-slate-950 dark:text-white">成长档案暂时不可用</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ error }}</p>
          <button type="button" class="primary-action mt-4" @click="loadProfile">
            重新加载
          </button>
        </div>

        <EmptyState
          v-else-if="!profile || !profile.domains.length"
          title="还没有足够的成长数据"
          description="继续发布内容、整理系列或参与互动后，这里会逐步形成你的成长画像。"
          action-text="去发布"
          action-href="/editor"
        />

        <div v-else class="space-y-6">
          <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article class="surface-card p-6">
              <div class="grid gap-4 md:grid-cols-3">
                <div class="summary-card">
                  <span class="summary-label">最强领域</span>
                  <strong>{{ strongestDomain }}</strong>
                  <p>{{ primaryDomain?.postCount ?? 0 }} 篇公开内容</p>
                </div>
                <div class="summary-card">
                  <span class="summary-label">新兴方向</span>
                  <strong>{{ emergingDomain }}</strong>
                  <p>{{ profile.days }} 天内正在抬头的领域</p>
                </div>
                <div class="summary-card">
                  <span class="summary-label">下一步聚焦</span>
                  <strong>行动建议</strong>
                  <p>{{ profile.nextFocus || '继续把高质量内容沉淀成系列。' }}</p>
                </div>
              </div>
            </article>

            <article class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">雷达维度说明</h2>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div v-for="item in dimensionGlossary" :key="item.key" class="glossary-card">
                  <strong>{{ item.label }}</strong>
                  <p>{{ item.detail }}</p>
                </div>
              </div>
              <div v-if="profile.degraded" class="fallback-banner mt-4">
                <strong>当前为降级视图</strong>
                <p>
                  {{ profile.degradationReasons.join(' / ') || '部分服务未就绪，当前只展示规则聚合结果。' }}
                </p>
              </div>
            </article>
          </section>

          <section class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="domain in profile.domains"
              :key="domain.domain"
              class="surface-card p-6"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="flex items-center gap-3">
                    <span class="domain-icon">{{ getDomainIcon(domain.domain) }}</span>
                    <div>
                      <h2 class="text-lg font-black text-slate-950 dark:text-white">{{ domain.domainName }}</h2>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        综合得分 {{ totalScore(domain) }} / 400
                      </p>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span class="meta-pill">发布 {{ domain.postCount }}</span>
                    <span class="meta-pill">系列 {{ domain.seriesCount }}</span>
                    <span class="meta-pill">活跃日 {{ domain.activeDays }}</span>
                    <span class="meta-pill">互动 {{ domain.interactionCount }}</span>
                    <span class="meta-pill">浏览 {{ domain.viewCount }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-5 space-y-3">
                <div v-for="dimension in domain.dimensions" :key="dimension.key">
                  <div class="mb-1 flex items-center justify-between gap-3 text-sm">
                    <strong class="text-slate-900 dark:text-slate-100">{{ dimension.label }}</strong>
                    <span class="text-slate-500 dark:text-slate-400">{{ dimension.score }}</span>
                  </div>
                  <div class="dimension-bar">
                    <span :style="{ width: `${dimension.score}%` }" />
                  </div>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {{ dimension.explanation }}
                  </p>
                </div>
              </div>

              <div class="mt-5">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <strong class="text-sm text-slate-900 dark:text-slate-100">代表内容</strong>
                  <span class="text-xs text-slate-500 dark:text-slate-400">最多展示 4 条</span>
                </div>
                <div v-if="domain.representativePosts.length" class="space-y-2">
                  <RouterLink
                    v-for="post in domain.representativePosts"
                    :key="post.postId"
                    :to="`/post/${post.postId}`"
                    class="post-row"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {{ post.title }}
                      </div>
                      <div class="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{{ post.heat }} 热度</span>
                        <span>{{ getDomainLabel(post.domain ?? domain.domain) }}</span>
                        <span v-if="post.featured">精选</span>
                      </div>
                    </div>
                    <span class="post-row-link">查看</span>
                  </RouterLink>
                </div>
                <p
                  v-else
                  class="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
                >
                  这个领域还在积累样本，继续发布或整理系列后会形成更稳定的代表内容。
                </p>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { getErrorMessage } from '@/api/client'
import { growthApi } from '@/api/growth'
import { useAuthStore } from '@/stores/auth'
import type { GrowthProfile, GrowthProfileDomain } from '@/api/types'
import { getDomainIcon, getDomainLabel } from '@/utils/domains'

const authStore = useAuthStore()
const route = useRoute()

const dayOptions = [7, 30, 90]
const dimensionGlossary = [
  { key: 'activity', label: '活跃度', detail: '看近周期是否持续发帖和保持领域活跃。' },
  { key: 'influence', label: '影响力', detail: '看互动反馈和公开内容的传播表现。' },
  { key: 'depth', label: '内容深度', detail: '看系列沉淀、长文输出和主题完整性。' },
  { key: 'consistency', label: '持续性', detail: '看是否稳定更新，而不是只在单个时间点爆发。' },
] as const

const days = ref(30)
const loading = ref(false)
const error = ref('')
const profile = ref<GrowthProfile | null>(null)

const loginRedirectHref = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
const primaryDomain = computed(() => profile.value?.domains?.[0] ?? null)
const strongestDomain = computed(() => profile.value?.strongestDomain || primaryDomain.value?.domainName || '--')
const emergingDomain = computed(() => profile.value?.emergingDomain || '继续观察')

const totalScore = (domain: GrowthProfileDomain) => (
  domain.dimensions.reduce((sum, item) => sum + Number(item.score || 0), 0)
)

const loadProfile = async () => {
  if (!authStore.isLoggedIn) {
    profile.value = null
    error.value = ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await growthApi.getProfile(days.value)
    profile.value = res.data
  } catch (err) {
    profile.value = null
    error.value = getErrorMessage(err, '加载成长档案失败')
  } finally {
    loading.value = false
  }
}

watch(days, async () => {
  await loadProfile()
})

watch(() => authStore.isLoggedIn, async () => {
  await loadProfile()
})

onMounted(async () => {
  await loadProfile()
})
</script>

<style scoped>
.stage4-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(224 242 254);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(3 105 161);
}

.day-chip {
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.55rem 0.9rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(71 85 105);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.day-chip-active {
  border-color: rgb(59 130 246);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.summary-card,
.glossary-card,
.post-row {
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.82);
}

.summary-card {
  min-height: 9rem;
  padding: 1rem;
}

.summary-label {
  display: inline-flex;
  margin-bottom: 0.75rem;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(71 85 105);
}

.summary-card strong {
  display: block;
  font-size: 1.125rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.summary-card p,
.glossary-card p {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(100 116 139);
}

.glossary-card {
  padding: 1rem;
}

.glossary-card strong {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.fallback-banner {
  border-radius: 1rem;
  border: 1px solid rgb(254 215 170);
  background: rgb(255 247 237);
  padding: 1rem;
}

.fallback-banner strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 900;
  color: rgb(154 52 18);
}

.fallback-banner p {
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(154 52 18);
}

.domain-icon {
  display: inline-flex;
  height: 2.75rem;
  width: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.9rem;
  background: rgb(239 246 255);
  font-size: 1.2rem;
}

.meta-pill {
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.35rem 0.65rem;
}

.dimension-bar {
  height: 0.65rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.dimension-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgb(14 165 233), rgb(37 99 235));
}

.post-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1rem;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.post-row:hover {
  border-color: rgb(191 219 254);
  transform: translateY(-1px);
}

.post-row-link {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.dark .stage4-kicker {
  background: rgb(8 47 73);
  color: rgb(125 211 252);
}

.dark .day-chip {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .day-chip-active {
  border-color: rgb(59 130 246);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .summary-card,
.dark .glossary-card,
.dark .post-row {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.88);
}

.dark .summary-label,
.dark .meta-pill {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .summary-card strong,
.dark .glossary-card strong {
  color: rgb(241 245 249);
}

.dark .summary-card p,
.dark .glossary-card p {
  color: rgb(148 163 184);
}

.dark .fallback-banner {
  border-color: rgb(154 52 18);
  background: rgb(67 20 7 / 0.45);
}

.dark .fallback-banner strong,
.dark .fallback-banner p {
  color: rgb(253 186 116);
}

.dark .domain-icon {
  background: rgb(30 41 59);
}

.dark .dimension-bar {
  background: rgb(30 41 59);
}
</style>
