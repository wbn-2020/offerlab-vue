<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <!-- 编辑工具条 -->
    <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6">
      <div class="editor-toolbar-inner max-w-6xl mx-auto flex items-center justify-between">
        <div class="editor-toolbar-title flex items-center gap-4">
          <button
            @click="goBack"
            class="editor-back-button p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            ← 返回
          </button>
          <h1 class="editor-heading text-xl font-bold text-slate-900 dark:text-slate-100">
            {{ isEditing ? '编辑内容' : '发布内容' }}
          </h1>
        </div>
        <div class="editor-toolbar-actions flex flex-wrap items-center justify-end gap-3">
          <select
            v-if="!isEditing && serverDrafts.length"
            v-model="selectedDraftId"
            @change="loadSelectedDraft"
            class="draft-select"
            aria-label="服务端草稿"
          >
            <option value="">服务端草稿</option>
            <option v-for="draft in serverDrafts" :key="draft.id" :value="String(draft.id)">{{ draftTitle(draft) }}</option>
          </select>
          <button
            @click="saveDraft"
            :disabled="isSavingDraft || isLoadingPost"
            class="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            {{ isSavingDraft ? '保存中...' : '保存草稿' }}
          </button>
          <div class="publish-action-group">
            <button
              @click="publishPost"
              :disabled="isPublishDisabled"
              :title="publishDisabledReason || undefined"
              :aria-describedby="publishDisabledReason ? 'publish-disabled-reason' : undefined"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {{ isPublishing ? (isEditing ? '保存中...' : '发布中...') : (isEditing ? '保存修改' : '发布') }}
            </button>
            <p
              v-if="publishDisabledReason && !isPublishing"
              id="publish-disabled-reason"
              class="publish-hint"
              role="status"
              aria-live="polite"
            >
              {{ publishDisabledReason }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <main v-if="isForbiddenEdit" class="mx-auto flex min-h-[calc(100vh-160px)] max-w-4xl items-center px-4 py-10">
      <section class="w-full rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/60 dark:bg-slate-900">
        <p class="text-sm font-semibold text-amber-600 dark:text-amber-400">无法编辑该帖子</p>
        <h2 class="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-50">只能编辑本人发布的内容</h2>
        <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          当前账号不是这篇帖子的作者。你可以返回来源页面继续浏览，或回到个人主页管理自己的草稿和发布内容。
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" class="forbidden-secondary-action" @click="goBack">返回来源页</button>
          <RouterLink to="/me" class="forbidden-primary-action">我的主页</RouterLink>
          <RouterLink to="/" class="forbidden-secondary-action">回到首页</RouterLink>
        </div>
      </section>
    </main>

    <div v-else class="editor-main-shell max-w-6xl mx-auto p-6">
      <div class="space-y-6">
        <!-- 标题输入 -->
        <div class="flex flex-col gap-2">
          <input
            v-model="form.title"
            type="text"
            :placeholder="activePostType.placeholder"
            data-field="title"
            class="editor-title-input text-3xl font-bold px-4 py-3 border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          <p v-if="fieldErrors.title" class="field-error px-4">{{ fieldErrors.title }}</p>
          <div class="text-sm text-slate-500 dark:text-slate-400 px-4">
            {{ form.title.length }} / 200 字符
          </div>
        </div>

        <!-- 内容类型 Tab -->
        <div class="content-type-tabs flex min-w-0 max-w-full gap-2 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800">
          <button
            v-for="type in postTypes"
            :key="type.value"
            @click="form.postType = type.value"
            :disabled="isEditing"
            :class="[
              'content-type-tab shrink-0 whitespace-nowrap px-4 py-3 font-medium text-sm transition-colors border-b-2',
              form.postType === type.value
                ? 'text-primary-600 border-primary-600'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            ]"
          >
            {{ type.label }}
          </button>
        </div>

        <section class="template-helper mx-4">
          <div>
            <p>发布模板</p>
            <strong>{{ activeTemplate.title }}</strong>
            <span>{{ activeTemplate.description }}</span>
          </div>
          <button type="button" :disabled="Boolean(form.content.trim())" @click="applyActiveTemplate">
            {{ form.content.trim() ? '正文已有内容' : '套用模板' }}
          </button>
        </section>

        <!-- 领域选择 -->
        <div class="px-4 flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">频道</label>
          <select
            v-model="selectedDomain"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option v-for="d in editorDomainOptions" :key="d.domain" :value="d.domain">
              {{ d.icon }} {{ d.domainName }} — {{ d.description }}
            </option>
          </select>
          <p class="domain-source-note">
            <span>{{ editorDomainSourceSummary }}</span>
            <span v-if="selectedDomainMeta?.postingNotice"> · {{ selectedDomainMeta.postingNotice }}</span>
          </p>
        </div>

        <section v-if="selectedDomain === DOMAIN.CAREER" class="anonymous-career-toggle mx-4">
          <div>
            <p>匿名发布</p>
            <span>适合不便公开身份的职场内容，作者信息由服务端按权限处理。</span>
          </div>
          <label class="anonymous-career-switch">
            <input v-model="anonymousCareerPost" type="checkbox" aria-label="匿名发布职场内容" />
            <span></span>
          </label>
        </section>

        <!-- 内容元数据 -->
        <div class="px-4">
          <PostMeta v-model="form.extension" :type="form.postType" />
          <div v-if="metaErrorMessages.length" data-field="company" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <p v-for="message in metaErrorMessages" :key="message">{{ message }}</p>
          </div>
        </div>

        <section class="mx-4 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
          <div class="space-y-4">
            <EditorQualityChecklist
              :result="qualityChecklistResult"
              title="创作质量检查清单 Lite"
              eyebrow="发布前检查"
              tone="soft"
            />

            <section class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-sm font-extrabold text-slate-900 dark:text-slate-100">当前发布门禁</h2>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Lite 清单只做提示；发布按钮继续沿用当前基础校验与结构化要求，不额外新增服务端依赖。</p>
                </div>
                <span :class="['quality-score', blockingQualityIssues.length ? 'quality-score-warn' : 'quality-score-ok']">
                  {{ passedQualityCount }}/{{ qualityChecks.length }}
                </span>
              </div>
              <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {{ publishDisabledReason || '当前基础门禁已满足，可继续优化摘要、标签、匿名提示和合集归属。' }}
              </p>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in publishGateItems"
                  :key="item.key"
                  class="quality-row"
                  :class="item.passed ? 'quality-row-ok' : item.required ? 'quality-row-blocking' : ''"
                >
                  <span>{{ item.passed ? '✓' : item.required ? '!' : '·' }}</span>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.description }}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <EditorPreviewPanel
            :preview="editorPreviewModel"
            eyebrow="公开卡片预览"
            title="发布前预览与公开卡片预览"
            description="基于当前标题、正文、频道、标签、匿名状态和合集归属做前端实时映射；发布建议面板开启后才会触发建议请求。"
          />
        </section>

        <section class="stage3-assist-panel mx-4">
          <div class="stage3-assist-head">
            <div>
              <p class="stage3-assist-kicker">发布体验助手</p>
              <h2>写作助手</h2>
              <p>{{ stageThreeAssistHeadline }}</p>
            </div>
            <div class="stage3-assist-head-actions">
              <span :class="['assist-status-pill', `assist-status-${stageThreeAssistStatus}`]">
                {{ stageThreeAssistStatusLabel }}
              </span>
              <button type="button" class="assist-head-button" @click="toggleAssistPanelEnabled">
                {{ assistPanelEnabled ? '关闭建议' : '开启建议' }}
              </button>
              <button
                type="button"
                class="assist-head-button"
                :disabled="!authStore.isLoggedIn || !assistPanelEnabled || isStageThreeAssistLoading"
                @click="loadStageThreeAssist(true)"
              >
                {{ isStageThreeAssistLoading ? '加载中...' : '刷新建议' }}
              </button>
            </div>
          </div>

          <div v-if="!authStore.isLoggedIn" class="stage3-assist-state">
            <strong>未登录</strong>
            <p>登录后可获得写作助手、质量评分、标签/话题建议和合集归属建议。</p>
          </div>
          <div v-else-if="!assistPanelEnabled" class="stage3-assist-state">
            <strong>建议已关闭</strong>
            <p>发布建议默认关闭。当前仅保留发布检查、草稿保护和手动填写流程；显式开启后，如后端未配置建议服务将自动回退到规则建议。</p>
          </div>
          <div v-else-if="isStageThreeAssistLoading" class="stage3-assist-state">
            <strong>加载中...</strong>
            <p>正在生成写作助手、质量评分和合集归属建议。</p>
          </div>
          <div v-else-if="stageThreeAssistStatus === 'failed'" class="stage3-assist-state stage3-assist-state-error">
            <strong>建议暂时不可用</strong>
            <p>{{ stageThreeAssistError || '当前建议加载失败，你仍然可以继续编辑并依赖现有发布检查。' }}</p>
          </div>
          <div v-else class="stage3-assist-grid">
            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>写作助手</strong>
                <span v-if="stageThreeAssistStatus === 'degraded'">规则降级</span>
              </div>
              <p class="stage3-card-copy">{{ assistSummaryText }}</p>
              <div class="stage3-actions">
                <button type="button" :disabled="!assistSummaryText" @click="applyAssistSummary">
                  {{ assistSummaryAdopted ? '已采纳摘要建议' : '采纳摘要建议' }}
                </button>
                <button type="button" @click="copyKnowledgeAssist">复制辅助草稿</button>
              </div>
            </article>

            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>质量评分</strong>
                <span class="stage3-quality-badge">{{ qualityScoreValue }}</span>
              </div>
              <p class="stage3-card-copy">{{ qualityScoreLabel }} · {{ qualityScoreReason }}</p>
              <div class="stage3-metric-list">
                <div v-for="metric in assistQualityMetrics" :key="metric.label" class="stage3-metric-row">
                  <div>
                    <strong>{{ metric.label }}</strong>
                    <p>{{ metric.detail }}</p>
                  </div>
                  <span>{{ metric.score }}</span>
                </div>
              </div>
            </article>

            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>标签建议</strong>
                <span>{{ displayTagSuggestions.length }} 条</span>
              </div>
              <div v-if="displayTagSuggestions.length" class="stage3-chip-list">
                <button
                  v-for="item in displayTagSuggestions"
                  :key="item.id"
                  type="button"
                  :class="['stage3-chip', item.adopted ? 'stage3-chip-adopted' : '']"
                  @click="applyTagSuggestion(item)"
                >
                  <span>{{ item.label }}</span>
                  <small>{{ item.adopted ? '已采纳' : '采纳' }}</small>
                </button>
              </div>
              <p v-else class="stage3-empty-copy">继续补充正文后，这里会出现更贴合内容的标签建议。</p>
            </article>

            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>话题建议</strong>
                <span>{{ displayTopicSuggestions.length }} 条</span>
              </div>
              <div v-if="displayTopicSuggestions.length" class="stage3-chip-list">
                <button
                  v-for="item in displayTopicSuggestions"
                  :key="item.id"
                  type="button"
                  :class="['stage3-chip', item.adopted ? 'stage3-chip-adopted' : '']"
                  @click="applyTopicSuggestion(item)"
                >
                  <span>{{ item.label }}</span>
                  <small>{{ item.adopted ? '已采纳' : '采纳' }}</small>
                </button>
              </div>
              <div v-if="selectedTopicNames.length" class="stage3-selected-list">
                <span v-for="topic in selectedTopicNames" :key="topic" class="stage3-selected-pill">
                  {{ topic }}
                  <button type="button" @click="removeTopicSuggestion(topic)">×</button>
                </span>
              </div>
              <p v-else class="stage3-empty-copy">话题建议会写入扩展字段，帮助发现页、话题页和合集工作台持续聚合同主题内容。</p>
            </article>

            <article class="stage3-card stage3-card-series">
              <div class="stage3-card-head">
                <strong>合集归属</strong>
                <RouterLink to="/series/workbench">合集工作台</RouterLink>
              </div>
              <select
                v-model="selectedSeriesId"
                class="stage3-series-select"
                :disabled="isSeriesLoading"
              >
                <option value="">暂不归入合集</option>
                <option v-for="item in seriesRecords" :key="item.id" :value="item.id">
                  {{ item.title }} · {{ item.progress.label }}
                </option>
              </select>
              <p class="stage3-card-copy">
                {{ selectedSeriesRecord ? selectedSeriesRecord.progress.label : '未归档到合集，适合单篇独立发布。' }}
              </p>
              <div v-if="assistSeriesHints.length" class="stage3-hint-list">
                <span v-for="item in assistSeriesHints" :key="`${item.id || 'new'}-${item.title}`">
                  {{ item.title }}<small>{{ item.progressText }}</small>
                </span>
              </div>
              <p v-if="seriesSource === 'fallback'" class="stage3-empty-copy">合集列表当前来自本地 fallback，未依赖真实后端。</p>
            </article>
          </div>
        </section>

        <section v-if="showStageTwoPublishingAssist" class="knowledge-assist mx-4">
          <div class="knowledge-assist-head">
            <div>
              <h2>内容整理辅助</h2>
              <p>发布前先把内容整理成社区可搜索、可讨论、可复用的知识资产。</p>
            </div>
            <span>{{ knowledgeAssistReadiness }}</span>
          </div>
          <div class="knowledge-assist-grid">
            <article>
              <strong>摘要建议</strong>
              <p>{{ knowledgeSummary }}</p>
            </article>
            <article>
              <strong>FAQ 候选</strong>
              <p>{{ knowledgeFaqHint }}</p>
            </article>
            <article>
              <strong>知识卡候选</strong>
              <p>{{ knowledgeCardHint }}</p>
            </article>
          </div>
          <div class="knowledge-assist-actions">
            <button type="button" @click="copyKnowledgeAssist">复制沉淀草稿</button>
            <button type="button" @click="fillSummaryFromAssist">写入摘要字段</button>
          </div>
        </section>

        <!-- 标签输入 -->
        <div class="px-4 flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">标签</label>
          <div class="tag-entry-row flex gap-2 mb-2">
            <input
              v-model="tagInput"
              type="text"
              :placeholder="tagInputPlaceholder"
              @keydown.enter="addTag"
              class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              data-field="tags"
            />
            <button
              type="button"
              @click="addTag"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              添加
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(tag, idx) in selectedTags"
              :key="idx"
              class="flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(idx)"
                class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
              >
                ×
              </button>
            </div>
          </div>
          <p v-if="fieldErrors.tags" class="field-error">{{ fieldErrors.tags }}</p>
        </div>

        <!-- Markdown 编辑器 -->
        <div class="px-4" data-field="content">
          <MarkdownEditor v-model="form.content" :max-length="CONTENT_MAX_LENGTH" />
          <p v-if="fieldErrors.content" class="field-error mt-2">{{ fieldErrors.content }}</p>
        </div>

        <section v-if="publishFailure" class="publish-diagnostic mx-4" role="alert">
          <div>
            <p class="publish-diagnostic-kicker">发布未完成，草稿已保护</p>
            <h2>{{ publishFailure.title }}</h2>
            <p>{{ publishFailure.message }}</p>
            <span v-if="publishFailure.traceId">Trace: {{ publishFailure.traceId }}</span>
          </div>
          <ul>
            <li v-for="item in publishFailure.actions" :key="item">{{ item }}</li>
          </ul>
          <div class="publish-diagnostic-actions">
            <button type="button" @click="saveDraft">再保存一次草稿</button>
            <button v-if="canRetryWithTextTagsOnly" type="button" @click="retryWithTextTagsOnly">保留文本标签重试</button>
            <RouterLink to="/me">查看我的草稿</RouterLink>
          </div>
        </section>

        <!-- 封面图 -->
        <div class="px-4 flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">封面图（可选）</label>
          <input
            v-model="form.coverUrl"
            type="url"
            placeholder="输入图片 URL..."
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div v-if="form.coverUrl" class="mt-2 rounded-lg overflow-hidden max-h-64">
            <img :src="form.coverUrl" :alt="form.title" class="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { onBeforeRouteLeave, useRouter, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { EditorPreviewPanel } from '@/components/editor-preview'
