<template>
  <div class="app-shell series-workbench-page">
    <AppHeader />
    <main class="community-page series-workbench-main">
      <header class="series-page-heading">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p class="series-context">创作管理</p>
            <h1>合集工作台</h1>
            <p class="series-page-description">
              把同一主题下的草稿、已发布内容和公开内容整理到一个合集里，便于自己回看，也方便对外分享一组经验。
            </p>
            <div class="series-page-meta">
              <span>{{ seriesSourceSummary }}</span>
              <span>{{ workbenchProgressSummary }}</span>
            </div>
          </div>
          <div class="series-heading-actions">
            <RouterLink to="/editor" class="secondary-action">
              <PenLine class="h-4 w-4" />
              去发布页
            </RouterLink>
            <button type="button" class="primary-action" @click="startCreateSeries">
              <Plus class="h-4 w-4" />
              创建合集
            </button>
          </div>
        </div>
      </header>

      <div class="series-workspace-layout">
        <section class="surface-panel series-editor-panel">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="series-panel-label">合集设置</p>
              <h2 class="series-panel-title">
                {{ editingSeriesId ? '编辑合集' : '创建合集' }}
              </h2>
              <p class="series-panel-description">
                先定义主题、可见性和内容目标，后续发布内容可以直接归入该合集。
              </p>
            </div>
            <button
              v-if="editingSeriesId"
              type="button"
              class="series-text-button"
              @click="resetSeriesDraft"
            >
              <X class="h-4 w-4" />
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
              >
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

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">领域</span>
                <select v-model="seriesDraft.domain" class="series-input">
                  <option :value="0" disabled>请选择频道</option>
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
                >
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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
            </div>

            <div class="series-form-actions">
              <button type="button" class="secondary-action" @click="resetSeriesDraft">
                <RotateCcw class="h-4 w-4" />
                重置表单
              </button>
              <button type="submit" class="primary-action" :disabled="isSavingSeries">
                <Loader2 v-if="isSavingSeries" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                {{ isSavingSeries ? '保存中...' : (editingSeriesId ? '保存合集' : '创建合集') }}
              </button>
            </div>
          </form>
        </section>

        <section class="series-list-column">
          <div class="series-list-heading">
            <div>
              <p class="series-panel-label">内容目录</p>
              <h2 class="series-panel-title">我的合集</h2>
              <p class="series-panel-description">
                优先读取已同步的合集；如果暂时只能展示本机内容，会明确提示，避免误当成真实公开数据。
              </p>
            </div>
            <button
              type="button"
              class="secondary-action"
              :disabled="isLoadingSeries"
              @click="loadSeriesWorkbench"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoadingSeries }" />
              {{ isLoadingSeries ? '加载中...' : '刷新列表' }}
            </button>
          </div>

          <div v-if="isLoadingSeries" class="surface-panel series-loading-state" aria-label="正在加载合集">
            <div v-for="item in 3" :key="item" class="series-skeleton-row" />
          </div>

          <div v-else-if="!seriesRecords.length" class="surface-panel series-empty-state">
            <Library class="h-6 w-6" />
            <div>
              <h3>还没有合集</h3>
              <p>
                先创建一个合集，把相关内容整理成可回看、可分享的一组主题内容。
              </p>
              <button type="button" class="primary-action mt-4" @click="startCreateSeries">
                <Plus class="h-4 w-4" />
                创建合集
              </button>
            </div>
          </div>

          <article
            v-for="record in seriesRecords"
            :key="record.id"
            class="surface-panel series-card"
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
                <Pencil class="h-4 w-4" />
                编辑合集
              </button>
            </div>

            <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span class="series-meta-pill">{{ domainNameOf(record.domain) }}</span>
              <span class="series-meta-pill">{{ record.visibility === 'private' ? '私密合集' : '公开合集' }}</span>
              <span class="series-meta-pill">{{ seriesKnowledgeProjectionLabel(record) }}</span>
              <span v-if="seriesSource !== 'remote' || record.previewSource !== 'remote'" class="series-meta-pill">
                {{ seriesPreviewSourceLabel(record) }} · 只读展示
              </span>
              <span class="series-meta-pill">目标 {{ record.goalCount }} 篇</span>
              <span class="series-meta-pill">最近更新 {{ formatTimestamp(record.updatedAt) }}</span>
            </div>

            <div class="series-knowledge-projection mt-4">
              <strong>{{ record.visibility === 'public' ? '公开系列关系投影' : '私密系列' }}</strong>
              <p>{{ seriesKnowledgeProjectionCopy(record) }}</p>
              <RouterLink
                v-if="record.visibility === 'public' && record.knowledgeProjectionState !== 'DEGRADED'"
                :to="{ path: '/knowledge/explore', query: { assetType: 'series', assetId: record.id } }"
              >
                <ExternalLink class="h-3.5 w-3.5" />
                查看关系投影
              </RouterLink>
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
import {
  ExternalLink,
  Library,
  Loader2,
  PenLine,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  X,
} from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import { contentSeriesApi, type ContentSeriesDraftPayload, type ContentSeriesRecord } from '@/api/contentSeries'
import { localDomainConfigs } from '@/api/domains'
import { useAuthStore } from '@/stores/auth'
import { isKnownDomain } from '@/utils/domains'
import { sanitizeVisibleText } from '@/utils/textQuality'

const authStore = useAuthStore()

