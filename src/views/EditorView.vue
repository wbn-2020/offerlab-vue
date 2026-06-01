<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- 顶部导航 -->
    <div class="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            ← 返回
          </button>
          <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">
            {{ isEditing ? '编辑帖子' : '发布新帖子' }}
          </h1>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-3">
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
          <button
            @click="publishPost"
            :disabled="isPublishing || isLoadingPost || blockingQualityIssues.length > 0"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {{ isPublishing ? (isEditing ? '保存中...' : '发布中...') : (isEditing ? '保存修改' : '发布') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="max-w-6xl mx-auto p-6">
      <div class="space-y-6">
        <!-- 标题输入 -->
        <div class="flex flex-col gap-2">
          <input
            v-model="form.title"
            type="text"
            placeholder="输入标题..."
            data-field="title"
            class="text-3xl font-bold px-4 py-3 border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          <p v-if="fieldErrors.title" class="field-error px-4">{{ fieldErrors.title }}</p>
          <div class="text-sm text-slate-500 dark:text-slate-400 px-4">
            {{ form.title.length }} / 200 字符
          </div>
        </div>

        <!-- 帖子类型 Tab -->
        <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 px-4">
          <button
            v-for="type in postTypes"
            :key="type.value"
            @click="form.postType = type.value"
            :disabled="isEditing"
            :class="[
              'px-4 py-3 font-medium text-sm transition-colors border-b-2',
              form.postType === type.value
                ? 'text-primary-600 border-primary-600'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            ]"
          >
            {{ type.label }}
          </button>
        </div>

        <!-- 面经元数据 -->
        <div v-if="form.postType === 1" class="px-4">
          <PostMeta v-model="form.extension" :type="form.postType" />
          <div v-if="metaErrorMessages.length" data-field="company" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <p v-for="message in metaErrorMessages" :key="message">{{ message }}</p>
          </div>
        </div>

        <section class="mx-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-sm font-extrabold text-slate-900 dark:text-slate-100">发布检查</h2>
              <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">这些检查会影响面经沉淀、自动提题和搜索质量。</p>
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

        <!-- 标签输入 -->
        <div class="px-4 flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">标签</label>
          <div class="flex gap-2 mb-2">
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
          <MarkdownEditor v-model="form.content" />
          <p v-if="fieldErrors.content" class="field-error mt-2">{{ fieldErrors.content }}</p>
        </div>

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
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MarkdownEditor from '@/components/post/MarkdownEditor.vue'
import PostMeta from '@/components/post/PostMeta.vue'
import { BizException, getErrorMessage, getResultMessage } from '@/api/client'
import { postApi, type PostDraft } from '@/api/post'
import { toast } from 'vue-sonner'
import { safeStorage } from '@/utils/safeStorage'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const LOCAL_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000

const postTypes = [
  { value: 1, label: '面经' },
  { value: 2, label: '技术博客' },
  { value: 3, label: '题解' },
  { value: 4, label: '求职问答' }
]

const form = ref({
  postType: 1,
  title: '',
  content: '',
  tags: [] as number[],
  extension: {},
  coverUrl: ''
})

const tagInput = ref('')
const selectedTags = ref<string[]>([])
const isPublishing = ref(false)
const isEditing = ref(false)
const isLoadingPost = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const isSavingDraft = ref(false)
const serverDraftId = ref('')
const selectedDraftId = ref('')
const serverDrafts = ref<PostDraft[]>([])
const draftOwner = computed(() => String(authStore.user?.uid ?? 'guest'))

type QualityCheck = {
  key: string
  title: string
  description: string
  passed: boolean
  required: boolean
}

const extensionValue = computed<Record<string, any>>(() => form.value.extension && typeof form.value.extension === 'object'
  ? form.value.extension as Record<string, any>
  : {})
const normalizedTitle = computed(() => form.value.title.trim())
const normalizedContent = computed(() => form.value.content.trim())
const normalizedTags = computed(() => selectedTags.value.map((tag) => tag.trim()).filter(Boolean))
const isInterviewPost = computed(() => Number(form.value.postType) === 1)
const hasCompany = computed(() => Boolean(String(extensionValue.value.company || '').trim()))
const hasPosition = computed(() => Boolean(String(extensionValue.value.position || '').trim()))
const hasInterviewRound = computed(() => Number(extensionValue.value.interviewRounds || 0) > 0)
const hasInterviewResult = computed(() => Number(extensionValue.value.interviewResult || 0) > 0)

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
    description: isInterviewPost.value ? '面经正文至少 120 个字符，建议包含轮次、问题和复盘。' : '正文至少 40 个字符。',
    passed: normalizedContent.value.length >= (isInterviewPost.value ? 120 : 40),
    required: true,
  },
  {
    key: 'company',
    title: '公司信息',
    description: '面经需要公司字段，后续才能进入公司准备包。',
    passed: !isInterviewPost.value || hasCompany.value,
    required: isInterviewPost.value,
  },
  {
    key: 'position',
    title: '岗位信息',
    description: '面经需要岗位字段，便于公司包和题库按岗位筛选。',
    passed: !isInterviewPost.value || hasPosition.value,
    required: isInterviewPost.value,
  },
  {
    key: 'tags',
    title: '技术标签',
    description: '至少 1 个标签；面经建议 2 个以上，帮助自动提题匹配考察点。',
    passed: normalizedTags.value.length >= (isInterviewPost.value ? 2 : 1),
    required: true,
  },
  {
    key: 'round',
    title: '轮次或结果',
    description: '补充轮次或面试结果，能增强趋势看板和准备包可信度。',
    passed: !isInterviewPost.value || hasInterviewRound.value || hasInterviewResult.value,
    required: false,
  },
])
const blockingQualityIssues = computed(() => qualityChecks.value.filter((item) => item.required && !item.passed))
const passedQualityCount = computed(() => qualityChecks.value.filter((item) => item.passed).length)
const metaErrorMessages = computed(() => ['company', 'position', 'interviewRound', 'round', 'yearsOfExp', 'interviewResult', 'interviewRounds', 'extension']
  .map((field) => fieldErrors.value[field])
  .filter(Boolean))