import { EditorQualityChecklist } from '@/components/editor-quality'
import MarkdownEditor from '@/components/post/MarkdownEditor.vue'
import PostMeta from '@/components/post/PostMeta.vue'
import { BizException, getErrorMessage, getResultMessage } from '@/api/client'
import { contentAssistApi, type ContentAssistRequest } from '@/api/contentAssist'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { domainApi, localDomainConfigs, type DomainConfigSource, type PublicDomainConfig } from '@/api/domains'
import { postApi, type PostDraft } from '@/api/post'
import type { ContentAssistQualityMetric, ContentAssistResult, ContentAssistSuggestion } from '@/api/types'
import { toast } from 'vue-sonner'
import { mapEditorDraftToPreview } from '@/utils/editorPreview'
import { buildEditorQualityChecklist } from '@/utils/editorQualityChecklist'
import { safeStorage } from '@/utils/safeStorage'
import { hasLowQualityVisibleText, isSyntheticVisibleText, sanitizePublicVisibleText, sanitizeVisibleText } from '@/utils/textQuality'
import { useAuthStore } from '@/stores/auth'
import {
  ALL_CONTENT_TYPES,
  COMMUNITY_CONTENT_TYPES,
  DEFAULT_POST_TYPE,
  LEGACY_CONTENT_TYPES,
  contentTypeCodeOf,
  getContentTypeOption,
  isLegacyInterviewType,
} from '@/utils/contentTypes'
import type { PostTypeValue } from '@/utils/contentTypes'
import { DOMAIN, DOMAIN_OPTIONS, normalizeDomain } from '@/utils/domains'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const LOCAL_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000
const CONTENT_MAX_LENGTH = 50000
const AUTO_SAVE_DEBOUNCE_MS = 1500

const postTypes = computed(() => {
  const active = Number(form.value.postType)
  const legacyActive = LEGACY_CONTENT_TYPES.some((item) => item.value === active)
  return legacyActive ? ALL_CONTENT_TYPES : COMMUNITY_CONTENT_TYPES
})

type EditorForm = {
  postType: PostTypeValue
  title: string
  content: string
  tags: number[]
  extension: Record<string, any>
  coverUrl: string
}

type PublishFailure = {
  title: string
  message: string
  traceId: string
  actions: string[]
}

const form = ref<EditorForm>({
  postType: DEFAULT_POST_TYPE,
  title: '',
  content: '',
  tags: [],
  extension: {},
  coverUrl: ''
})

const tagInput = ref('')
const selectedTags = ref<string[]>([])
const selectedDomain = ref<number>(DOMAIN.LIFESTYLE)
const anonymousCareerPost = ref(false)
const isPublishing = ref(false)
const isEditing = ref(false)
const isLoadingPost = ref(false)
const isForbiddenEdit = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const publishFailure = ref<PublishFailure | null>(null)
const isSavingDraft = ref(false)
const serverDraftId = ref('')
const selectedDraftId = ref('')
const serverDrafts = ref<PostDraft[]>([])
const lastDraftSignature = ref('')
const showStageTwoPublishingAssist = false
const editorDomains = ref<PublicDomainConfig[]>([...localDomainConfigs])
const domainSource = ref<DomainConfigSource>('fallback')
const seriesRecords = ref<ContentSeriesRecord[]>([])
const seriesSource = ref<'remote' | 'fallback'>('fallback')
const isSeriesLoading = ref(false)
const selectedSeriesId = ref('')
const assistPanelEnabled = ref(false)
const stageThreeAssist = ref<ContentAssistResult | null>(null)
const isStageThreeAssistLoading = ref(false)
const stageThreeAssistError = ref('')
const draftOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const fallbackReturnPath = computed(() => authStore.isLoggedIn ? '/me' : '/')
const stageThreeAssistPreferenceKey = computed(() => `editor_stage3_assist:${draftOwner.value}`)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let stageThreeAssistTimer: ReturnType<typeof setTimeout> | null = null
let stageThreeAssistRequestId = 0

type QualityCheck = {
  key: string
  title: string
  description: string
  passed: boolean
  required: boolean
}

type PublishTemplate = {
  title: string
  description: string
  content: string
}

