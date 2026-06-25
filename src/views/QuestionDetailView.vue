<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <LoadingSkeleton v-if="isQuestionLoading" />
      <section v-else-if="isQuestionNotFound" class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">题目不存在或已被删除</h3>
        <p class="mb-6 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
          这张知识卡可能已被下架、来源内容不可见，或本地演示数据还没有补到当前数据库。
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <RouterLink to="/questions" class="primary-action inline-flex items-center justify-center">返回知识库</RouterLink>
          <RouterLink :to="{ path: '/search', query: { q: questionId } }" class="secondary-action inline-flex items-center justify-center">搜索相似内容</RouterLink>
          <RouterLink to="/" class="secondary-action inline-flex items-center justify-center">回到首页</RouterLink>
        </div>
      </section>
      <section v-else-if="isError" class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">题目加载失败</h3>
        <p class="mb-6 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
          {{ getErrorMessage(error, '题目详情暂时无法加载，请稍后重试。') }}
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <button type="button" class="primary-action" @click="refetch()">重试</button>
          <RouterLink to="/questions" class="secondary-action inline-flex items-center justify-center">返回知识库</RouterLink>
        </div>
      </section>
      <EmptyState v-else-if="!detail || !question" title="知识卡不存在" description="这张知识卡可能已隐藏、来源内容不可见，或当前知识库还没有同步到详情页。" actionText="返回知识库" actionHref="/questions" />
      <div v-else class="grid gap-8 lg:grid-cols-3">
        <article class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div class="mb-5 flex flex-wrap gap-2">
            <RouterLink v-if="question.company" :to="`/companies/${encodeURIComponent(question.company)}/prep`" class="pill company">{{ question.company }}</RouterLink>
            <span v-if="question.position" class="pill">{{ question.position }}</span>
            <span v-if="question.interviewRound" class="pill">{{ question.interviewRound }}</span>
            <span class="pill">{{ difficultyText(question.difficulty) }}</span>
          </div>
          <h1 class="text-3xl font-bold leading-tight text-slate-950 dark:text-slate-50">{{ question.questionText }}</h1>
          <section v-if="question.examPoint" class="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
            <h2 class="text-sm font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">考察点</h2>
            <p class="mt-3 text-base font-semibold leading-7 text-slate-800 dark:text-slate-100">{{ question.examPoint }}</p>
          </section>
          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="insight-tile">
              <span>出现频次</span>
              <strong>{{ sourcePostCount }} 篇</strong>
            </div>
            <div class="insight-tile">
              <span>质量分</span>
              <strong>{{ question.qualityScore || 0 }}</strong>
            </div>
            <div class="insight-tile">
              <span>题组</span>
              <strong>{{ isCanonicalRoot ? '主题' : '同题' }}</strong>
            </div>
          </div>
          <section v-if="hasReviewSchedule" class="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <h2 class="text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">复习计划</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <div class="schedule-tile"><span>下次复习</span><strong>{{ formatReviewDate(question.nextReviewAt) }}</strong></div>
              <div class="schedule-tile"><span>已复习</span><strong>{{ question.reviewCount }} 次</strong></div>
              <div class="schedule-tile"><span>当前间隔</span><strong>{{ question.reviewIntervalDays }} 天</strong></div>
            </div>
          </section>
          <section class="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 class="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">参考思路</h2>
            <p class="mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {{ question.answerHint || '暂未生成参考思路。AI 内容仅作辅助，不作为官方标准答案。' }}
            </p>
          </section>

          <section v-if="question.referenceAnswer" class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <h2 class="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">参考答案</h2>
            <p class="mt-3 whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">{{ question.referenceAnswer }}</p>
          </section>

          <section v-if="question.sourceSnippet || question.qualityReason" class="mt-5 grid gap-4 lg:grid-cols-2">
            <div v-if="question.sourceSnippet" class="structured-panel">
              <h2>来源片段</h2>
              <p>{{ question.sourceSnippet }}</p>
            </div>
            <div v-if="question.qualityReason" class="structured-panel">
              <h2>质量说明</h2>
              <p>{{ question.qualityReason }}</p>
            </div>
          </section>

          <section class="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900 dark:bg-blue-950/30">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">我的笔记</h2>
                <p class="mt-1 text-xs text-blue-700/75 dark:text-blue-200/75">记录自己的答案思路、STAR 项目映射、易错点和复习提醒。</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="secondary-action" @click="copyAnswerCard">
                  复制回答卡片
                </button>
                <button type="button" class="secondary-action" :disabled="isSavingNote" @click="saveNote">
                  {{ isSavingNote ? '保存中...' : '保存笔记' }}
                </button>
              </div>
            </div>
            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label class="field-label">回答草稿</label>
                <textarea
                  v-model.trim="answerDraft"
                  maxlength="4000"
                  rows="6"
                  class="note-input mt-2"
                  placeholder="用自己的话整理这道题的回答草稿，比如先定义，再说场景，再补充权衡。"
                  @focus="ensureLogin"
                  @input="markNoteDirty"
                />
                <div class="mt-2 text-right text-xs text-blue-700/70 dark:text-blue-200/70">{{ answerDraft.length }} / 4000</div>
              </div>
              <div>
                <label class="field-label">STAR 项目映射</label>
                <textarea
                  v-model.trim="starStory"
                  maxlength="2000"
                  rows="6"
                  class="note-input mt-2"
                  placeholder="S: 场景 / T: 目标 / A: 行动 / R: 结果，补一段能支撑这道题的项目经历。"
                  @focus="ensureLogin"
                  @input="markNoteDirty"
                />
                <div class="mt-2 text-right text-xs text-blue-700/70 dark:text-blue-200/70">{{ starStory.length }} / 2000</div>
              </div>
            </div>
            <div class="mt-4 grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
              <label class="text-xs font-bold uppercase tracking-wide text-blue-700/80 dark:text-blue-200/80">
                错因标签
              </label>
              <select v-model="mistakeReason" class="reason-select" @focus="ensureLogin" @change="markNoteDirty">
                <option value="">暂不标记</option>
                <option value="concept">概念不熟</option>
                <option value="project">项目表达弱</option>
                <option value="memory">需要记忆</option>
                <option value="expression">表达不清</option>
                <option value="careless">粗心失误</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div v-if="isNoteDirty" class="mt-3 text-xs font-bold text-blue-700/80 dark:text-blue-200/80">
              有未保存的笔记改动，已在本地暂存
            </div>
            <textarea
              v-model.trim="noteText"
              maxlength="4000"
              rows="5"
              class="note-input mt-4"
              placeholder="例如：先说明 HashMap 扩容，再补充并发场景下为什么要用 ConcurrentHashMap。"
              @focus="ensureLogin"
              @input="markNoteDirty"
            />
            <div class="mt-2 text-right text-xs text-blue-700/70 dark:text-blue-200/70">
              {{ noteText.length }} / 4000
            </div>
          </section>

          <div class="mt-6 flex flex-wrap gap-2">
            <span v-for="tag in question.tags" :key="tag.id" class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ tag.name }}</span>
          </div>

          <div class="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <button class="primary-action" :disabled="isTogglingFavorite" @click="toggleFavorite">
              {{ isTogglingFavorite ? '处理中...' : (question.favorite ? '取消收藏' : '收藏题目') }}
            </button>
            <select v-model="selectedProgress" class="state-select" :disabled="isUpdatingProgress" @change="updateProgress">
              <option value="">学习状态</option>
              <option value="todo">待学习</option>
              <option value="learning">学习中</option>
              <option value="mastered">已掌握</option>
              <option value="review">待复习</option>
            </select>
            <RouterLink
              :to="mockInterviewLink"
              class="secondary-action inline-flex items-center justify-center"
            >
              加入知识复盘
            </RouterLink>
            <RouterLink
              :to="prepReturnLink"
              class="secondary-action inline-flex items-center justify-center"
            >
              回学习空间
            </RouterLink>
            <RouterLink
              v-if="detail.sourcePosts.length"
              :to="`/post/${detail.sourcePosts[0].postId}`"
              class="secondary-action inline-flex items-center justify-center"
            >
              查看来源内容
            </RouterLink>
            <button
              v-else
              class="secondary-action opacity-60"
              type="button"
              disabled
            >
              暂无可跳转来源
            </button>
          </div>
        </article>

        <aside class="space-y-6">
          <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 class="mb-4 font-bold text-slate-950 dark:text-slate-50">来源内容</h2>
            <div v-if="detail.sourcePosts.length" class="space-y-3">
              <RouterLink v-for="post in detail.sourcePosts" :key="post.postId" :to="`/post/${post.postId}`" class="block rounded-lg bg-slate-50 p-3 hover:bg-primary-50 dark:bg-slate-950 dark:hover:bg-primary-950/30">
                <div class="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ post.title }}</div>
                <div class="mt-1 text-xs text-slate-500">{{ post.counter.view }} 浏览</div>
              </RouterLink>
            </div>
            <p v-else class="text-sm text-slate-500">暂无可见来源。</p>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 class="mb-4 font-bold text-slate-950 dark:text-slate-50">相似知识卡</h2>
            <div v-if="detail.relatedQuestions.length" class="space-y-3">
              <RouterLink v-for="item in detail.relatedQuestions" :key="item.id" :to="`/questions/${item.id}`" class="block rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-800 hover:bg-primary-50 hover:text-primary-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-primary-950/30">
                {{ item.questionText }}
              </RouterLink>
            </div>
            <p v-else class="text-sm text-slate-500">暂无相似题。</p>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { questionApi } from '@/api/question'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { BizException, getErrorMessage } from '@/api/client'
