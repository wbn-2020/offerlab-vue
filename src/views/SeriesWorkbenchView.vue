<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <section class="surface-card p-6 sm:p-7">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p class="series-kicker">收藏与内容沉淀</p>
            <h1 class="text-2xl font-black tracking-normal text-slate-950 dark:text-white sm:text-3xl">合集工作台</h1>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              把同一主题下的草稿、已发布内容和公开内容整理到一个合集里，便于自己回看，也方便对外分享一组经验。
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="muted-pill">{{ seriesSourceSummary }}</span>
              <span class="muted-pill">{{ workbenchProgressSummary }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <RouterLink to="/editor" class="secondary-action">
              去发布页
            </RouterLink>
            <button type="button" class="primary-action" @click="startCreateSeries">
              创建合集
            </button>
          </div>
        </div>
      </section>

      <div class="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section class="surface-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-black text-slate-950 dark:text-white">
                {{ editingSeriesId ? '编辑合集' : '创建合集' }}
              </h2>
              <p class="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                先定义主题、可见性和内容目标，后续发布内容可以直接归入该合集。
              </p>
            </div>
            <button
              v-if="editingSeriesId"
              type="button"
              class="series-text-button"
              @click="resetSeriesDraft"
            >
              取消编辑
            </button>
          </div>

          <form class="mt-5 space-y-4" @submit.prevent="saveSeriesDraft">
            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">合集标题</span>
              <input
                v-model="seriesDraft.title"
                type="text"
                maxlength="40"
                class="series-input"
                placeholder="例如：AI 工具实测与效率方法"
              />
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">合集简介</span>
              <textarea
                v-model="seriesDraft.summary"
                rows="4"
                maxlength="200"
                class="series-textarea"
                placeholder="补充这个合集的主题边界、读者收益和整理思路。"
              />
            </label>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">领域</span>
                <select v-model="seriesDraft.domain" class="series-input">
                  <option
                    v-for="domain in localDomainConfigs"
                    :key="domain.domain"
                    :value="domain.domain"
                  >
                    {{ domain.icon }} {{ domain.domainName }}
                  </option>
                </select>
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">目标篇数</span>
                <input
                  v-model.number="seriesDraft.goalCount"
                  type="number"
                  min="1"
                  max="20"
                  class="series-input"
                />
              </label>
            </div>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">阶段状态</span>
                <select v-model="seriesDraft.status" class="series-input">
                <option value="active">进行中</option>
                <option value="paused">暂停更新</option>
                <option value="completed">已完结</option>
              </select>
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">可见性</span>
                <select v-model="seriesDraft.visibility" class="series-input">
                  <option value="private">仅自己可见</option>
                  <option value="public">公开展示</option>
                </select>
              </label>

            <div class="flex flex-wrap gap-3 pt-2">
              <button type="button" class="secondary-action" @click="resetSeriesDraft">
                重置表单
              </button>
              <button type="submit" class="primary-action" :disabled="isSavingSeries">
                {{ isSavingSeries ? '保存中...' : (editingSeriesId ? '保存合集' : '创建合集') }}
              </button>
            </div>
          </form>
        </section>

        <section class="space-y-4">
          <div class="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 class="text-lg font-black text-slate-950 dark:text-white">我的合集</h2>
              <p class="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                优先读取远端合集接口；如仅本地 fallback，会明确提示，避免误当成真实公开数据。
              </p>
            </div>
            <button
              type="button"
              class="secondary-action"
              :disabled="isLoadingSeries"
              @click="loadSeriesWorkbench"
            >
              {{ isLoadingSeries ? '加载中...' : '刷新列表' }}
            </button>
          </div>

          <div v-if="isLoadingSeries" class="surface-card p-6 text-sm text-slate-500 dark:text-slate-400">
            加载中...
          </div>

          <div v-else-if="!seriesRecords.length" class="surface-card p-6">
            <h3 class="text-base font-black text-slate-950 dark:text-white">还没有合集</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              先创建一个合集，把相关内容整理成可回看、可分享的一组主题内容。
            </p>
            <button type="button" class="primary-action mt-4" @click="startCreateSeries">
              创建合集
            </button>
          </div>

          <article
            v-for="record in seriesRecords"
            :key="record.id"
            class="surface-card series-card p-5"
            :class="{ 'series-card-active': activeSeriesId === record.id }"
            @click="activeSeriesId = record.id"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate text-lg font-black text-slate-950 dark:text-white">{{ record.title }}</h3>
                  <span class="series-status-badge">{{ seriesStatusLabel(record.status) }}</span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ record.summary || '暂未填写合集简介，可以补充合集定位、整理思路和读者收益。' }}
                </p>
              </div>

              <button
                type="button"
                class="series-text-button shrink-0"
                @click.stop="startEditSeries(record)"
              >
                编辑合集
              </button>
            </div>

            <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span class="series-meta-pill">{{ domainNameOf(record.domain) }}</span>
              <span class="series-meta-pill">{{ record.visibility === 'private' ? '私密合集' : '公开合集' }}</span>
              <span class="series-meta-pill">目标 {{ record.goalCount }} 篇</span>
              <span class="series-meta-pill">最近更新 {{ formatTimestamp(record.updatedAt) }}</span>
            </div>

            <div class="mt-5">
              <div class="mb-2 flex items-center justify-between gap-3">
                <strong class="text-sm text-slate-900 dark:text-slate-100">进度</strong>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ record.progress.label }}</span>
              </div>
              <div class="series-progress-bar">
                <span :style="{ width: `${record.progress.completionRate}%` }" />
              </div>
              <div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>已发布 {{ record.progress.publishedCount }}</span>
                <span>草稿 {{ record.progress.draftCount }}</span>
                <span>累计 {{ record.progress.totalCount }}</span>
              </div>
            </div>

            <div class="mt-5">
              <div class="mb-2 flex items-center justify-between gap-3">
                <strong class="text-sm text-slate-900 dark:text-slate-100">内容条目</strong>
                <span class="text-xs text-slate-500 dark:text-slate-400">最多展示最近 4 条</span>
              </div>
              <div v-if="record.items.length" class="space-y-2">
                <div
                  v-for="item in record.items.slice(0, 4)"
                  :key="item.id"
                  class="series-item-row"
                >
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.title }}
                    </div>
                    <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                      {{ item.summary || '暂无摘要，发布页会继续补齐。' }}
                    </div>
                  </div>
                  <span class="series-item-status">{{ item.status === 'published' ? '已发布' : '草稿' }}</span>
                </div>
              </div>
              <p v-else class="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                当前还没有内容归入该合集，去发布页选中“合集归属”后会自动累计进度。
              </p>
            </div>
          </article>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import { contentSeriesApi, type ContentSeriesDraftPayload, type ContentSeriesRecord } from '@/api/contentSeries'