const PUBLISH_TEMPLATES: Record<string, PublishTemplate> = {
  TECH_ARTICLE: {
    title: '攻略清单模板',
    description: '适合整理步骤、方法、避坑清单和可照着执行的经验。',
    content: `## 背景

## 核心问题

## 方法步骤

## 清单与提醒

## 适合人群
`,
  },
  PROJECT_REVIEW: {
    title: '复盘记录模板',
    description: '复盘一次项目、活动、经历或决策，记录过程、结果和下一步。',
    content: `## 背景

## 目标

## 过程

## 难点与取舍

## 指标与结果

## 下一步
`,
  },
  SYSTEM_DESIGN: {
    title: '观点讨论模板',
    description: '适合表达观察、判断和取舍，并邀请大家讨论。',
    content: `## 观点

## 背景

## 我的理由

## 可能的反例

## 想听听大家怎么看
`,
  },
  INTERVIEW_RECAP: {
    title: '面试复盘模板',
    description: '职场经验频道保留模板，记录问题、追问、表达卡点和后续补强。',
    content: `## 面试背景

## 被问到的问题

## 追问路径

## 回答卡点

## 可复用 STAR 素材

## 后续补强计划
`,
  },
  PITFALL: {
    title: '图文笔记模板',
    description: '适合轻量记录灵感、日常观察、实用片段和图文式分享。',
    content: `## 这条笔记想分享什么

## 关键细节

## 图片或素材说明

## 可以怎么用
`,
  },
  QUESTION: {
    title: '问题求助模板',
    description: '把问题、背景限制、已尝试方法和希望大家怎么帮说清楚。',
    content: `## 问题是什么

## 背景和限制

## 我已经尝试过什么

## 想获得什么帮助

## 相关频道或标签线索
`,
  },
  RESOURCE: {
    title: '资源推荐模板',
    description: '说明资源适用人群、使用方式、优缺点和推荐理由。',
    content: `## 资源简介

## 适用场景

## 使用方式

## 优点与限制

## 推荐实践
`,
  },
  NOTE: {
    title: '经验分享模板',
    description: '快速记录亲身经历、做法、结果和可复用的提醒。',
    content: `## 经历背景

## 我怎么做

## 结果

## 给后来者的提醒
`,
  },
}

const extensionValue = computed<Record<string, any>>(() => form.value.extension && typeof form.value.extension === 'object'
  ? form.value.extension as Record<string, any>
  : {})
const normalizedTitle = computed(() => form.value.title.trim())
const normalizedContent = computed(() => form.value.content.trim())
const normalizedTags = computed(() => selectedTags.value.map((tag) => tag.trim()).filter(Boolean))
const contentLength = computed(() => form.value.content.length)
const isContentOverLimit = computed(() => contentLength.value > CONTENT_MAX_LENGTH)
const activePostType = computed(() => getContentTypeOption(form.value.postType))
const activeTypeCode = computed(() => contentTypeCodeOf(form.value.postType))
const activeTemplate = computed(() => PUBLISH_TEMPLATES[activeTypeCode.value] || PUBLISH_TEMPLATES.NOTE)
const isQuestionPost = computed(() => activeTypeCode.value === 'QUESTION')
const isInterviewPost = computed(() => isLegacyInterviewType(form.value.postType))
const hasCompany = computed(() => Boolean(String(extensionValue.value.company || '').trim()))
const hasPosition = computed(() => Boolean(String(extensionValue.value.position || '').trim()))
const hasInterviewRound = computed(() => Number(extensionValue.value.interviewRounds || 0) > 0)
const hasInterviewResult = computed(() => Number(extensionValue.value.interviewResult || 0) > 0)
const hasContentAny = (keywords: string[]) => keywords.some((keyword) => normalizedContent.value.includes(keyword))
const requiresStructuredExperience = computed(() => ['PROJECT_REVIEW', 'PITFALL'].includes(activeTypeCode.value))
const hasBackgroundSection = computed(() => hasContentAny(['背景', '现象', '上下文']))
const hasProblemSection = computed(() => hasContentAny(['难点', '根因', '问题', '挑战', '瓶颈']))
const hasSolutionSection = computed(() => hasContentAny(['方案', '修复', '实现', '设计', '落地']))
const hasResultSection = computed(() => hasContentAny(['结果', '指标', '收益', '提升', '降低', '复盘']))
const hasQuestionBackground = computed(() => hasContentAny(['背景', '限制', '上下文', '场景', '情况']))
const hasQuestionTried = computed(() => hasContentAny(['尝试', '试过', '已尝试', '已经试', '做过', '查过']))
const hasQuestionHelp = computed(() => hasContentAny(['想获得', '希望', '请教', '建议', '推荐', '怎么看', '怎么选']))
const hasQuestionTopicClue = computed(() => normalizedTags.value.length > 0 || selectedTopicNames.value.length > 0 || hasContentAny(['标签', '话题', '频道']))
const structuredQualityChecks = computed<QualityCheck[]>(() => {
  if (!requiresStructuredExperience.value) return []
  return [
    {
      key: 'structured-background',
      title: '背景或现象',
      description: '项目复盘/故障记录需要交代背景、现象或上下文。',
      passed: hasBackgroundSection.value,
      required: true,
    },
    {
      key: 'structured-problem',
      title: '难点或根因',
      description: '需要说明关键难点、根因、瓶颈或主要挑战。',
      passed: hasProblemSection.value,
      required: true,
    },
    {
      key: 'structured-solution',
      title: '方案与落地',
      description: '需要写清方案、修复、实现或落地过程。',
      passed: hasSolutionSection.value,
      required: true,
    },
    {
      key: 'structured-result',
      title: '结果或指标',
      description: '需要补充结果、指标、收益、提升或复盘结论。',
      passed: hasResultSection.value,
      required: true,
    },
  ]
})
const questionQualityChecks = computed<QualityCheck[]>(() => {
  if (!isQuestionPost.value) return []
  return [
    {
      key: 'question-background',
      title: '问题背景',
      description: '补充背景、限制或具体场景，别人更容易判断该怎么帮。',
      passed: hasQuestionBackground.value,
      required: false,
    },
    {
      key: 'question-tried',
      title: '已尝试方法',
      description: '写出已经试过什么、哪里卡住，避免大家重复给出无效建议。',
      passed: hasQuestionTried.value,
      required: false,
    },
    {
      key: 'question-help',
      title: '想获得的帮助',
      description: '说明你想要建议、推荐、经验征集、选择讨论还是问题排查。',
      passed: hasQuestionHelp.value,
      required: false,
    },
    {
      key: 'question-topic-clue',
      title: '标签或话题线索',
      description: '补一个场景、人群或问题类型标签，也可以采纳相关话题建议。',
      passed: hasQuestionTopicClue.value,
      required: false,
    },
  ]
})

const qualityChecks = computed<QualityCheck[]>(() => [
  {
    key: 'title',
    title: '标题清晰',
    description: '至少 8 个字符，方便搜索和列表快速判断主题。',
    passed: normalizedTitle.value.length >= 8 && normalizedTitle.value.length <= 200,
    required: true,
  },
  {
    key: 'content',
    title: '正文完整',
    description: `${activePostType.value.label}正文至少 ${activePostType.value.minContentLength} 个字符，且不超过 ${CONTENT_MAX_LENGTH} 字。`,
    passed: normalizedContent.value.length >= activePostType.value.minContentLength && !isContentOverLimit.value,
    required: true,
  },
  {
    key: 'company',
    title: '实体信息',
    description: '旧版经验需要实体字段，便于历史知识库和主题包兼容。',
    passed: !isInterviewPost.value || hasCompany.value,
    required: isInterviewPost.value,
  },
  {
    key: 'position',
    title: '场景信息',
    description: '旧版经验需要场景字段，便于历史知识库按场景筛选。',
    passed: !isInterviewPost.value || hasPosition.value,
    required: isInterviewPost.value,
  },
  {
    key: 'tags',
    title: '内容标签',
    description: '至少 1 个标签；标签用于搜索和标签页聚合，话题会写入扩展字段，用于发现页入口和后续同主题聚合。',
    passed: normalizedTags.value.length >= (isInterviewPost.value ? 2 : 1),
    required: true,
  },
  {
    key: 'round',
    title: '轮次或结果',
    description: '旧版经验补充轮次或结果，可增强历史趋势和知识库可信度。',
    passed: !isInterviewPost.value || hasInterviewRound.value || hasInterviewResult.value,
    required: false,
  },
  ...structuredQualityChecks.value,
  ...questionQualityChecks.value,
])
const blockingQualityIssues = computed(() => qualityChecks.value.filter((item) => item.required && !item.passed))
const passedQualityCount = computed(() => qualityChecks.value.filter((item) => item.passed).length)
const publishDisabledReason = computed(() => {
  if (isLoadingPost.value) return '帖子内容加载完成后才能发布'
  if (blockingQualityIssues.value.length === 0) return ''
  return `请先补齐：${blockingQualityIssues.value.map((item) => item.title).join('、')}`
})
const isPublishDisabled = computed(() => isPublishing.value || isLoadingPost.value || blockingQualityIssues.value.length > 0)
const canRetryWithTextTagsOnly = computed(() => normalizedTags.value.length > 0 && form.value.tags.length > 0)
const tagInputPlaceholder = computed(() => (
  isQuestionPost.value
    ? '添加场景 / 人群 / 问题类型标签'
    : '输入标签，按 Enter 添加'
))
const metaErrorMessages = computed(() => ['company', 'position', 'interviewRound', 'round', 'yearsOfExp', 'interviewResult', 'interviewRounds', 'extension']
  .map((field) => fieldErrors.value[field])
  .filter(Boolean))