import { safeStorage } from '@/utils/safeStorage'
import { buildQuestionAnswerCardMarkdown } from '@/utils/prepPackExport'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const questionId = computed(() => route.params.id as string)
const selectedProgress = ref('')
const noteText = ref('')
const mistakeReason = ref('')
const answerDraft = ref('')
const starStory = ref('')
const isSavingNote = ref(false)
const isTogglingFavorite = ref(false)
const isUpdatingProgress = ref(false)
const isNoteDirty = ref(false)
const draftLoadedFor = ref('')

const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: computed(() => ['question', questionId.value]),
  queryFn: () => questionApi.detail(questionId.value),
  enabled: computed(() => Boolean(questionId.value)),
  retry: false,
})

const detail = computed(() => data.value?.data || null)
const question = computed(() => detail.value?.question ?? null)
const questionErrorCode = computed(() => {
  if (error.value instanceof BizException) return error.value.code
  const status = (error.value as any)?.response?.status
  return typeof status === 'number' ? status : undefined
})
const isQuestionNotFound = computed(() => questionErrorCode.value === 10404 || questionErrorCode.value === 404)
const isQuestionLoading = computed(() => isLoading.value && !isError.value)
const sourcePostCount = computed(() => question.value ? Math.max(1, question.value.sourcePostCount || question.value.appearCount || 1) : 1)
const isCanonicalRoot = computed(() => !question.value?.canonicalId || String(question.value.canonicalId) === String(question.value.id))
const hasReviewSchedule = computed(() => Boolean(question.value?.nextReviewAt || question.value?.lastReviewedAt || (question.value?.reviewCount ?? 0) > 0))
const primaryFocusTag = computed(() => question.value?.tags?.[0]?.name || question.value?.examPoint || '')
const mockInterviewLink = computed(() => ({
  path: '/mock-interview',
  query: {
    company: question.value?.company || undefined,
    position: question.value?.position || undefined,
    difficulty: question.value?.difficulty || undefined,
    focusTag: primaryFocusTag.value || undefined,
    questionCount: 5,
  },
}))
const prepReturnLink = computed(() => question.value?.company ? `/companies/${encodeURIComponent(question.value.company)}/prep` : '/me/prep')
const storageOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const noteDraftKey = computed(() => `offerlab:${storageOwner.value}:question-note-draft:${questionId.value}`)
const draftScope = computed(() => `${storageOwner.value}:${questionId.value}`)
const unsavedLeaveMessage = '你有未保存的题目笔记，离开后可从本地草稿恢复。确定要离开吗？'