import { localDomainConfigs } from '@/api/domains'
import { useAuthStore } from '@/stores/auth'
import { sanitizeVisibleText } from '@/utils/textQuality'

const authStore = useAuthStore()

const createDefaultSeriesDraft = (): ContentSeriesDraftPayload => ({
  title: '',
  summary: '',
  domain: localDomainConfigs[0]?.domain ?? 1,
  visibility: 'private',
  goalCount: 3,
  status: 'active',
})

const seriesRecords = ref<ContentSeriesRecord[]>([])
const seriesSource = ref<'remote' | 'fallback'>('fallback')
const isLoadingSeries = ref(false)
const isSavingSeries = ref(false)
const activeSeriesId = ref('')
const editingSeriesId = ref('')
const seriesDraft = reactive<ContentSeriesDraftPayload>(createDefaultSeriesDraft())

const activeSeriesRecord = computed(() => (
  seriesRecords.value.find((item) => String(item.id) === String(activeSeriesId.value)) || null
))
const seriesSourceSummary = computed(() => (
  seriesSource.value === 'remote'
    ? '已同步后端合集列表'
    : '接口失败时使用本地 fallback'
))
const workbenchProgressSummary = computed(() => {
  const totalPublished = seriesRecords.value.reduce((sum, item) => sum + item.progress.publishedCount, 0)
  const totalGoal = seriesRecords.value.reduce((sum, item) => sum + item.progress.goalCount, 0)
  return totalGoal > 0
    ? `累计已发布 ${totalPublished}/${totalGoal}`
    : '先创建合集，再逐步积累内容沉淀'
})

const domainNameOf = (domain?: number) => (
  localDomainConfigs.find((item) => Number(item.domain) === Number(domain))?.domainName || '技术'
)

const seriesStatusLabel = (status: ContentSeriesRecord['status']) => {
  if (status === 'completed') return '已完结'
  if (status === 'paused') return '暂停更新'
  return '进行中'
}