const cleanContentLines = computed(() => normalizedContent.value
  .replace(/```[\s\S]*?```/g, ' ')
  .split(/\r?\n+/)
  .map((line) => line.replace(/[#>*`_\-[\]()]/g, ' ').replace(/\s+/g, ' ').trim())
  .filter((line) => line.length >= 8)
  .slice(0, 8))
const knowledgeSummary = computed(() => {
  const explicitSummary = sanitizeVisibleText(extensionValue.value.summary)
  if (explicitSummary) return explicitSummary
  const source = cleanContentLines.value[0] || normalizedTitle.value
  if (!source) return '正文完善后会自动给出摘要建议。'
  return source.length > 90 ? `${source.slice(0, 90)}...` : source
})
const qualityChecklistResult = computed(() => buildEditorQualityChecklist({
  title: normalizedTitle.value,
  content: normalizedContent.value,
  domain: selectedDomain.value,
  domainLabel: selectedDomainMeta.value?.domainName,
  tags: selectedTags.value,
  anonymous: anonymousCareerPost.value,
  seriesId: selectedSeriesId.value,
  seriesTitle: selectedSeriesRecord.value?.title,
  minContentLength: Math.max(80, activePostType.value.minContentLength),
}))
const publishGateItems = computed(() => qualityChecks.value.filter((item) => item.required || !item.passed))
const editorPreviewModel = computed(() => mapEditorDraftToPreview(
  {
    title: form.value.title,
    content: form.value.content,
    domain: selectedDomain.value,
    tags: form.value.tags,
    tagLabels: selectedTags.value,
    anonymousCareerPost: anonymousCareerPost.value,
    selectedSeriesId: selectedSeriesId.value,
    summary: extensionValue.value.summary,
    extension: extensionValue.value,
  },
  {
    domains: editorDomainOptions.value,
    seriesRecords: seriesRecords.value,
    fallbackSummary: knowledgeSummary.value,
  },
))
const knowledgeFaqHint = computed(() => {
  const questionLine = cleanContentLines.value.find((line) => /[？?]|怎么|如何|为什么|排查|解决/.test(line))
  if (questionLine) return questionLine.length > 80 ? `${questionLine.slice(0, 80)}...` : questionLine
  if (normalizedTitle.value) return `可以围绕“${normalizedTitle.value.slice(0, 36)}”补一个问题和结论。`
  return '补充一个真实问题、排查过程和最终结论后，可沉淀为 FAQ。'
})
const knowledgeCardHint = computed(() => {
  const techTags = normalizedTags.value.slice(0, 4).join('、') || '内容标签'
  if (normalizedContent.value.length >= activePostType.value.minContentLength) {
    return `${activePostType.value.label} · ${techTags} · 可沉淀为摘要、FAQ 和相似内容推荐素材。`
  }
  return `继续补充背景、过程、结论和复盘，发布后可形成 ${activePostType.value.label} 知识卡。`
})
const knowledgeAssistReadiness = computed(() => blockingQualityIssues.value.length ? '待补齐' : '可沉淀')
const knowledgeAssistMarkdown = computed(() => [
  `# ${normalizedTitle.value || '待补充标题的内容'}`,
  '',
  `内容类型：${activePostType.value.label}`,
  normalizedTags.value.length ? `内容标签：${normalizedTags.value.join('、')}` : '内容标签：待补充',
  '',
  '## 摘要建议',
  knowledgeSummary.value,
  '',
  '## FAQ 候选',
  knowledgeFaqHint.value,
  '',
  '## 知识卡候选',
  knowledgeCardHint.value,
].join('\n'))

const topicNamesFromExtension = (value: Record<string, any>) => {
  const raw = Array.isArray(value.topicNames)
    ? value.topicNames
    : Array.isArray(value.topics)
      ? value.topics
      : []
  return raw.map((item) => sanitizeVisibleText(item)).filter(Boolean)
}

const editorDomainOptions = computed(() => editorDomains.value.length ? editorDomains.value : localDomainConfigs)
const selectedDomainMeta = computed(() => (
  editorDomainOptions.value.find((item) => Number(item.domain) === Number(selectedDomain.value))
  ?? localDomainConfigs.find((item) => Number(item.domain) === Number(selectedDomain.value))
  ?? localDomainConfigs[0]
))
const editorDomainSourceSummary = computed(() => (
  domainSource.value === 'remote'
    ? `频道来源已同步 /api/v1/domains · 当前 ${selectedDomainMeta.value?.domainName || '生活方式'}`
    : `接口暂未返回，当前使用本地 fallback · 当前 ${selectedDomainMeta.value?.domainName || '生活方式'}`
))
const selectedTopicNames = computed(() => topicNamesFromExtension(extensionValue.value))
const selectedSeriesRecord = computed(() => (
  seriesRecords.value.find((item) => String(item.id) === String(selectedSeriesId.value)) || null
))
const assistSummaryText = computed(() => stageThreeAssist.value?.summary || knowledgeSummary.value)
const assistSummaryAdopted = computed(() => {
  const currentSummary = sanitizeVisibleText(extensionValue.value.summary)
  return Boolean(currentSummary && currentSummary === assistSummaryText.value)
})
const fallbackQualityScore = computed(() => {
  const ratio = passedQualityCount.value / Math.max(qualityChecks.value.length, 1)
  const tagBonus = Math.min(12, normalizedTags.value.length * 4)
  const structureBonus = Math.min(10, structuredQualityChecks.value.filter((item) => item.passed).length * 2.5)
  return Math.max(28, Math.min(100, Math.round(ratio * 78 + tagBonus + structureBonus)))
})
const fallbackAssistQualityMetrics = computed<ContentAssistQualityMetric[]>(() => qualityChecks.value.slice(0, 4).map((item) => ({
  label: item.title,
  score: item.passed ? 100 : item.required ? 42 : 66,
  detail: item.description,
})))
const assistQualityMetrics = computed<ContentAssistQualityMetric[]>(() => (
  stageThreeAssist.value?.qualityMetrics?.length
    ? stageThreeAssist.value.qualityMetrics
    : fallbackAssistQualityMetrics.value
))
const qualityScoreValue = computed(() => stageThreeAssist.value?.qualityScore ?? fallbackQualityScore.value)
const qualityScoreLabel = computed(() => {
  if (stageThreeAssist.value?.qualityLabel) return stageThreeAssist.value.qualityLabel
  if (qualityScoreValue.value >= 85) return '可直接发布'
  if (qualityScoreValue.value >= 65) return '再补一轮'
  return '建议补充'
})
const qualityScoreReason = computed(() => (
  stageThreeAssist.value?.qualityReason
  || (qualityScoreValue.value >= 85
    ? '关键信息较完整，发布后也适合纳入合集沉淀。'
    : qualityScoreValue.value >= 65
      ? '结构已成型，补一轮标签或结果会更稳。'
      : '建议先补背景、步骤和结论，再进入发布。')
))
const displayTagSuggestions = computed(() => (stageThreeAssist.value?.tagSuggestions || []).map((item) => ({
  ...item,
  adopted: normalizedTags.value.some((tag) => tag.toLowerCase() === item.label.toLowerCase()),
})))
const displayTopicSuggestions = computed(() => (stageThreeAssist.value?.topicSuggestions || []).map((item) => ({
  ...item,
  adopted: selectedTopicNames.value.some((topic) => topic.toLowerCase() === item.label.toLowerCase()),
})))
const assistSeriesHints = computed(() => stageThreeAssist.value?.seriesHints || [])
const stageThreeAssistStatus = computed(() => {
  if (!authStore.isLoggedIn) return 'unauthenticated'
  if (!assistPanelEnabled.value) return 'disabled'
  if (isStageThreeAssistLoading.value) return 'loading'
  if (stageThreeAssist.value?.status === 'degraded') return 'degraded'
  if (stageThreeAssist.value?.status === 'failed' || stageThreeAssistError.value) return 'failed'
  return 'ready'
})
const stageThreeAssistStatusLabel = computed(() => {
  if (stageThreeAssistStatus.value === 'unauthenticated') return '未登录'
  if (stageThreeAssistStatus.value === 'disabled') return '建议关闭'
  if (stageThreeAssistStatus.value === 'loading') return '加载中'
  if (stageThreeAssistStatus.value === 'degraded') return '规则降级'
  if (stageThreeAssistStatus.value === 'failed') return '加载失败'
  return '建议采纳'
})
const stageThreeAssistHeadline = computed(() => {
  if (stageThreeAssistStatus.value === 'unauthenticated') return '登录后可获得写作建议、标签/话题建议和合集工作台联动。'
  if (stageThreeAssistStatus.value === 'disabled') return '发布建议默认关闭，当前仅保留发布检查、草稿保护和合集选择；显式开启后，如后端未配置建议服务会自动回退到规则建议。'
  if (stageThreeAssistStatus.value === 'loading') return '正在根据标题、正文、标签和领域生成发布建议。'
  if (stageThreeAssistStatus.value === 'degraded') return stageThreeAssist.value?.fallbackReason || '建议接口未返回结果，当前使用本地规则降级建议。'
  if (stageThreeAssistStatus.value === 'failed') return stageThreeAssistError.value || '建议暂时不可用，你仍然可以继续发布。'
  if (!stageThreeAssist.value) return '发布建议已开启，开启后会在标题、正文、标签或频道变化时自动刷新建议；也可以手动点击“刷新建议”。后端未配置建议服务时会回退到规则建议。'
  return '围绕写作助手、质量评分、标签/话题建议和合集归属整理发布前动作。'
})

const clearFieldErrors = () => {
  fieldErrors.value = {}
  publishFailure.value = null
}

const applyEditorExtension = (updates: Record<string, unknown>) => {
  const nextExtension: Record<string, unknown> = {
    ...extensionValue.value,
    ...updates,
  }
  Object.keys(nextExtension).forEach((key) => {
    const value = nextExtension[key]
    if (
      value == null
      || value === ''
      || (Array.isArray(value) && value.length === 0)
    ) {
      delete nextExtension[key]
    }
  })
  form.value.extension = nextExtension
}

const buildStageThreeAssistRequest = (): ContentAssistRequest => ({
  title: normalizedTitle.value,
  content: normalizedContent.value,
  postType: form.value.postType,
  domain: selectedDomain.value,
  tags: normalizedTags.value,
  extension: {
    ...extensionValue.value,
    topicNames: selectedTopicNames.value,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  },
  seriesId: selectedSeriesId.value || undefined,
  aiEnabled: assistPanelEnabled.value,
})

const loadEditorDomains = async () => {
  try {
    const res = await domainApi.listPublic()
    editorDomains.value = res.data || localDomainConfigs
    domainSource.value = res.source
  } catch {
    editorDomains.value = [...localDomainConfigs]
    domainSource.value = 'fallback'
  }
}

const loadSeriesWorkbench = async () => {
  if (!authStore.isLoggedIn) {
    seriesRecords.value = []
    seriesSource.value = 'fallback'
    return
  }
  isSeriesLoading.value = true
  try {
    const res = await contentSeriesApi.listMine(authStore.user?.uid)
    seriesRecords.value = res.data || []
    seriesSource.value = res.status
    if (selectedSeriesId.value && !seriesRecords.value.some((item) => String(item.id) === String(selectedSeriesId.value))) {
      selectedSeriesId.value = ''
    } else if (selectedSeriesId.value) {
      applyEditorExtension({
        seriesId: selectedSeriesId.value,
        seriesTitle: selectedSeriesRecord.value?.title || undefined,
        topicNames: selectedTopicNames.value.length ? selectedTopicNames.value : undefined,
      })
    }
  } finally {
    isSeriesLoading.value = false
  }
}

const clearStageThreeAssistTimer = () => {
  if (stageThreeAssistTimer) {
    clearTimeout(stageThreeAssistTimer)
    stageThreeAssistTimer = null
  }
}

const clearStageThreeAssistState = () => {
  clearStageThreeAssistTimer()
  stageThreeAssistRequestId += 1
  stageThreeAssist.value = null
  stageThreeAssistError.value = ''
  isStageThreeAssistLoading.value = false
}

const loadStageThreeAssist = async (manual = false) => {
  if (!authStore.isLoggedIn) {
    clearStageThreeAssistState()
    return
  }
  if (!assistPanelEnabled.value) {
    clearStageThreeAssistState()
    return
  }
  if (isForbiddenEdit.value) {
    clearStageThreeAssistState()
    return
  }

  const requestId = ++stageThreeAssistRequestId
  isStageThreeAssistLoading.value = true
  stageThreeAssistError.value = ''
  try {
    const res = await contentAssistApi.getEditorAssist(buildStageThreeAssistRequest())
    if (requestId !== stageThreeAssistRequestId) return
    if (!assistPanelEnabled.value || isForbiddenEdit.value) return
    stageThreeAssist.value = res.data
    if (res.data?.status === 'failed') {
      stageThreeAssistError.value = res.data.fallbackReason || '建议暂时不可用'
    }
    if (manual && res.data?.status === 'degraded') {
      toast.warning('已切换到规则降级建议')
    }
  } catch (error) {
    if (requestId !== stageThreeAssistRequestId) return
    stageThreeAssist.value = null
    stageThreeAssistError.value = getErrorMessage(error, '建议暂时不可用')
  } finally {
    if (requestId === stageThreeAssistRequestId) {
      isStageThreeAssistLoading.value = false
    }
  }
}

const scheduleStageThreeAssist = () => {
  clearStageThreeAssistTimer()
  if (!authStore.isLoggedIn || !assistPanelEnabled.value || isForbiddenEdit.value) return
  stageThreeAssistTimer = setTimeout(() => {
    stageThreeAssistTimer = null
    void loadStageThreeAssist(false)
  }, 650)
}

const toggleAssistPanelEnabled = async () => {
  assistPanelEnabled.value = !assistPanelEnabled.value
  safeStorage.set(stageThreeAssistPreferenceKey.value, assistPanelEnabled.value ? '1' : '0')
  if (!assistPanelEnabled.value) {
    clearStageThreeAssistState()
    toast.success('已关闭发布建议，不再自动请求内容辅助')
    return
  }
  toast.success('已开启发布建议，如未配置建议服务将自动回退到规则建议')
  await loadStageThreeAssist(true)
}

const applyAssistSummary = () => {
  if (!assistSummaryText.value) return
  applyEditorExtension({
    summary: assistSummaryText.value,
    topicNames: selectedTopicNames.value.length ? selectedTopicNames.value : undefined,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  })
  scheduleAutoSave()
  toast.success('已采纳写作助手摘要')
}

const applyTagSuggestion = (item: ContentAssistSuggestion) => {
  if (!normalizedTags.value.some((tag) => tag.toLowerCase() === item.label.toLowerCase())) {
    selectedTags.value.push(item.label)
  }
  scheduleAutoSave()
  scheduleStageThreeAssist()
  toast.success(item.adopted ? '标签已在当前内容中' : '已采纳标签建议')
}

const applyTopicSuggestion = (item: ContentAssistSuggestion) => {
  const nextTopics = new Set(selectedTopicNames.value)
  nextTopics.add(item.label)
  applyEditorExtension({
    topicNames: [...nextTopics],
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  })
  scheduleAutoSave()
  scheduleStageThreeAssist()
  toast.success(item.adopted ? '话题已采纳' : '已采纳话题建议')
}

const removeTopicSuggestion = (topic: string) => {
  const nextTopics = selectedTopicNames.value.filter((item) => item !== topic)
  applyEditorExtension({
    topicNames: nextTopics.length ? nextTopics : undefined,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  })
  scheduleAutoSave()
  scheduleStageThreeAssist()
}

const syncSeriesAssignment = async (status: 'draft' | 'published', postId?: string) => {
  if (!authStore.isLoggedIn) return
  const previousSeriesId = sanitizeVisibleText(extensionValue.value.seriesId)
  if (!selectedSeriesId.value && !previousSeriesId) return
  const res = await contentSeriesApi.syncAssignment({
    seriesId: selectedSeriesId.value || undefined,
    previousSeriesId: previousSeriesId || undefined,
    draftId: serverDraftId.value || localDraftKey(),
    postId,
    title: normalizedTitle.value || form.value.title || '待完善标题的内容',
    summary: sanitizeVisibleText(extensionValue.value.summary) || assistSummaryText.value || knowledgeSummary.value,
    domain: selectedDomain.value,
    status,
  }, authStore.user?.uid)
  seriesSource.value = res.status
  if (res.status === 'fallback') {
    toast.warning('合集归属暂时仅保存在本地，尚未完成远端同步。')
  }
  const refreshed = await contentSeriesApi.listMine(authStore.user?.uid)
  seriesRecords.value = refreshed.data || seriesRecords.value
  seriesSource.value = refreshed.status
  if (refreshed.status === 'fallback') {
    toast.warning('合集工作台当前展示的是本地 fallback 结果。')
  }
}

const applyActiveTemplate = () => {
  if (form.value.content.trim()) return
  form.value.content = activeTemplate.value.content
  if (!extensionValue.value.contentType) {
    form.value.extension = {
      ...extensionValue.value,
      contentType: activeTypeCode.value,
    }
  }
  scheduleAutoSave()
  toast.success('已套用发布模板')
}

const copyKnowledgeAssist = async () => {
  try {
    await navigator.clipboard.writeText(knowledgeAssistMarkdown.value)
    toast.success('已复制内容整理草稿')
  } catch {
    toast.error('复制失败，请手动选择内容')
  }
}

const fillSummaryFromAssist = () => {
  form.value.extension = {
    ...extensionValue.value,
    summary: knowledgeSummary.value,
  }
  scheduleAutoSave()
  toast.success('已写入摘要字段')
}

const extractFieldErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof BizException) || !error.data || typeof error.data !== 'object') return {}
  const fieldErrorsData = (error.data as any).fieldErrors
  if (!fieldErrorsData || typeof fieldErrorsData !== 'object') return {}
  return Object.entries(fieldErrorsData).reduce<Record<string, string>>((acc, [field, message]) => {
    if (typeof message === 'string' && message.trim()) acc[field] = message
    return acc
  }, {})
}