const markNoteDirty = () => {
  if (!detail.value || !question.value || isSavingNote.value) return
  isNoteDirty.value = noteText.value !== (question.value.note || '')
    || mistakeReason.value !== (question.value.mistakeReason || '')
    || answerDraft.value !== (question.value.answerDraft || '')
    || starStory.value !== (question.value.starStory || '')
  if (isNoteDirty.value) {
    safeStorage.set(noteDraftKey.value, JSON.stringify({
      note: noteText.value,
      mistakeReason: mistakeReason.value,
      answerDraft: answerDraft.value,
      starStory: starStory.value,
    }))
  } else {
    safeStorage.remove(noteDraftKey.value)
  }
}

const loadNoteDraft = () => {
  if (!detail.value || !question.value || draftLoadedFor.value === draftScope.value) return
  draftLoadedFor.value = draftScope.value
  const raw = safeStorage.get(noteDraftKey.value)
  if (!raw) return
  try {
    const draft = JSON.parse(raw)
    if (typeof draft?.note === 'string') noteText.value = draft.note
    if (typeof draft?.mistakeReason === 'string') mistakeReason.value = draft.mistakeReason
    if (typeof draft?.answerDraft === 'string') answerDraft.value = draft.answerDraft
    if (typeof draft?.starStory === 'string') starStory.value = draft.starStory
    isNoteDirty.value = noteText.value !== (question.value.note || '')
      || mistakeReason.value !== (question.value.mistakeReason || '')
      || answerDraft.value !== (question.value.answerDraft || '')
      || starStory.value !== (question.value.starStory || '')
  } catch {
    safeStorage.remove(noteDraftKey.value)
  }
}

const syncNoteEditor = () => {
  if (!detail.value || !question.value) return
  noteText.value = question.value.note || ''
  mistakeReason.value = question.value.mistakeReason || ''
  answerDraft.value = question.value.answerDraft || ''
  starStory.value = question.value.starStory || ''
  isNoteDirty.value = false
  loadNoteDraft()
}