const formatTimestamp = (value: number) => {
  if (!value) return '刚刚'
  const diff = Date.now() - value
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前`
  return `${Math.max(1, Math.floor(diff / 86_400_000))} 天前`
}

const fillSeriesDraft = (record: ContentSeriesRecord | null) => {
  if (!record) {
    Object.assign(seriesDraft, createDefaultSeriesDraft())
    return
  }
  Object.assign(seriesDraft, {
    title: record.title,
    summary: record.summary || '',
    domain: record.domain,
    visibility: record.visibility,
    goalCount: record.goalCount,
    status: record.status,
  } satisfies ContentSeriesDraftPayload)
}

const startCreateSeries = () => {
  editingSeriesId.value = ''
  fillSeriesDraft(null)
}

const startEditSeries = (record: ContentSeriesRecord) => {
  activeSeriesId.value = record.id
  editingSeriesId.value = record.id
  fillSeriesDraft(record)
}

const resetSeriesDraft = () => {
  editingSeriesId.value = ''
  if (activeSeriesRecord.value) {
    fillSeriesDraft(activeSeriesRecord.value)
    return
  }
  fillSeriesDraft(null)
}

const normalizeSeriesDraft = (): ContentSeriesDraftPayload => ({
  title: sanitizeVisibleText(seriesDraft.title) || '',
  summary: sanitizeVisibleText(seriesDraft.summary) || '',
  domain: Number(seriesDraft.domain || localDomainConfigs[0]?.domain || 1),
  visibility: seriesDraft.visibility || 'private',
  goalCount: Math.min(20, Math.max(1, Number(seriesDraft.goalCount || 1))),
  status: seriesDraft.status || 'active',
})

const loadSeriesWorkbench = async () => {
  if (!authStore.isLoggedIn) {
    seriesRecords.value = []
    seriesSource.value = 'fallback'
    activeSeriesId.value = ''
    editingSeriesId.value = ''
    fillSeriesDraft(null)
    return
  }

  isLoadingSeries.value = true
  try {
    const res = await contentSeriesApi.listMine(authStore.user?.uid)
    seriesRecords.value = res.data || []
    seriesSource.value = res.status

    if (!activeSeriesId.value && seriesRecords.value.length) {
      activeSeriesId.value = seriesRecords.value[0].id
    } else if (activeSeriesId.value && !seriesRecords.value.some((item) => item.id === activeSeriesId.value)) {
      activeSeriesId.value = seriesRecords.value[0]?.id || ''
    }

    if (editingSeriesId.value) {
      const current = seriesRecords.value.find((item) => item.id === editingSeriesId.value) || null
      fillSeriesDraft(current)
    }
  } catch (error) {
    toast.error(getErrorMessage(error, '合集列表加载失败'))
  } finally {
    isLoadingSeries.value = false
  }
}

const saveSeriesDraft = async () => {
  const payload = normalizeSeriesDraft()
  if (!payload.title) {
    toast.error('请先填写合集标题')
    return
  }

  isSavingSeries.value = true
  try {
    const res = editingSeriesId.value
      ? await contentSeriesApi.update(editingSeriesId.value, payload, authStore.user?.uid)
      : await contentSeriesApi.create(payload, authStore.user?.uid)

    seriesSource.value = res.status
    if (res.data) {
      activeSeriesId.value = res.data.id
      editingSeriesId.value = res.data.id
      fillSeriesDraft(res.data)
    }

    toast.success(res.status === 'fallback' ? '合集已保存到本地 fallback' : '合集已保存')
    await loadSeriesWorkbench()
  } catch (error) {
    toast.error(getErrorMessage(error, '合集保存失败'))
  } finally {
    isSavingSeries.value = false
  }
}

onMounted(async () => {
  await loadSeriesWorkbench()
  if (!activeSeriesId.value && seriesRecords.value.length) {
    activeSeriesId.value = seriesRecords.value[0].id
  }
})
</script>

<style scoped>
.series-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  background: rgb(239 246 255);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.series-input,
.series-textarea {
  width: 100%;
  border-radius: 0.9rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.series-input {
  min-height: 44px;
  padding: 0.75rem 0.9rem;
}

.series-textarea {
  min-height: 120px;
  padding: 0.85rem 0.9rem;
  resize: vertical;
}

.series-input:focus,
.series-textarea:focus {
  outline: none;
  border-color: rgb(96 165 250);
  box-shadow: 0 0 0 4px rgb(219 234 254);
  background: white;
}

.series-card {
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.series-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 36px rgb(15 23 42 / 0.06);
}

.series-card-active {
  border-color: rgb(147 197 253);
  box-shadow: 0 0 0 1px rgb(191 219 254), 0 18px 36px rgb(37 99 235 / 0.08);
}

.series-status-badge,
.series-meta-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.series-progress-bar {
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.series-progress-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(37 99 235), rgb(14 165 233));
  transition: width 0.2s ease;
}

.series-item-row {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.9rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.85rem 0.95rem;
}

.series-item-status {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgb(224 242 254);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(3 105 161);
}

.series-text-button {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(37 99 235);
}

.series-text-button:hover {
  color: rgb(29 78 216);
}

.dark .series-kicker {
  background: rgb(30 41 59);
  color: rgb(147 197 253);
}

.dark .series-input,
.dark .series-textarea,
.dark .series-item-row {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(226 232 240);
}

.dark .series-input:focus,
.dark .series-textarea:focus {
  border-color: rgb(96 165 250);
  box-shadow: 0 0 0 4px rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .series-card-active {
  border-color: rgb(30 64 175);
  box-shadow: 0 0 0 1px rgb(37 99 235 / 0.4), 0 18px 36px rgb(2 6 23 / 0.55);
}

.dark .series-status-badge,
.dark .series-meta-pill {
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}

.dark .series-progress-bar {
  background: rgb(30 41 59);
}

.dark .series-item-status {
  background: rgb(12 74 110);
  color: rgb(186 230 253);
}

@media (max-width: 640px) {
  .series-input,
  .series-textarea {
    font-size: 16px;
  }
}
</style>