const focusFirstFieldError = () => {
  const firstField = Object.keys(fieldErrors.value)[0]
  if (!firstField) return
  const selector = `[data-field="${firstField}"]`
  const el = document.querySelector<HTMLElement>(selector)
    || (['company', 'position', 'interviewRound', 'round', 'yearsOfExp', 'interviewResult', 'interviewRounds', 'extension'].includes(firstField)
      ? document.querySelector<HTMLElement>('[data-field="company"]')
      : null)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.focus()
}

const currentPostId = () => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const value = String(raw ?? '').trim()
  return /^[1-9]\d*$/.test(value) ? value : undefined
}

const localDraftKey = (owner = draftOwner.value) => {
  const postId = currentPostId()
  return postId ? `post_draft:${owner}:edit:${postId}` : `post_draft:${owner}:new`
}

const currentDraftSignature = computed(() => JSON.stringify({
  postType: form.value.postType,
  title: form.value.title,
  content: form.value.content,
  coverUrl: form.value.coverUrl,
  extension: form.value.extension,
  selectedTags: selectedTags.value,
  selectedDomain: selectedDomain.value,
  anonymousCareerPost: anonymousCareerPost.value,
  serverDraftId: serverDraftId.value,
}))

const hasMeaningfulDraft = computed(() => Boolean(
  form.value.title.trim()
  || form.value.content.trim()
  || form.value.coverUrl.trim()
  || selectedTags.value.length
  || Object.keys(extensionValue.value).length,
))

const hasUnsavedDraft = computed(() => hasMeaningfulDraft.value && currentDraftSignature.value !== lastDraftSignature.value)

const markDraftClean = () => {
  lastDraftSignature.value = currentDraftSignature.value
}

const persistLocalDraft = () => {
  safeStorage.set(localDraftKey(), JSON.stringify({
    savedAt: Date.now(),
    owner: draftOwner.value,
    ...form.value,
    selectedTags: selectedTags.value,
    selectedDomain: selectedDomain.value,
    anonymousCareerPost: anonymousCareerPost.value,
    serverDraftId: serverDraftId.value,
  }))
  markDraftClean()
}

const clearAutoSaveTimer = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

const scheduleAutoSave = () => {
  clearAutoSaveTimer()
  if (isLoadingPost.value || isForbiddenEdit.value || isPublishing.value || !hasMeaningfulDraft.value) return
  autoSaveTimer = setTimeout(() => {
    if (!isLoadingPost.value && !isForbiddenEdit.value && !isPublishing.value && hasMeaningfulDraft.value) {
      persistLocalDraft()
    }
  }, AUTO_SAVE_DEBOUNCE_MS)
}

const currentDraftReq = () => ({
  id: serverDraftId.value || undefined,
  sourcePostId: isEditing.value ? currentPostId() : undefined,
  postType: form.value.postType,
  domain: selectedDomain.value,
  anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
  title: form.value.title,
  content: form.value.content,
  coverUrl: form.value.coverUrl,
  visibility: 1,
  tagIds: form.value.tags,
  tagNames: normalizedTags.value,
  extJson: JSON.stringify({
    ...form.value.extension,
    domain: selectedDomain.value,
    anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
    contentType: contentTypeCodeOf(form.value.postType),
    tags: normalizedTags.value,
    topicNames: selectedTopicNames.value,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  }),
})