watch(detail, (value) => {
  if (!value?.question) return
  selectedProgress.value = value.question.progressStatus || ''
  if (isSavingNote.value) return
  syncNoteEditor()
}, { immediate: true })

const ensureLogin = () => {
  if (authStore.isLoggedIn) return true
  router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}

const toggleFavorite = async () => {
  if (!detail.value || !question.value || !ensureLogin() || isTogglingFavorite.value) return
  isTogglingFavorite.value = true
  try {
    if (question.value.favorite) {
      await questionApi.unfavorite(question.value.id)
    } else {
      await questionApi.favorite(question.value.id)
    }
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '收藏操作失败'))
  } finally {
    isTogglingFavorite.value = false
  }
}

const updateProgress = async () => {
  if (!detail.value || !question.value || !selectedProgress.value || !ensureLogin() || isUpdatingProgress.value) return
  isUpdatingProgress.value = true
  try {
    await questionApi.updateProgress(question.value.id, selectedProgress.value)
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '学习状态更新失败'))
  } finally {
    isUpdatingProgress.value = false
  }
}

const difficultyText = (value?: string) => ({ easy: '简单', medium: '中等', hard: '困难' }[value || ''] || '中等')

const formatReviewDate = (value?: number) => {
  if (!value) return '暂无计划'
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const copyAnswerCard = async () => {
  if (!detail.value || !question.value) return
  try {
    await navigator.clipboard.writeText(buildQuestionAnswerCardMarkdown({
      ...question.value,
      note: noteText.value,
      mistakeReason: mistakeReason.value,
      answerDraft: answerDraft.value,
      starStory: starStory.value,
    }))
    toast.success('回答卡片已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制回答卡片失败'))
  }
}

const saveNote = async () => {
  if (!detail.value || !question.value || !ensureLogin() || isSavingNote.value) return
  isSavingNote.value = true
  try {
    await questionApi.updateNote(question.value.id, {
      note: noteText.value,
      mistakeReason: mistakeReason.value,
      answerDraft: answerDraft.value,
      starStory: starStory.value,
    })
    toast.success('笔记已保存')
    isNoteDirty.value = false
    safeStorage.remove(noteDraftKey.value)
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '笔记保存失败'))
  } finally {
    isSavingNote.value = false
  }
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!isNoteDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!isNoteDirty.value) return true
  return window.confirm(unsavedLeaveMessage)
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.pill {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(248 250 252);
  padding: 0.45rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: rgb(71 85 105);
}
.company {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}
.insight-tile {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.85rem 1rem;
}
.insight-tile span {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}
.insight-tile strong {
  margin-top: 0.25rem;
  display: block;
  font-size: 1.1rem;
  color: rgb(15 23 42);
}
.schedule-tile {
  border-radius: 0.5rem;
  background: rgb(255 251 235);
  padding: 0.85rem 1rem;
}
.schedule-tile span {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(146 64 14);
}
.schedule-tile strong {
  margin-top: 0.25rem;
  display: block;
  font-size: 1rem;
  color: rgb(120 53 15);
}
.structured-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1.25rem;
}
.structured-panel h2 {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(71 85 105);
}
.structured-panel p {
  margin-top: 0.75rem;
  white-space: pre-wrap;
  font-size: 0.875rem;
  line-height: 1.75;
  color: rgb(51 65 85);
}
.primary-action {
  border-radius: 0.75rem;
  background: rgb(37 99 235);
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
}
.secondary-action,
.state-select,
.reason-select {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(71 85 105);
}
.note-input {
  width: 100%;
  resize: vertical;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.85rem 1rem;
  font-size: 0.875rem;
  line-height: 1.7;
  color: rgb(30 41 59);
  outline: none;
}
.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(30 64 175);
}
.note-input:focus {
  border-color: rgb(37 99 235);
  box-shadow: 0 0 0 3px rgb(191 219 254 / 0.65);
}
.dark .pill,
.dark .insight-tile,
.dark .structured-panel,
.dark .secondary-action,
.dark .state-select,
.dark .reason-select,
.dark .note-input {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
.dark .insight-tile span {
  color: rgb(148 163 184);
}
.dark .insight-tile strong {
  color: rgb(248 250 252);
}
.dark .schedule-tile {
  background: rgb(69 26 3 / 0.35);
}
.dark .schedule-tile span {
  color: rgb(253 230 138);
}
.dark .schedule-tile strong {
  color: rgb(254 243 199);
}
.dark .structured-panel h2 {
  color: rgb(148 163 184);
}
.dark .structured-panel p {
  color: rgb(203 213 225);
}
</style>