const clearFieldErrors = () => {
  fieldErrors.value = {}
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
  const value = Number(route.params.id)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const localDraftKey = (owner = draftOwner.value) => {
  const postId = currentPostId()
  return postId ? `post_draft:${owner}:edit:${postId}` : `post_draft:${owner}:new`
}

const persistLocalDraft = () => {
  safeStorage.set(localDraftKey(), JSON.stringify({
    savedAt: Date.now(),
    owner: draftOwner.value,
    ...form.value,
    selectedTags: selectedTags.value,
    serverDraftId: serverDraftId.value,
  }))
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
    tags: normalizedTags.value,
  }),
})

const applyDraft = (draft: PostDraft) => {
  serverDraftId.value = String(draft.id)
  selectedDraftId.value = String(draft.id)
  let extension: Record<string, any> = {}
  try {
    extension = draft.extJson ? JSON.parse(draft.extJson) : {}
  } catch {
    extension = {}
  }
  form.value = {
    postType: draft.postType || 1,
    title: draft.title || '',
    content: draft.content || '',
    tags: draft.tagIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
    extension,
    coverUrl: draft.coverUrl || '',
  }
  selectedTags.value = draft.tagNames || []
}

const draftTitle = (draft: PostDraft) => {
  const title = draft.title?.trim() || draft.content?.trim().slice(0, 18) || '未命名草稿'
  const time = draft.updateTime ? new Date(draft.updateTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  return time ? `${title} · ${time}` : title
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
    applyDraft(draft)
    persistLocalDraft()
    toast.success('已恢复服务端草稿')
  } catch (error) {
    toast.error(getErrorMessage(error, '恢复草稿失败'))
  }
}