const applyDraft = (draft: PostDraft, sourceLabel = '草稿') => {
  if (hasUnsafeDraftPayload(draft)) {
    toast.warning(`${sourceLabel}疑似包含乱码或测试数据，已跳过恢复`)
    return false
  }
  serverDraftId.value = String(draft.id)
  selectedDraftId.value = String(draft.id)
  let extension: Record<string, any> = {}
  try {
    extension = draft.extJson ? JSON.parse(draft.extJson) : {}
  } catch {
    extension = {}
  }
  selectedDomain.value = normalizeDomain(draft.domain ?? extension.domain ?? (extension.anonymous ? DOMAIN.CAREER : DOMAIN.LIFESTYLE))
  form.value = {
    postType: getContentTypeOption(draft.postType || DEFAULT_POST_TYPE).value,
    title: draft.title || '',
    content: draft.content || '',
    tags: draft.tagIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
    extension,
    coverUrl: draft.coverUrl || '',
  }
  anonymousCareerPost.value = selectedDomain.value === DOMAIN.CAREER ? Boolean(draft.anonymous ?? extension.anonymous) : false
  selectedTags.value = draft.tagNames || []
  selectedSeriesId.value = sanitizeVisibleText(extension.seriesId)
  markDraftClean()
  return true
}

const draftTitle = (draft: PostDraft) => {
  const title = visibleDraftText(draft.title, 32)
    || visibleDraftText(draft.content, 18)
    || '待补充标题的草稿'
  const time = draft.updateTime ? new Date(draft.updateTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  return time ? `${title} · ${time}` : title
}

const visibleDraftText = (value?: string | null, maxLength = 32) => {
  const normalized = sanitizePublicVisibleText(value)
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

const hasLowQualityDraftPayload = (draft: { title?: unknown; content?: unknown }) => {
  return hasLowQualityVisibleText([draft.title, draft.content])
}

const hasUnsafeDraftPayload = (draft: { title?: unknown; content?: unknown }) => {
  return hasLowQualityDraftPayload(draft) || [draft.title, draft.content].some(isSyntheticVisibleText)
}

const loadServerDrafts = async () => {
  if (isEditing.value) return
  try {
    const res = await postApi.listDrafts(10)
    serverDrafts.value = res.data || []
  } catch {
    serverDrafts.value = []
  }
}

const loadSelectedDraft = async () => {
  if (!selectedDraftId.value) return
  try {
    const localDraft = serverDrafts.value.find((draft) => String(draft.id) === selectedDraftId.value)
    const draft = localDraft || (await postApi.getDraft(selectedDraftId.value)).data
    if (!draft) return
    if (!applyDraft(draft, '服务端草稿')) return
    persistLocalDraft()
    toast.success('已恢复服务端草稿')
  } catch (error) {
    toast.error(getErrorMessage(error, '恢复草稿失败'))
  }
}

const loadLatestSourceDraft = async (postId: string) => {
  try {
    const res = await postApi.getLatestDraftBySourcePost(postId)
    if (res.data) {
      if (!applyDraft(res.data, '未发布编辑草稿')) return false
      toast.success('已恢复未发布编辑草稿')
      return true
    }
  } catch {
    // No source draft; keep current post content.
  }
  return false
}

const restoreLocalDraft = (onlyWhenNotEditing = false) => {
  const draft = safeStorage.get(localDraftKey())
  if (!draft || (onlyWhenNotEditing && isEditing.value)) return false
  try {
    const draftData = JSON.parse(draft)
    if (!draftData?.savedAt || Date.now() - Number(draftData.savedAt) > LOCAL_DRAFT_TTL || draftData.owner !== draftOwner.value) {
      safeStorage.remove(localDraftKey())
      return false
    }
    const draftForm = { ...draftData }
    if (hasUnsafeDraftPayload(draftForm)) {
      toast.warning('本地草稿疑似包含乱码或测试数据，已跳过恢复')
      return false
    }
    const draftTags = draftForm.selectedTags
    const savedSelectedDomain = draftForm.selectedDomain ?? draftForm.extension?.domain
    const savedAnonymousCareerPost = Boolean(draftForm.anonymousCareerPost ?? draftForm.extension?.anonymous)
    const savedServerDraftId = draftForm.serverDraftId
    delete draftForm.selectedTags
    delete draftForm.selectedDomain
    delete draftForm.anonymousCareerPost
    delete draftForm.serverDraftId
    delete draftForm.savedAt
    delete draftForm.owner
    form.value = { ...form.value, ...draftForm }
    selectedDomain.value = savedSelectedDomain != null
      ? normalizeDomain(savedSelectedDomain)
      : savedAnonymousCareerPost
        ? DOMAIN.CAREER
        : selectedDomain.value
    anonymousCareerPost.value = selectedDomain.value === DOMAIN.CAREER ? savedAnonymousCareerPost : false
    selectedTags.value = draftTags || []
    selectedSeriesId.value = sanitizeVisibleText((draftForm.extension || {}).seriesId)
    serverDraftId.value = savedServerDraftId || ''
    selectedDraftId.value = savedServerDraftId || ''
    markDraftClean()
    return true
  } catch {
    toast.warning('本地草稿已损坏，已忽略')
    return false
  }
}

watch(draftOwner, (_nextOwner, prevOwner) => {
  if (prevOwner) {
    safeStorage.remove(localDraftKey(prevOwner))
  }
})

const loadPostForEdit = async (postId: string) => {
  isLoadingPost.value = true
  try {
    const res = await postApi.getDetail(postId)
    if (res.code !== 0 || !res.data) {
      toast.error(getResultMessage(res, '帖子不存在或已被删除'))
      router.replace('/')
      return false
    }

    const post = res.data
    if (String(post.author?.uid ?? '') !== String(authStore.user?.uid ?? '')) {
      redirectForbiddenEdit()
      return false
    }
    form.value = {
      postType: getContentTypeOption(post.postType || DEFAULT_POST_TYPE).value,
      title: post.title,
      content: post.content,
      tags: post.tags?.map(tag => Number(tag.id)).filter(tagId => !Number.isNaN(tagId)) || [],
      extension: post.extension || {},
      coverUrl: post.coverUrl || ''
    }
    selectedDomain.value = normalizeDomain(post.domain ?? (post.anonymous ? DOMAIN.CAREER : DOMAIN.LIFESTYLE))
    anonymousCareerPost.value = selectedDomain.value === DOMAIN.CAREER ? Boolean(post.anonymous) : false
    selectedTags.value = post.tags?.map(tag => tag.name).filter(Boolean) || []
    selectedSeriesId.value = sanitizeVisibleText((post.extension || {}).seriesId)
    markDraftClean()
    return true
  } catch (error) {
    if (isForbiddenError(error)) {
      redirectForbiddenEdit()
    } else {
      toast.error(getErrorMessage(error, '加载帖子失败，请重试'))
      router.replace('/')
    }
    return false
  } finally {
    isLoadingPost.value = false
  }
}

onMounted(async () => {
  assistPanelEnabled.value = safeStorage.get(stageThreeAssistPreferenceKey.value) === '1'
  await Promise.all([loadEditorDomains(), loadSeriesWorkbench()])
  const postId = currentPostId()
  if (postId) {
    isEditing.value = true
    const loaded = await loadPostForEdit(postId)
    if (!loaded) return
    const restoredServerDraft = await loadLatestSourceDraft(postId)
    if (!restoredServerDraft) restoreLocalDraft()
    clearStageThreeAssistState()
    return
  }

  if (route.params.id) {
    toast.error('帖子 ID 格式不正确')
    router.replace('/')
    return
  }

  // 从 localStorage 恢复草稿
  await loadServerDrafts()
  restoreLocalDraft(true)
  clearStageThreeAssistState()
})

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && tag.length <= 32 && !selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag)
    tagInput.value = ''
  }
}

const removeTag = (idx: number) => {
  selectedTags.value.splice(idx, 1)
}

const saveDraft = async () => {
  persistLocalDraft()
  if (isContentOverLimit.value) {
    toast.warning(`正文不能超过 ${CONTENT_MAX_LENGTH} 字，已先保存为本地草稿`)
    return
  }
  isSavingDraft.value = true
  try {
    const res = await postApi.saveDraft(currentDraftReq())
    if (res.data) {
      serverDraftId.value = String(res.data.id)
      selectedDraftId.value = String(res.data.id)
      await syncSeriesAssignment('draft')
      persistLocalDraft()
      if (!isEditing.value) await loadServerDrafts()
    }
    toast.success('草稿已同步到服务端')
  } catch (error) {
    await syncSeriesAssignment('draft')
    toast.warning(getErrorMessage(error, '已保存本地草稿，服务端同步失败'))
  } finally {
    isSavingDraft.value = false
  }
}

const publishPost = async () => {
  clearFieldErrors()
  if (isContentOverLimit.value) {
    fieldErrors.value = { content: `正文不能超过 ${CONTENT_MAX_LENGTH} 字` }
    requestAnimationFrame(focusFirstFieldError)
    toast.error(`正文不能超过 ${CONTENT_MAX_LENGTH} 字`)
    return
  }
  if (blockingQualityIssues.value.length > 0) {
    toast.error(`请先补齐：${blockingQualityIssues.value.map((item) => item.title).join('、')}`)
    return
  }

  isPublishing.value = true
  try {
    const req = {
      domain: selectedDomain.value,
      anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
      postType: form.value.postType,
      title: normalizedTitle.value,
      content: normalizedContent.value,
      coverUrl: form.value.coverUrl,
      visibility: 1,
      tagIds: form.value.tags,
      tagNames: normalizedTags.value,
      extJson: JSON.stringify({
        ...form.value.extension,
        anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
        contentType: contentTypeCodeOf(form.value.postType),
        tags: normalizedTags.value,
        topicNames: selectedTopicNames.value,
        seriesId: selectedSeriesId.value || undefined,
        seriesTitle: selectedSeriesRecord.value?.title || undefined,
      }),
      draftId: serverDraftId.value || undefined,
    }

    const postId = currentPostId()
    if (isEditing.value) {
      if (!postId) {
        toast.error('帖子 ID 格式不正确')
        return
      }
      const res = await postApi.update(postId, req)
      if (res.code === 0) {
        await syncSeriesAssignment('published', postId)
        safeStorage.remove(localDraftKey())
        serverDraftId.value = ''
        selectedDraftId.value = ''
        markDraftClean()
        if (!isEditing.value) await loadServerDrafts()
        const reviewRequired = Boolean(res.data?.reviewRequired)
        toast.success(reviewRequired ? '已提交审核，通过后对外展示' : isEditing.value ? '保存成功' : '发布成功')
        router.push(reviewRequired ? '/me' : { path: `/post/${postId}`, query: { published: '1' } })
      } else {
        toast.error(getResultMessage(res, '保存失败'))
      }
      return
    }
    const res = await postApi.create(req)
    if (res.code === 0) {
      const createdPostId = res.data?.postId == null ? undefined : String(res.data.postId)
      await syncSeriesAssignment('published', createdPostId)
      safeStorage.remove(localDraftKey())
      serverDraftId.value = ''
      selectedDraftId.value = ''
      markDraftClean()
      if (!isEditing.value) await loadServerDrafts()
      const reviewRequired = Boolean(res.data?.reviewRequired)
      toast.success(reviewRequired ? '已提交审核，通过后对外展示' : isEditing.value ? '保存成功' : '发布成功')
      router.push(reviewRequired || !createdPostId ? '/me' : { path: `/post/${createdPostId}`, query: { published: '1' } })
    } else {
      toast.error(getResultMessage(res, `${isEditing.value ? '保存' : '发布'}失败`))
    }
  } catch (error) {
    persistLocalDraft()
    const errors = extractFieldErrors(error)
    if (Object.keys(errors).length > 0) {
      fieldErrors.value = errors
      requestAnimationFrame(focusFirstFieldError)
    }
    publishFailure.value = buildPublishFailure(error)
    toast.error(`${getErrorMessage(error, `${isEditing.value ? '保存' : '发布'}失败，请重试`)}，草稿已保存`)
  } finally {
    isPublishing.value = false
  }
}

