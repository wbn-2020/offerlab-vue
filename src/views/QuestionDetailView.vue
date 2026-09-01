<template>
  <div class="app-shell">
    <AppHeader />
    <main class="community-page question-detail-page">
      <LoadingSkeleton v-if="isQuestionLoading" />
      <section v-else-if="isQuestionNotFound" class="detail-state">
        <FileQuestion class="detail-state-icon" aria-hidden="true" />
        <h3>题目不存在或已被删除</h3>
        <p>
          这张知识卡可能已被下架、来源内容不可见，或本地演示数据还没有补到当前数据库。
        </p>
        <div class="detail-state-actions">
          <RouterLink to="/questions" class="primary-action">
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            返回知识库
          </RouterLink>
          <RouterLink :to="{ path: '/search', query: { q: questionId } }" class="secondary-action">
            <Search class="h-4 w-4" aria-hidden="true" />
            搜索相似内容
          </RouterLink>
          <RouterLink to="/" class="secondary-action">回到首页</RouterLink>
        </div>
      </section>
      <section v-else-if="isError" class="detail-state detail-state--error">
        <AlertCircle class="detail-state-icon" aria-hidden="true" />
        <h3>题目加载失败</h3>
        <p>
          {{ getErrorMessage(error, '题目详情暂时无法加载，请稍后重试。') }}
        </p>
        <div class="detail-state-actions">
          <button type="button" class="primary-action" @click="refetch()">
            <RefreshCw class="h-4 w-4" aria-hidden="true" />
            重试
          </button>
          <RouterLink to="/questions" class="secondary-action">返回知识库</RouterLink>
        </div>
      </section>
      <EmptyState v-else-if="!detail || !question" title="知识卡不存在" description="这张知识卡可能已隐藏、来源内容不可见，或当前知识库还没有同步到详情页。" action-text="返回知识库" action-href="/questions" />
      <template v-else>
        <nav class="detail-breadcrumb" aria-label="面包屑">
          <RouterLink to="/questions">
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            知识库
          </RouterLink>
          <span aria-hidden="true">/</span>
          <span>知识卡详情</span>
        </nav>

        <div class="question-detail-layout">
          <article class="question-reading">
            <header class="question-title-block">
              <div class="question-meta">
                <RouterLink v-if="question.company" :to="{ path: '/search', query: { q: question.company, mode: 'posts' } }" class="pill company">{{ question.company }}</RouterLink>
                <span v-if="question.position" class="pill">{{ question.position }}</span>
                <span v-if="question.interviewRound" class="pill">{{ question.interviewRound }}</span>
                <span class="pill">{{ difficultyText(question.difficulty) }}</span>
              </div>
              <h1>{{ question.questionText }}</h1>
              <p class="question-reading-note">
                这张知识卡由公开内容整理而来。先阅读考察点和参考思路，再结合来源内容判断适用边界。
              </p>
            </header>

            <section class="question-signals" aria-label="知识卡信号">
              <div class="insight-tile">
                <span>来源频次</span>
                <strong>{{ sourcePostCount }} 篇</strong>
                <small>公开内容中的出现次数</small>
              </div>
              <div v-if="Number(question.qualityScore || 0) > 0" class="insight-tile">
                <span>质量分</span>
                <strong>{{ question.qualityScore }}</strong>
                <small>结构完整度提示</small>
              </div>
              <div class="insight-tile">
                <span>题组关系</span>
                <strong>{{ isCanonicalRoot ? '主题题' : '同题卡' }}</strong>
                <small>{{ isCanonicalRoot ? '当前题组的主问题' : '已归并到相关主题' }}</small>
              </div>
            </section>

            <section v-if="question.examPoint" class="reading-section reading-section--focus">
              <div class="reading-section-heading">
                <Target class="h-5 w-5" aria-hidden="true" />
                <h2>核心考察点</h2>
              </div>
              <p>{{ question.examPoint }}</p>
            </section>

            <section class="reading-section">
              <div class="reading-section-heading">
                <Lightbulb class="h-5 w-5" aria-hidden="true" />
                <h2>参考思路</h2>
              </div>
              <p class="reading-prose">
                {{ question.answerHint || '暂未生成参考思路。AI 内容仅作辅助，不作为官方标准答案。' }}
              </p>
            </section>

            <section v-if="question.referenceAnswer" class="reading-section reading-section--answer">
              <div class="reading-section-heading">
                <BookOpenCheck class="h-5 w-5" aria-hidden="true" />
                <h2>参考答案</h2>
              </div>
              <p class="reading-prose">{{ question.referenceAnswer }}</p>
            </section>

            <section v-if="question.sourceSnippet || question.qualityReason" class="evidence-grid">
              <div v-if="question.sourceSnippet" class="structured-panel">
                <div class="reading-section-heading">
                  <Quote class="h-4 w-4" aria-hidden="true" />
                  <h2>来源片段</h2>
                </div>
                <p>{{ question.sourceSnippet }}</p>
              </div>
              <div v-if="question.qualityReason" class="structured-panel">
                <div class="reading-section-heading">
                  <BadgeCheck class="h-4 w-4" aria-hidden="true" />
                  <h2>质量说明</h2>
                </div>
                <p>{{ question.qualityReason }}</p>
              </div>
            </section>

            <section v-if="enableLegacyTrainingTools" class="answer-workspace">
              <div class="answer-workspace-heading">
                <div>
                  <h2>我的笔记</h2>
                  <p>记录自己的答案思路、STAR 项目映射、易错点和复习提醒。</p>
                </div>
                <div class="answer-workspace-actions">
                  <button type="button" class="secondary-action" @click="copyAnswerCard">
                    <Copy class="h-4 w-4" aria-hidden="true" />
                    复制回答卡片
                  </button>
                  <button type="button" class="primary-action" :disabled="isSavingNote" @click="saveNote">
                    <Save class="h-4 w-4" aria-hidden="true" />
                    {{ isSavingNote ? '保存中...' : '保存笔记' }}
                  </button>
                </div>
              </div>
              <div class="answer-editor-grid">
                <label class="answer-field">
                  <span class="field-label">回答草稿</span>
                  <textarea
                    v-model.trim="answerDraft"
                    maxlength="4000"
                    rows="7"
                    class="note-input"
                    placeholder="用自己的话整理这道题的回答草稿，比如先定义，再说场景，再补充权衡。"
                    @focus="ensureLogin"
                    @input="markNoteDirty"
                  />
                  <small>{{ answerDraft.length }} / 4000</small>
                </label>
                <label class="answer-field">
                  <span class="field-label">STAR 项目映射</span>
                  <textarea
                    v-model.trim="starStory"
                    maxlength="2000"
                    rows="7"
                    class="note-input"
                    placeholder="S: 场景 / T: 目标 / A: 行动 / R: 结果，补一段能支撑这道题的项目经历。"
                    @focus="ensureLogin"
                    @input="markNoteDirty"
                  />
                  <small>{{ starStory.length }} / 2000</small>
                </label>
              </div>
              <label class="mistake-field">
                <span class="field-label">错因标签</span>
                <select v-model="mistakeReason" class="reason-select" @focus="ensureLogin" @change="markNoteDirty">
                  <option value="">暂不标记</option>
                  <option value="concept">概念不熟</option>
                  <option value="project">项目表达弱</option>
                  <option value="memory">需要记忆</option>
                  <option value="expression">表达不清</option>
                  <option value="careless">粗心失误</option>
                  <option value="other">其他</option>
                </select>
              </label>
              <div v-if="isNoteDirty" class="draft-notice" role="status">
                有未保存的笔记改动，已在本地暂存
              </div>
              <label class="answer-field">
                <span class="field-label">复习笔记</span>
                <textarea
                  v-model.trim="noteText"
                  maxlength="4000"
                  rows="5"
                  class="note-input"
                  placeholder="例如：先说明 HashMap 扩容，再补充并发场景下为什么要用 ConcurrentHashMap。"
                  @focus="ensureLogin"
                  @input="markNoteDirty"
                />
                <small>{{ noteText.length }} / 4000</small>
              </label>
            </section>

            <footer class="question-footer">
              <div v-if="question.tags.length" class="tag-list" aria-label="知识卡标签">
                <span v-for="tag in question.tags" :key="tag.id">{{ tag.name }}</span>
              </div>
              <p>参考内容来自公开社区整理，不替代来源作者的完整表达，也不构成专业结论。</p>
            </footer>
          </article>

          <aside class="question-sidebar">
            <section class="sidebar-panel action-panel">
              <h2>保存与继续</h2>
              <button
                :class="question.favorite ? 'secondary-action' : 'primary-action'"
                :disabled="isTogglingFavorite"
                @click="toggleFavorite"
              >
                <Bookmark class="h-4 w-4" aria-hidden="true" />
                {{ isTogglingFavorite ? '处理中...' : (question.favorite ? '取消收藏' : '收藏题目') }}
              </button>
              <select v-if="enableLegacyTrainingTools" v-model="selectedProgress" class="state-select" :disabled="isUpdatingProgress" @change="updateProgress">
                <option value="">学习状态</option>
                <option value="todo">待学习</option>
                <option value="learning">学习中</option>
                <option value="mastered">已掌握</option>
                <option value="review">待复习</option>
              </select>
              <RouterLink
                v-if="detail.sourcePosts.length"
                :to="`/post/${detail.sourcePosts[0].postId}`"
                class="secondary-action"
              >
                <ExternalLink class="h-4 w-4" aria-hidden="true" />
                查看来源内容
              </RouterLink>
              <button v-else class="secondary-action" type="button" disabled>
                暂无可跳转来源
              </button>
            </section>

            <section v-if="hasReviewSchedule" class="sidebar-panel review-panel">
              <div class="sidebar-heading">
                <CalendarClock class="h-5 w-5" aria-hidden="true" />
                <h2>复习计划</h2>
              </div>
              <dl class="review-schedule">
                <div class="schedule-tile">
                  <dt>下次复习</dt>
                  <dd>{{ formatReviewDate(question.nextReviewAt) }}</dd>
                </div>
                <div class="schedule-tile">
                  <dt>已复习</dt>
                  <dd>{{ question.reviewCount }} 次</dd>
                </div>
                <div class="schedule-tile">
                  <dt>当前间隔</dt>
                  <dd>{{ question.reviewIntervalDays }} 天</dd>
                </div>
              </dl>
            </section>

            <section class="sidebar-panel">
              <h2>来源内容</h2>
              <div v-if="detail.sourcePosts.length" class="sidebar-link-list">
                <RouterLink v-for="post in detail.sourcePosts" :key="post.postId" :to="`/post/${post.postId}`">
                  <span>{{ post.title }}</span>
                  <small>{{ post.counter.view }} 浏览</small>
                </RouterLink>
              </div>
              <p v-else class="sidebar-empty">暂无可见来源。</p>
            </section>

            <section class="sidebar-panel">
              <h2>相似知识卡</h2>
              <div v-if="detail.relatedQuestions.length" class="sidebar-link-list">
                <RouterLink v-for="item in detail.relatedQuestions" :key="item.id" :to="`/questions/${item.id}`">
                  <span>{{ item.questionText }}</span>
                </RouterLink>
              </div>
              <p v-else class="sidebar-empty">暂无相似题。</p>
            </section>

            <section v-if="enableLegacyTrainingTools" class="sidebar-panel legacy-actions">
              <h2>兼容学习入口</h2>
              <RouterLink :to="mockInterviewLink" class="primary-action">
                加入知识复盘
              </RouterLink>
              <RouterLink :to="prepReturnLink" class="secondary-action">
                回学习空间
              </RouterLink>
            </section>

            <nav class="sidebar-navigation" aria-label="详情页导航">
              <RouterLink to="/questions">返回知识库</RouterLink>
              <RouterLink to="/me">回个人主页</RouterLink>
            </nav>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  BookOpenCheck,
  CalendarClock,
  Copy,
  ExternalLink,
  FileQuestion,
  Lightbulb,
  Quote,
  RefreshCw,
  Save,
  Search,
  Target,
} from 'lucide-vue-next'
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
const enableLegacyTrainingTools = import.meta.env.VITE_OFFERLAB_ENABLE_LEGACY_TRAINING === 'true'
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
  queryKey: computed(() => ['question', questionId.value, authStore.sessionQueryScope]),
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
const primaryFocusTag = computed(() => (
  question.value?.tags?.[0]?.name
  || question.value?.examPoint
  || question.value?.position
  || question.value?.company
  || ''
))
const mockInterviewLink = computed(() => ({
  path: '/mock-interview',
  query: {
    company: question.value?.company,
    position: question.value?.position,
    focusTag: primaryFocusTag.value,
    questionCount: 5,
  },
}))
const prepReturnLink = computed(() => ({
  path: '/me/prep',
  query: question.value?.progressStatus ? { progressStatus: question.value.progressStatus } : undefined,
}))
const QUESTION_DRAFT_TTL = 30 * 24 * 60 * 60 * 1000
const storageOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const noteDraftKey = computed(() => `offerlab:${storageOwner.value}:question-note-draft:${questionId.value}`)
const draftScope = computed(() => `${storageOwner.value}:${questionId.value}`)
const unsavedLeaveMessage = '你有未保存的题目笔记，离开后可从本地草稿恢复。确定要离开吗？'
let draftStorageWarningShown = false

