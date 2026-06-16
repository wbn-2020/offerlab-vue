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
            {{ isEditing ? '编辑技术经验' : '发布技术经验' }}
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
        <div class="content-type-tabs flex gap-2 border-b border-slate-200 dark:border-slate-800 px-4">
          <button
            v-for="type in postTypes"
            :key="type.value"
            @click="form.postType = type.value"
            :disabled="isEditing"
            :class="[
              'content-type-tab px-4 py-3 font-medium text-sm transition-colors border-b-2',
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
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">领域</label>
          <select
            v-model="selectedDomain"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option v-for="d in DOMAIN_OPTIONS" :key="d.value" :value="d.value">
              {{ d.icon }} {{ d.label }} — {{ d.description }}
            </option>
          </select>
        </div>

        <!-- 内容元数据 -->
        <div class="px-4">
          <PostMeta v-model="form.extension" :type="form.postType" />
          <div v-if="metaErrorMessages.length" data-field="company" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <p v-for="message in metaErrorMessages" :key="message">{{ message }}</p>
          </div>
        </div>

        <section class="mx-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-sm font-extrabold text-slate-900 dark:text-slate-100">发布检查</h2>
              <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">这些检查会影响内容可读性、搜索质量和后续 AI 知识沉淀。</p>
            </div>
            <span :class="['quality-score', blockingQualityIssues.length ? 'quality-score-warn' : 'quality-score-ok']">
              {{ passedQualityCount }}/{{ qualityChecks.length }}
            </span>
          </div>
          <div class="mt-3 grid gap-2">
            <div v-for="item in qualityChecks" :key="item.key" class="quality-row" :class="item.passed ? 'quality-row-ok' : item.required ? 'quality-row-blocking' : ''">
              <span>{{ item.passed ? '✓' : item.required ? '!' : '·' }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="knowledge-assist mx-4">
          <div class="knowledge-assist-head">
            <div>
              <h2>知识沉淀辅助</h2>
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
              placeholder="输入标签，按 Enter 添加"
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
            <RouterLink to="/admin/tags">检查标签治理</RouterLink>
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
import MarkdownEditor from '@/components/post/MarkdownEditor.vue'
import PostMeta from '@/components/post/PostMeta.vue'
import { BizException, getErrorMessage, getResultMessage } from '@/api/client'
import { postApi, type PostDraft } from '@/api/post'
import { toast } from 'vue-sonner'
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
import { DOMAIN, DOMAIN_OPTIONS } from '@/utils/domains'

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
const selectedDomain = ref<number>(DOMAIN.TECH)
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
const draftOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const fallbackReturnPath = computed(() => authStore.isLoggedIn ? '/me' : '/')
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

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
    title: '技术文章模板',
    description: '适合沉淀方案、源码阅读、架构实践和技术总结。',
    content: `## 背景

## 核心问题

## 方案设计

## 关键实现

## 效果与复盘
`,
  },
  PROJECT_REVIEW: {
    title: '项目复盘模板',
    description: '突出背景、目标、架构、难点、取舍、指标和结果。',
    content: `## 背景

## 目标

## 架构与技术栈

## 难点与取舍

## 落地过程

## 指标与结果

## 复盘
`,
  },
  SYSTEM_DESIGN: {
    title: '系统设计模板',
    description: '适合拆解目标、容量、模块边界、数据模型、取舍和演进。',
    content: `## 业务目标

## 核心场景与约束

## 容量估算

## 架构方案

## 数据模型

## 关键取舍

## 风险与演进
`,
  },
  INTERVIEW_RECAP: {
    title: '面试复盘模板',
    description: '记录问题、追问、回答卡点、可复用素材和后续补强。',
    content: `## 面试背景

## 被问到的问题

## 追问路径

## 回答卡点

## 可复用 STAR 素材

## 后续补强计划
`,
  },
  PITFALL: {
    title: '线上故障/踩坑模板',
    description: '适合记录现象、影响范围、时间线、根因、修复和防复发。',
    content: `## 现象

## 影响范围

## 时间线

## 根因

## 修复方案

## 监控与防复发

## 复盘
`,
  },
  QUESTION: {
    title: '技术问答模板',
    description: '把问题、上下文、已尝试方案和期望结果说清楚。',
    content: `## 问题

## 上下文

## 已尝试方案

## 期望结果
`,
  },
  RESOURCE: {
    title: '资源分享模板',
    description: '说明资源适用人群、使用方式、优缺点和实践建议。',
    content: `## 资源简介

## 适用场景

## 使用方式

## 优点与限制

## 推荐实践
`,
  },
  NOTE: {
    title: '经验笔记模板',
    description: '快速记录场景、做法、命令配置和注意事项。',
    content: `## 场景

## 做法

## 命令或配置

## 注意事项
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
const activeTemplate = computed(() => PUBLISH_TEMPLATES[activeTypeCode.value] || PUBLISH_TEMPLATES.TECH_ARTICLE)
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
    title: '技术标签',
    description: '至少 1 个标签；项目复盘和踩坑记录建议补充技术栈标签。',
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
const knowledgeFaqHint = computed(() => {
  const questionLine = cleanContentLines.value.find((line) => /[？?]|怎么|如何|为什么|排查|解决/.test(line))
  if (questionLine) return questionLine.length > 80 ? `${questionLine.slice(0, 80)}...` : questionLine
  if (normalizedTitle.value) return `可以围绕“${normalizedTitle.value.slice(0, 36)}”补一个问题和结论。`
  return '补充一个真实问题、排查过程和最终结论后，可沉淀为 FAQ。'
})
const knowledgeCardHint = computed(() => {
  const techTags = normalizedTags.value.slice(0, 4).join('、') || '技术栈'
  if (normalizedContent.value.length >= activePostType.value.minContentLength) {
    return `${activePostType.value.label} · ${techTags} · 可沉淀为摘要、FAQ 和相似内容推荐素材。`
  }
  return `继续补充背景、过程、结论和复盘，发布后可形成 ${activePostType.value.label} 知识卡。`
})
const knowledgeAssistReadiness = computed(() => blockingQualityIssues.value.length ? '待补齐' : '可沉淀')
const knowledgeAssistMarkdown = computed(() => [
  `# ${normalizedTitle.value || '待补充标题的技术经验'}`,
  '',
  `内容类型：${activePostType.value.label}`,
  normalizedTags.value.length ? `技术标签：${normalizedTags.value.join('、')}` : '技术标签：待补充',
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

const clearFieldErrors = () => {
  fieldErrors.value = {}
  publishFailure.value = null
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
    toast.success('已复制知识沉淀草稿')
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
  title: form.value.title,
  content: form.value.content,
  coverUrl: form.value.coverUrl,
  visibility: 1,
  tagIds: form.value.tags,
  tagNames: normalizedTags.value,
  extJson: JSON.stringify({
    ...form.value.extension,
    contentType: contentTypeCodeOf(form.value.postType),
    tags: normalizedTags.value,
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
  form.value = {
    postType: getContentTypeOption(draft.postType || DEFAULT_POST_TYPE).value,
    title: draft.title || '',
    content: draft.content || '',
    tags: draft.tagIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
    extension,
    coverUrl: draft.coverUrl || '',
  }
  selectedTags.value = draft.tagNames || []
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
    const savedServerDraftId = draftForm.serverDraftId
    delete draftForm.selectedTags
    delete draftForm.serverDraftId
    delete draftForm.savedAt
    delete draftForm.owner
    form.value = { ...form.value, ...draftForm }
    selectedTags.value = draftTags || []
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
    selectedTags.value = post.tags?.map(tag => tag.name).filter(Boolean) || []
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
  const postId = currentPostId()
  if (postId) {
    isEditing.value = true
    const loaded = await loadPostForEdit(postId)
    if (!loaded) return
    const restoredServerDraft = await loadLatestSourceDraft(postId)
    if (!restoredServerDraft) restoreLocalDraft()
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
      persistLocalDraft()
      if (!isEditing.value) await loadServerDrafts()
    }
    toast.success('草稿已同步到服务端')
  } catch (error) {
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
      postType: form.value.postType,
      title: normalizedTitle.value,
      content: normalizedContent.value,
      coverUrl: form.value.coverUrl,
      visibility: 1,
      tagIds: form.value.tags,
      tagNames: normalizedTags.value,
      extJson: JSON.stringify({
        ...form.value.extension,
        contentType: contentTypeCodeOf(form.value.postType),
        tags: normalizedTags.value
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
      safeStorage.remove(localDraftKey())
      serverDraftId.value = ''
      selectedDraftId.value = ''
      markDraftClean()
      if (!isEditing.value) await loadServerDrafts()
      const reviewRequired = Boolean(res.data?.reviewRequired)
      toast.success(reviewRequired ? '已提交审核，通过后对外展示' : isEditing.value ? '保存成功' : '发布成功')
      router.push(reviewRequired ? '/me' : { path: `/post/${res.data?.postId}`, query: { published: '1' } })
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

watch([form, selectedTags], scheduleAutoSave, { deep: true })

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