const firstString = (value: unknown) => {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

const errorCodeOf = (error: unknown) => {
  if (error instanceof BizException) return error.code
  const status = (error as any)?.response?.status
  return typeof status === 'number' ? status : undefined
}

const isForbiddenError = (error: unknown) => {
  const code = errorCodeOf(error)
  return code === 10403 || code === 403
}

const traceIdOf = (error: unknown) => {
  if (error instanceof BizException) return error.traceId || ''
  const traceId = (error as any)?.response?.data?.traceId
    || (error as any)?.response?.headers?.['x-trace-id']
    || (error as any)?.config?.headers?.['X-Trace-Id']
  return typeof traceId === 'string' ? traceId : ''
}

const publishFailureTitle = (error: unknown) => {
  const code = errorCodeOf(error)
  if (code === 400 || code === 10001) return '内容字段没有通过校验'
  if (code === 403 || code === 10403) return '当前账号暂时不能发布这篇内容'
  if (code === 404 || code === 10404) return '发布接口或关联资源不存在'
  if (code === 409 || code === 30002) return '内容状态已变化，请刷新后确认'
  if (code === 20000 || code === 20001 || code === 500 || code === 503) return '服务端暂时无法完成发布'
  return '发布请求没有成功完成'
}

const buildPublishFailure = (error: unknown): PublishFailure => {
  const code = errorCodeOf(error)
  const actions = [
    '当前内容已保存为本地草稿，可以稍后从编辑器或个人主页恢复。',
    '如果错误与标签有关，可先保留标签文本并移除旧标签 ID 后重试，或到标签治理页检查是否存在未合并标签。',
  ]
  if (code === 20000 || code === 20001 || code === 500 || code === 503) {
    actions.push('数据库迁移可能未补齐，请确认 20260608 社区、标签治理和审核队列迁移已执行。')
  }
  if (Object.keys(fieldErrors.value).length > 0) {
    actions.push('请优先修正页面上标红的字段，再重新发布。')
  }
  return {
    title: publishFailureTitle(error),
    message: getErrorMessage(error, `${isEditing.value ? '保存' : '发布'}失败，请重试`),
    traceId: traceIdOf(error),
    actions,
  }
}

const retryWithTextTagsOnly = () => {
  const textTags = normalizedTags.value
  if (!textTags.length) {
    toast.warning('当前没有可保留的标签文本，请先补充至少 1 个标签再重试')
    return
  }
  selectedTags.value = textTags
  form.value.tags = []
  if (fieldErrors.value.tags) {
    const { tags: _tags, ...rest } = fieldErrors.value
    fieldErrors.value = rest
  }
  persistLocalDraft()
  toast.success('已改为使用标签文本并保存本地草稿，可以重新发布')
}

const redirectForbiddenEdit = () => {
  isForbiddenEdit.value = true
  toast.warning('只能编辑本人发布的内容')
}

const normalizeSameSitePath = (value: unknown) => {
  const raw = firstString(value).trim()
  if (!raw) return ''

  let path = ''
  if (raw.startsWith('/')) {
    path = raw
  } else if (typeof window !== 'undefined') {
    try {
      const url = new URL(raw)
      if (url.origin !== window.location.origin) return ''
      path = `${url.pathname}${url.search}${url.hash}`
    } catch {
      return ''
    }
  }

  if (!path || path.startsWith('//')) return ''
  if (/^\/editor(?:\/|$|\?)/.test(path)) return ''
  if (path === route.fullPath) return ''
  return path
}

const safeReturnPath = () => {
  const state = typeof window !== 'undefined'
    ? window.history.state as Record<string, unknown> | null
    : null
  const candidates = [
    route.query.from,
    route.query.returnTo,
    route.query.redirect,
    state?.back,
    typeof document !== 'undefined' ? document.referrer : '',
  ]
  return candidates.map(normalizeSameSitePath).find(Boolean) || fallbackReturnPath.value
}

const goBack = () => {
  router.push(safeReturnPath())
}

watch(selectedDomain, (domain) => {
  if (domain !== DOMAIN.CAREER) anonymousCareerPost.value = false
  scheduleStageThreeAssist()
})

watch(selectedSeriesId, () => {
  applyEditorExtension({
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
    topicNames: selectedTopicNames.value.length ? selectedTopicNames.value : undefined,
  })
  scheduleAutoSave()
  scheduleStageThreeAssist()
})

watch([form, selectedTags, selectedDomain, anonymousCareerPost], scheduleAutoSave, { deep: true })

watch([normalizedTitle, normalizedContent, normalizedTags, selectedDomain], scheduleStageThreeAssist, { deep: true })

watch(() => authStore.isLoggedIn, async (loggedIn) => {
  if (!loggedIn) {
    seriesRecords.value = []
    clearStageThreeAssistState()
    return
  }
  await Promise.all([loadEditorDomains(), loadSeriesWorkbench()])
  clearStageThreeAssistState()
})

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedDraft.value || isPublishing.value || isForbiddenEdit.value) return
  persistLocalDraft()
  event.preventDefault()
  event.returnValue = '内容已保存到本地草稿，确认离开编辑器？'
}