const noteDraftStorageOptions = (owner = storageOwner.value) => ({
  owner,
  namespace: 'question-note-draft',
  ttlMs: QUESTION_DRAFT_TTL,
  maxEntryBytes: 250_000,
})

const markNoteDirty = () => {
  if (!detail.value || !question.value || isSavingNote.value) return
  isNoteDirty.value = noteText.value !== (question.value.note || '')
    || mistakeReason.value !== (question.value.mistakeReason || '')
    || answerDraft.value !== (question.value.answerDraft || '')
    || starStory.value !== (question.value.starStory || '')
  if (isNoteDirty.value) {
    if (storageOwner.value === 'guest') return
    const result = safeStorage.set(noteDraftKey.value, JSON.stringify({
      note: noteText.value,
      mistakeReason: mistakeReason.value,
      answerDraft: answerDraft.value,
      starStory: starStory.value,
    }), { ...noteDraftStorageOptions(), sensitive: true })
    if (!result.ok && !draftStorageWarningShown) {
      draftStorageWarningShown = true
      toast.warning('本地笔记草稿空间不足或不可用，请尽快保存到服务端。')
    } else if (result.ok) {
      draftStorageWarningShown = false
    }
  } else {
    safeStorage.remove(noteDraftKey.value)
  }
}

const loadNoteDraft = () => {
  if (!detail.value || !question.value || draftLoadedFor.value === draftScope.value) return
  draftLoadedFor.value = draftScope.value
  const raw = safeStorage.getDraft(noteDraftKey.value, noteDraftStorageOptions())
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

watch(storageOwner, (nextOwner, prevOwner) => {
  if (prevOwner && prevOwner !== 'guest' && prevOwner !== nextOwner) {
    safeStorage.clearSensitive(prevOwner)
  }
  draftLoadedFor.value = ''
  draftStorageWarningShown = false
  syncNoteEditor()
})

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
.question-detail-page {
  padding-top: 1.5rem;
  padding-bottom: 4rem;
}

.detail-breadcrumb {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.detail-breadcrumb a {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  color: var(--text-primary);
  font-weight: 650;
}

.detail-breadcrumb a:hover {
  color: var(--primary-700);
}

.question-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 19rem;
  gap: 1.25rem;
  align-items: start;
}

.question-reading {
  min-width: 0;
  padding: 1.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
}

.question-title-block {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.question-meta,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.pill {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  padding: 0.4rem 0.7rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.company {
  border-color: #a9d8c3;
  background: var(--primary-50);
  color: var(--primary-700);
}

.question-title-block h1 {
  max-width: 28ch;
  margin-top: 1rem;
  color: var(--text-strong);
  font-size: 2rem;
  font-weight: 760;
  line-height: 1.38;
  text-wrap: pretty;
}

.question-reading-note {
  max-width: 68ch;
  margin-top: 0.85rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
}

.question-signals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-bottom: 1px solid var(--border-subtle);
}

.insight-tile {
  min-width: 0;
  padding: 1rem 0.9rem;
  border-right: 1px solid var(--border-subtle);
}

.insight-tile:first-child {
  padding-left: 0;
}

.insight-tile:last-child {
  padding-right: 0;
  border-right: 0;
}

.insight-tile span {
  display: block;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.insight-tile strong {
  display: block;
  margin-top: 0.25rem;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insight-tile small {
  display: block;
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.68rem;
  line-height: 1.45;
}

.reading-section {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.reading-section--focus {
  margin-top: 1.5rem;
  padding: 1.1rem;
  border: 1px solid #c7d7fe;
  border-radius: var(--radius-surface);
  background: var(--primary-50);
}

.reading-section--answer {
  padding: 1.25rem;
  border: 1px solid #a9e6c5;
  border-radius: var(--radius-surface);
  background: #f0fdf4;
}

.reading-section-heading,
.sidebar-heading {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--text-primary);
}

.reading-section-heading h2,
.sidebar-heading h2 {
  font-size: 0.9rem;
  font-weight: 720;
}

.reading-section > p,
.reading-prose {
  max-width: 72ch;
  margin-top: 0.75rem;
  white-space: pre-wrap;
  color: var(--text-primary);
  font-size: 0.9375rem;
  line-height: 1.9;
  text-wrap: pretty;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.schedule-tile {
  display: grid;
  gap: 0.15rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.schedule-tile:last-child {
  border-bottom: 0;
}

.schedule-tile dt {
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.schedule-tile dd {
  color: var(--text-strong);
  font-size: 0.85rem;
  font-weight: 720;
}

.structured-panel {
  min-width: 0;
  padding: 1rem;
  border-radius: var(--radius-surface);
  background: var(--surface-2);
}

.structured-panel h2 {
  font-size: 0.8rem;
}

.structured-panel p {
  margin-top: 0.65rem;
  white-space: pre-wrap;
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.7;
}

.answer-workspace {
  margin-top: 1.5rem;
  padding: 1.25rem;
  border: 1px solid #a9d8c3;
  border-radius: var(--radius-surface);
  background: #f8fbff;
}

.answer-workspace-heading {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.answer-workspace-heading h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 720;
}

.answer-workspace-heading p {
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.answer-workspace-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.5rem;
}

.answer-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.answer-field {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

.answer-field small {
  justify-self: end;
  color: var(--text-muted);
  font-size: 0.68rem;
}

.mistake-field {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.8rem;
}

.note-input {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.75rem 0.8rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.7;
  outline: none;
}

.field-label {
  display: block;
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.note-input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(47, 111, 235, 0.14);
}

.state-select,
.reason-select {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.55rem 0.7rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 650;
}

.draft-notice {
  margin-top: 0.8rem;
  padding: 0.6rem 0.7rem;
  border-radius: var(--radius-control);
  background: #e8f3ed;
  color: #12634a;
  font-size: 0.75rem;
  font-weight: 650;
}

.question-footer {
  display: grid;
  gap: 0.9rem;
  padding-top: 1.5rem;
}

.tag-list span {
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  padding: 0.35rem 0.65rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.question-footer > p {
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.question-sidebar {
  display: grid;
  gap: 0.8rem;
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
}

.sidebar-panel {
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
}

.sidebar-panel > h2 {
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 720;
}

.action-panel,
.legacy-actions {
  display: grid;
  gap: 0.6rem;
}

.action-panel .primary-action,
.action-panel .secondary-action,
.legacy-actions .primary-action,
.legacy-actions .secondary-action {
  width: 100%;
}

.review-panel {
  background: #fffbeb;
}

.review-schedule {
  margin-top: 0.65rem;
}

.sidebar-link-list {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.65rem;
}

.sidebar-link-list a {
  display: grid;
  gap: 0.25rem;
  padding: 0.6rem;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-primary);
  transition: background-color 0.18s ease, color 0.18s ease;
}

.sidebar-link-list a:hover {
  background: var(--primary-50);
  color: var(--primary-700);
}

.sidebar-link-list span {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.sidebar-link-list small,
.sidebar-empty {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.sidebar-empty {
  margin-top: 0.65rem;
}

.sidebar-navigation {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.25rem 0.2rem;
}

.sidebar-navigation a {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.sidebar-navigation a:hover {
  color: var(--primary-700);
}

.detail-state {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  min-height: 28rem;
  padding: 4rem 1.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  text-align: center;
}

.detail-state-icon {
  width: 2.25rem;
  height: 2.25rem;
  color: var(--primary-600);
}

.detail-state--error .detail-state-icon {
  color: var(--danger);
}

.detail-state h3 {
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 720;
}

.detail-state p {
  max-width: 32rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.65;
}

.detail-state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  margin-top: 0.4rem;
}

@media (max-width: 980px) {
  .question-detail-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .question-sidebar {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sidebar-navigation {
    grid-column: 1 / -1;
  }
}

@media (max-width: 700px) {
  .question-detail-page {
    padding-top: 1rem;
  }

  .question-reading {
    padding: 1.15rem;
  }

  .question-title-block h1 {
    font-size: 1.55rem;
  }

  .question-signals,
  .evidence-grid,
  .answer-editor-grid {
    grid-template-columns: 1fr;
  }

  .insight-tile,
  .insight-tile:first-child,
  .insight-tile:last-child {
    padding: 0.8rem 0;
    border-right: 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .insight-tile:last-child {
    border-bottom: 0;
  }

  .answer-workspace-heading {
    display: grid;
  }

  .answer-workspace-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .mistake-field {
    grid-template-columns: 1fr;
  }

  .question-sidebar {
    grid-template-columns: 1fr;
  }

  .sidebar-navigation {
    grid-column: auto;
  }
}

@media (max-width: 440px) {
  .question-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pill {
    width: 100%;
    min-width: 0;
    padding-inline: 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .answer-workspace {
    padding: 1rem;
  }

  .answer-workspace-actions,
  .detail-state-actions {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .detail-state-actions {
    display: grid;
  }
}

:global(html.dark) .company,
:global(html.dark) .reading-section--focus,
:global(html.dark) .draft-notice,
:global(html.dark) .sidebar-link-list a:hover {
  background: rgba(21, 94, 239, 0.15);
  color: #a9d8c3;
}

:global(html.dark) .reading-section--answer {
  border-color: #166534;
  background: rgba(20, 83, 45, 0.24);
}

:global(html.dark) .answer-workspace {
  border-color: #12634a;
  background: rgba(14, 74, 55, 0.12);
}

:global(html.dark) .review-panel {
  background: rgba(120, 53, 15, 0.24);
}

:global(html.dark) .note-input,
:global(html.dark) .state-select,
:global(html.dark) .reason-select {
  background: color-mix(in srgb, var(--surface-1) 55%, transparent);
}
</style>