const createDefaultSeriesDraft = (): ContentSeriesDraftPayload => ({
  title: '',
  summary: '',
  domain: 0,
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
    : '暂时展示本机已保存的合集'
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

const seriesPreviewSourceLabel = (record: ContentSeriesRecord) => {
  if (seriesSource.value === 'fallback') return '本机暂存'
  if (record.previewSource === 'local') return '本机暂存'
  if (record.previewSource === 'demo') return '示例内容'
  if (record.previewSource === 'fallback') return '备用内容'
  return '已同步'
}

const seriesKnowledgeProjectionLabel = (record: ContentSeriesRecord) => {
  if (record.visibility !== 'public') return '不参与公开关联'
  if (record.knowledgeProjectionState === 'CONFIRMED') return '存在已确认关系'
  if (record.knowledgeProjectionState === 'DEGRADED') return '关联依据不足'
  return '本次关联建议'
}

const seriesKnowledgeProjectionCopy = (record: ContentSeriesRecord) => {
  if (record.visibility !== 'public') return '私密合集只用于个人管理，不参与公开内容关联。'
  if (record.knowledgeProjectionState === 'CONFIRMED') {
    return record.sourceNote || '仅审核通过且关系证据完整的记录会显示为已确认关系。'
  }
  if (record.knowledgeProjectionState === 'DEGRADED') {
    return `${seriesPreviewSourceLabel(record)} 内容仅作暂时展示，不能视为已确认的正式关系。`
  }
  return record.knowledgeProjectionReason
    || '公开系列可参与请求时关系推荐；这些连接是即时阅读建议，不代表已保存或人工确认的知识关系。'
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
  domain: Number(seriesDraft.domain),
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
  if (!isKnownDomain(payload.domain)) {
    toast.error('请选择频道')
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
    }    toast.success('Content series saved')
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
.series-workbench-page {
  background: var(--surface-2);
}

.series-workbench-main {
  padding-top: 1.5rem;
  padding-bottom: 6rem;
}

.series-page-heading {
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.35rem 0 1.5rem;
}

.series-context,
.series-panel-label {
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.series-page-heading h1 {
  margin-top: 0.3rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: 0;
}

.series-page-description {
  max-width: 68ch;
  margin-top: 0.6rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.75;
}

.series-page-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin-top: 0.85rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.series-page-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.series-page-meta span::before {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: var(--primary-500);
  content: '';
}

.series-heading-actions,
.series-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.series-workspace-layout {
  display: grid;
  gap: 1.25rem;
  margin-top: 1.25rem;
}

.series-editor-panel {
  align-self: start;
  padding: 1.1rem;
}

.series-list-column {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 0.85rem;
}

.series-list-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.25rem 0 0.9rem;
}

.series-panel-title {
  margin-top: 0.2rem;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 900;
}

.series-panel-description {
  max-width: 65ch;
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.series-input,
.series-textarea {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-primary);
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
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgb(47 111 235 / 0.12);
  background: var(--surface-1);
}

.series-card {
  cursor: pointer;
  padding: 1rem;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.series-card:hover {
  border-color: #cbd5e1;
  background: var(--surface-1);
}

.series-card-active {
  border-color: #93c5fd;
  box-shadow: inset 3px 0 0 var(--primary-600);
}

.series-status-badge,
.series-meta-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: var(--surface-3);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.series-progress-bar {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: var(--surface-muted);
}

.series-progress-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-600);
  transition: width 0.2s ease;
}

.series-item-row {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 0.75rem;
  border-top: 1px solid var(--border-subtle);
  padding: 0.85rem 0.95rem;
}

.series-item-row:first-child {
  border-top: 0;
}

.series-knowledge-projection {
  display: grid;
  gap: 0.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.85rem 0.95rem;
}

.series-knowledge-projection strong {
  color: rgb(15 23 42);
  font-size: 0.875rem;
  font-weight: 900;
}

.series-knowledge-projection p {
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.series-knowledge-projection a {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  justify-self: start;
  color: rgb(37 99 235);
  font-size: 0.8125rem;
  font-weight: 800;
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
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  padding: 0.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(37 99 235);
}

.series-text-button:hover {
  color: rgb(29 78 216);
}

.series-empty-state {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1rem;
  color: var(--text-muted);
}

.series-empty-state h3 {
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 900;
}

.series-empty-state p {
  margin-top: 0.25rem;
  font-size: 0.82rem;
  line-height: 1.6;
}

.series-loading-state {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
}

.series-skeleton-row {
  height: 5rem;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  animation: series-pulse 1.2s ease-in-out infinite alternate;
}

@keyframes series-pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

@media (min-width: 1024px) {
  .series-workspace-layout {
    grid-template-columns: 20rem minmax(0, 1fr);
    gap: 1.5rem;
  }

  .series-editor-panel {
    position: sticky;
    top: calc(var(--community-header-height) + 1.5rem);
  }
}

@media (max-width: 640px) {
  .series-workbench-main {
    padding-top: 1rem;
  }

  .series-page-heading h1 {
    font-size: 1.5rem;
  }

  .series-heading-actions,
  .series-form-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .series-list-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .series-list-heading .secondary-action {
    width: 100%;
  }

  .series-card {
    padding: 0.9rem;
  }

  .series-input,
  .series-textarea {
    font-size: 16px;
  }
}

.dark .series-input,
.dark .series-textarea,
.dark .series-knowledge-projection {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .series-card-active {
  border-color: #1d4ed8;
}

@media (prefers-reduced-motion: reduce) {
  .series-skeleton-row {
    animation: none;
  }
}
</style>