onBeforeRouteLeave((_to, _from, next) => {
  if (!hasUnsavedDraft.value || isPublishing.value || isForbiddenEdit.value) {
    next()
    return
  }
  persistLocalDraft()
  if (window.confirm('内容已自动保存到本地草稿，确认离开编辑器？')) {
    next()
  } else {
    next(false)
  }
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  clearAutoSaveTimer()
  clearStageThreeAssistTimer()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.editor-toolbar-inner,
.editor-toolbar-title,
.editor-toolbar-actions,
.editor-main-shell {
  min-width: 0;
}

.editor-heading {
  min-width: 0;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.editor-back-button {
  flex: 0 0 auto;
  white-space: nowrap;
}

.editor-title-input {
  width: 100%;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.content-type-tabs {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.content-type-tab {
  flex: 0 0 auto;
  min-height: 2.75rem;
  line-height: 1.2;
  white-space: nowrap;
}

.tag-entry-row input {
  min-width: 0;
}

.draft-select {
  min-height: 2.5rem;
  width: min(18rem, 42vw);
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(51 65 85);
  outline: none;
}

.draft-select:focus {
  box-shadow: 0 0 0 2px rgb(14 165 233 / 0.25);
}

.publish-action-group {
  display: grid;
  justify-items: end;
  gap: 0.35rem;
}

.publish-hint {
  max-width: min(22rem, 70vw);
  text-align: right;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
  color: rgb(180 83 9);
}

.publish-diagnostic {
  display: grid;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(254 202 202);
  background: rgb(255 241 242);
  padding: 1rem;
  color: rgb(127 29 29);
}

.publish-diagnostic-kicker {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(220 38 38);
}

.publish-diagnostic h2 {
  margin-top: 0.25rem;
  font-size: 1rem;
  font-weight: 900;
}

.publish-diagnostic p {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.55;
}

.publish-diagnostic span {
  margin-top: 0.4rem;
  display: inline-flex;
  border-radius: 999px;
  background: white;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.publish-diagnostic ul {
  display: grid;
  gap: 0.4rem;
  padding-left: 1.1rem;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.publish-diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.publish-diagnostic-actions button,
.publish-diagnostic-actions a {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(252 165 165);
  background: white;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(185 28 28);
}

.template-helper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(219 234 254);
  background: rgb(239 246 255);
  padding: 1rem;
}

.template-helper p {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.template-helper strong {
  margin-top: 0.15rem;
  display: block;
  color: rgb(15 23 42);
}

.template-helper span {
  margin-top: 0.25rem;
  display: block;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(71 85 105);
}

.template-helper button {
  flex: 0 0 auto;
  border-radius: 0.5rem;
  background: rgb(37 99 235);
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: white;
}

.template-helper button:disabled {
  cursor: not-allowed;
  background: rgb(148 163 184);
}

.knowledge-assist {
  display: grid;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 1rem;
}

.knowledge-assist-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.knowledge-assist h2 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(30 64 175);
}

.knowledge-assist p {
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(51 65 85);
}

.knowledge-assist-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: white;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.knowledge-assist-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.knowledge-assist-grid article {
  min-width: 0;
  border-radius: 0.65rem;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.85rem;
}

.knowledge-assist-grid strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 900;
  color: rgb(30 64 175);
}

.knowledge-assist-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.knowledge-assist-actions button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(147 197 253);
  background: white;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.domain-source-note {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgb(100 116 139);
}

.stage3-assist-panel {
  display: grid;
  gap: 1rem;
  border-radius: 0.85rem;
  border: 1px solid rgb(191 219 254);
  background: linear-gradient(180deg, rgb(248 250 252), rgb(255 255 255));
  padding: 1rem;
}

.stage3-assist-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.stage3-assist-kicker {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.stage3-assist-head h2 {
  margin-top: 0.2rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.stage3-assist-head p:last-child {
  margin-top: 0.3rem;
  max-width: 44rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(71 85 105);
}

.stage3-assist-head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.assist-status-pill,
.assist-head-button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.assist-status-pill {
  border: 1px solid rgb(191 219 254);
  background: white;
  color: rgb(37 99 235);
}

.assist-head-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.assist-head-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.assist-status-ready {
  border-color: rgb(187 247 208);
  color: rgb(21 128 61);
}

.assist-status-degraded {
  border-color: rgb(253 224 71);
  color: rgb(161 98 7);
}

.assist-status-loading {
  border-color: rgb(191 219 254);
  color: rgb(29 78 216);
}

.assist-status-disabled,
.assist-status-unauthenticated {
  border-color: rgb(226 232 240);
  color: rgb(100 116 139);
}

.assist-status-failed {
  border-color: rgb(252 165 165);
  color: rgb(185 28 28);
}

.stage3-assist-state {
  border-radius: 0.75rem;
  border: 1px dashed rgb(191 219 254);
  background: white;
  padding: 0.9rem 1rem;
}

.stage3-assist-state strong {
  display: block;
  font-size: 0.875rem;
  color: rgb(15 23 42);
}

.stage3-assist-state p {
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(71 85 105);
}

.stage3-assist-state-error {
  border-style: solid;
  border-color: rgb(252 165 165);
  background: rgb(255 241 242);
}

.stage3-assist-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.stage3-card {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.95rem;
}

.stage3-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.stage3-card-head strong {
  font-size: 0.875rem;
  color: rgb(15 23 42);
}

.stage3-card-head > span,
.stage3-card-head > a {
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.stage3-card-copy,
.stage3-empty-copy {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.stage3-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stage3-actions button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.stage3-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.stage3-quality-badge {
  display: inline-flex;
  min-width: 3rem;
  justify-content: center;
  border-radius: 999px;
  background: rgb(239 246 255);
  padding: 0.25rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.stage3-metric-list {
  display: grid;
  gap: 0.55rem;
}

.stage3-metric-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem;
  align-items: center;
  border-radius: 0.6rem;
  background: rgb(248 250 252);
  padding: 0.7rem;
}

.stage3-metric-row strong {
  display: block;
  font-size: 0.8125rem;
  color: rgb(15 23 42);
}

.stage3-metric-row p {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgb(100 116 139);
}

.stage3-metric-row > span {
  border-radius: 999px;
  background: white;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.stage3-chip-list,
.stage3-selected-list,
.stage3-hint-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stage3-chip {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.45rem 0.8rem;
  text-align: left;
}

.stage3-chip span {
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(30 64 175);
}

.stage3-chip small {
  font-size: 0.6875rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.stage3-chip-adopted {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}

.stage3-chip-adopted span,
.stage3-chip-adopted small {
  color: rgb(22 101 52);
}

.stage3-selected-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  background: rgb(248 250 252);
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(51 65 85);
}

.stage3-selected-pill button {
  color: inherit;
}

.stage3-series-select {
  min-height: 2.5rem;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.55rem 0.7rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
}

.stage3-hint-list span {
  display: grid;
  gap: 0.15rem;
  border-radius: 0.65rem;
  background: rgb(248 250 252);
  padding: 0.55rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.stage3-hint-list small {
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1.45;
  color: rgb(100 116 139);
}

.forbidden-primary-action,
.forbidden-secondary-action {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.forbidden-primary-action {
  background: rgb(37 99 235);
  color: white;
}

.forbidden-primary-action:hover {
  background: rgb(29 78 216);
}

.forbidden-secondary-action {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.forbidden-secondary-action:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.quality-score {
  display: inline-flex;
  min-height: 2rem;
  min-width: 3.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 900;
}

.quality-score-ok {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.quality-score-warn {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.quality-row {
  display: grid;
  grid-template-columns: 1.75rem 1fr;
  gap: 0.65rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem;
}

.quality-row > span {
  display: inline-flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: white;
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(100 116 139);
}

.quality-row strong {
  display: block;
  font-size: 0.85rem;
  color: rgb(15 23 42);
}

.quality-row p {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgb(100 116 139);
}

.quality-row-ok {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}

.quality-row-ok > span {
  color: rgb(22 101 52);
}

.quality-row-blocking {
  border-color: rgb(253 224 71);
  background: rgb(254 252 232);
}

.quality-row-blocking > span {
  color: rgb(161 98 7);
}

.field-error {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(225 29 72);
}

.dark .quality-score-ok {
  background: rgb(20 83 45);
  color: rgb(187 247 208);
}

.dark .quality-score-warn {
  background: rgb(113 63 18);
  color: rgb(254 240 138);
}

.dark .quality-row {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .quality-row > span {
  background: rgb(2 6 23);
}

.dark .draft-select {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .forbidden-secondary-action {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .forbidden-secondary-action:hover {
  border-color: rgb(59 130 246);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .publish-hint {
  color: rgb(251 191 36);
}

.dark .publish-diagnostic {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .publish-diagnostic-kicker,
.dark .publish-diagnostic h2 {
  color: rgb(254 202 202);
}

.dark .publish-diagnostic span {
  background: rgb(127 29 29 / 0.55);
}

.dark .publish-diagnostic-actions button,
.dark .publish-diagnostic-actions a {
  border-color: rgb(153 27 27);
  background: rgb(15 23 42);
  color: rgb(254 202 202);
}

.dark .template-helper {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .template-helper strong {
  color: rgb(248 250 252);
}

.dark .template-helper span {
  color: rgb(203 213 225);
}

.dark .knowledge-assist {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84 / 0.5);
}

.dark .knowledge-assist h2,
.dark .knowledge-assist-grid strong {
  color: rgb(191 219 254);
}

.dark .knowledge-assist p {
  color: rgb(203 213 225);
}

.dark .knowledge-assist-head > span {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .knowledge-assist-grid article,
.dark .knowledge-assist-actions button {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

.dark .domain-source-note,
.dark .stage3-card-copy,
.dark .stage3-empty-copy,
.dark .stage3-hint-list small,
.dark .stage3-metric-row p,
.dark .stage3-assist-head p:last-child,
.dark .stage3-assist-state p {
  color: rgb(148 163 184);
}

.dark .stage3-assist-panel {
  border-color: rgb(30 64 175);
  background: linear-gradient(180deg, rgb(15 23 42), rgb(2 6 23));
}

.dark .stage3-assist-head h2,
.dark .stage3-card-head strong,
.dark .stage3-metric-row strong,
.dark .stage3-assist-state strong,
.dark .stage3-hint-list span {
  color: rgb(248 250 252);
}

.dark .assist-status-pill,
.dark .assist-head-button,
.dark .stage3-card,
.dark .stage3-assist-state,
.dark .stage3-series-select,
.dark .stage3-metric-row,
.dark .stage3-selected-pill,
.dark .stage3-hint-list span {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .stage3-quality-badge,
.dark .stage3-metric-row > span {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .stage3-chip {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
}

.dark .stage3-chip span,
.dark .stage3-chip small,
.dark .stage3-card-head > span,
.dark .stage3-card-head > a,
.dark .assist-status-ready {
  color: rgb(191 219 254);
}

.dark .stage3-chip-adopted {
  border-color: rgb(22 101 52);
  background: rgb(5 46 22);
}

.dark .stage3-chip-adopted span,
.dark .stage3-chip-adopted small {
  color: rgb(187 247 208);
}

.dark .assist-status-degraded {
  border-color: rgb(161 98 7);
  color: rgb(253 224 71);
}

.dark .assist-status-disabled,
.dark .assist-status-unauthenticated {
  color: rgb(148 163 184);
}

.dark .assist-status-failed,
.dark .stage3-assist-state-error {
  border-color: rgb(153 27 27);
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .stage3-actions button {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .quality-row strong {
  color: rgb(248 250 252);
}

.dark .quality-row p {
  color: rgb(148 163 184);
}

.dark .quality-row-ok {
  border-color: rgb(22 101 52);
  background: rgb(5 46 22);
}

.dark .quality-row-blocking {
  border-color: rgb(161 98 7);
  background: rgb(69 26 3);
}

@media (max-width: 640px) {
  .editor-toolbar-inner {
    align-items: stretch;
    flex-direction: column;
    gap: 0.85rem;
  }

  .editor-toolbar-title {
    width: 100%;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .editor-back-button {
    min-height: 44px;
    padding-inline: 0.75rem;
  }

  .editor-heading {
    flex: 1 1 auto;
    font-size: 1.25rem;
  }

  .editor-toolbar-actions {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: stretch;
    gap: 0.75rem;
  }

  .draft-select {
    grid-column: 1 / -1;
    width: 100%;
    min-height: 44px;
  }

  .editor-main-shell {
    padding: 1rem 0.75rem 2rem;
  }

  .editor-title-input {
    padding-inline: 0.25rem;
    font-size: 1.75rem;
  }

  .content-type-tabs {
    margin-inline: -0.75rem;
    padding-inline: 0.75rem;
  }

  .content-type-tab {
    padding: 0.75rem 0.9rem;
  }

  .tag-entry-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .publish-action-group {
    width: 100%;
    justify-items: stretch;
  }

  .publish-action-group button {
    min-height: 44px;
    width: 100%;
  }

  .publish-hint {
    max-width: none;
    text-align: left;
  }

  .publish-diagnostic {
    margin-inline: 0;
  }

  .template-helper {
    margin-inline: 0;
    flex-direction: column;
    align-items: stretch;
  }

  .template-helper button {
    min-height: 44px;
  }

  .knowledge-assist {
    margin-inline: 0;
  }

  .knowledge-assist-head {
    flex-direction: column;
  }

  .knowledge-assist-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage3-assist-panel {
    margin-inline: 0;
  }

  .stage3-assist-head {
    flex-direction: column;
  }

  .stage3-assist-head-actions {
    width: 100%;
    justify-content: stretch;
  }

  .assist-status-pill,
  .assist-head-button {
    width: 100%;
  }

  .stage3-assist-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage3-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .stage3-actions button,
  .stage3-chip,
  .stage3-series-select {
    width: 100%;
  }

  .publish-diagnostic-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .publish-diagnostic-actions button,
  .publish-diagnostic-actions a,
  .knowledge-assist-actions button,
  .forbidden-primary-action,
  .forbidden-secondary-action {
    min-height: 44px;
    width: 100%;
  }
}
</style>