const loadLatestSourceDraft = async (postId: number) => {
  try {
    const res = await postApi.getLatestDraftBySourcePost(postId)
    if (res.data) {
      applyDraft(res.data)
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

const loadPostForEdit = async (postId: number) => {
  isLoadingPost.value = true
  try {
    const res = await postApi.getDetail(postId)
    if (res.code !== 0 || !res.data) {
      toast.error(getResultMessage(res, '帖子不存在或已被删除'))
      router.push('/')
      return
    }

    const post = res.data
    form.value = {
      postType: post.postType,
      title: post.title,
      content: post.content,
      tags: post.tags?.map(tag => Number(tag.id)).filter(tagId => !Number.isNaN(tagId)) || [],
      extension: post.extension || {},
      coverUrl: post.coverUrl || ''
    }
    selectedTags.value = post.tags?.map(tag => tag.name).filter(Boolean) || []
  } catch (error) {
    toast.error(getErrorMessage(error, '加载帖子失败，请重试'))
    router.push('/')
  } finally {
    isLoadingPost.value = false
  }
}

onMounted(async () => {
  const postId = route.params.id
  if (postId) {
    isEditing.value = true
    await loadPostForEdit(Number(postId))
    const restoredServerDraft = await loadLatestSourceDraft(Number(postId))
    if (!restoredServerDraft) restoreLocalDraft()
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
  if (blockingQualityIssues.value.length > 0) {
    toast.error(`请先补齐：${blockingQualityIssues.value.map((item) => item.title).join('、')}`)
    return
  }

  isPublishing.value = true
  try {
    const req = {
      postType: form.value.postType,
      title: normalizedTitle.value,
      content: normalizedContent.value,
      coverUrl: form.value.coverUrl,
      visibility: 1,
      tagIds: form.value.tags,
      tagNames: normalizedTags.value,
      extJson: JSON.stringify({
        ...form.value.extension,
        tags: normalizedTags.value
      }),
      draftId: serverDraftId.value || undefined,
    }

    const postId = Number(route.params.id)
    const res = isEditing.value
      ? await postApi.update(postId, req)
      : await postApi.create(req)
    if (res.code === 0) {
      safeStorage.remove(localDraftKey())
      serverDraftId.value = ''
      selectedDraftId.value = ''
      if (!isEditing.value) await loadServerDrafts()
      const reviewRequired = Boolean(res.data?.reviewRequired)
      toast.success(reviewRequired ? '已提交审核，通过后对外展示' : isEditing.value ? '保存成功' : '发布成功')
      router.push(reviewRequired ? '/me' : `/post/${isEditing.value ? postId : res.data?.postId}`)
    } else {
      toast.error(getResultMessage(res, `${isEditing.value ? '保存' : '发布'}失败`))
    }
  } catch (error) {
    const errors = extractFieldErrors(error)
    if (Object.keys(errors).length > 0) {
      fieldErrors.value = errors
      requestAnimationFrame(focusFirstFieldError)
    }
    toast.error(getErrorMessage(error, `${isEditing.value ? '保存' : '发布'}失败，请重试`))
  } finally {
    isPublishing.value = false
  }
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
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

:global(.dark) .quality-score-ok {
  background: rgb(20 83 45);
  color: rgb(187 247 208);
}

:global(.dark) .quality-score-warn {
  background: rgb(113 63 18);
  color: rgb(254 240 138);
}

:global(.dark) .quality-row {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .quality-row > span {
  background: rgb(2 6 23);
}

:global(.dark) .draft-select {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

:global(.dark) .quality-row strong {
  color: rgb(248 250 252);
}

:global(.dark) .quality-row p {
  color: rgb(148 163 184);
}

:global(.dark) .quality-row-ok {
  border-color: rgb(22 101 52);
  background: rgb(5 46 22);
}

:global(.dark) .quality-row-blocking {
  border-color: rgb(161 98 7);
  background: rgb(69 26 3);
}
</style>
