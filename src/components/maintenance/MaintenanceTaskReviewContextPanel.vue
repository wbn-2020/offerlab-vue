<template>
  <section class="review-context-panel" data-v34-maintenance-review-context="public-evidence-only">
    <button
      type="button"
      class="review-context-toggle"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <span>复核上下文</span>
      <ChevronDown class="h-4 w-4" :class="{ 'rotate-180': expanded }" />
    </button>

    <div v-if="expanded" class="review-context-content">
      <div v-if="loading" class="review-state">正在读取复核依据</div>

      <div v-else-if="loadFailed" class="review-state review-state-error">
        <p>复核依据暂不可读取</p>
        <button type="button" class="retry-button" @click="load">重试</button>
      </div>

      <template v-else-if="context">
        <p v-if="context.degraded" class="degraded-note">
          复核上下文当前处于降级状态，仍需人工核验。
        </p>

        <div class="context-grid">
          <section class="context-section">
            <h3>关联原内容</h3>
            <template v-if="source">
              <p class="content-title">{{ source.title }}</p>
              <RouterLink v-if="sourceHref" :to="sourceHref" class="content-link">查看公开内容</RouterLink>
            </template>
            <p v-else class="muted-copy">{{ linkedPostMessage(context.source) }}</p>
          </section>

          <section class="context-section">
            <h3>交付内容</h3>
            <template v-if="delivery">
              <p class="content-title">{{ delivery.title }}</p>
              <RouterLink v-if="deliveryHref" :to="deliveryHref" class="content-link">查看公开内容</RouterLink>
            </template>
            <p v-else class="muted-copy">{{ deliveryMessage }}</p>
          </section>
        </div>

        <section class="context-section evidence-section">
          <h3>公开修订依据</h3>
          <p :class="['evidence-state', evidenceStateClass]">{{ evidenceStateLabel }}</p>
          <p v-if="context.evidence.summary" class="evidence-summary">{{ context.evidence.summary }}</p>

          <div v-if="showUpdates" class="update-list">
            <article
              v-for="update in context.evidence.updates"
              :key="`${update.resultVersion}-${update.createTime}`"
              class="update-item"
            >
              <div class="update-meta">
                <span>版本 {{ update.resultVersion }}</span>
                <time>{{ formatTime(update.createTime) }}</time>
              </div>
              <p>{{ update.publicUpdateSummary }}</p>
              <small v-if="update.impactScope">影响范围：{{ update.impactScope }}</small>
            </article>
          </div>

          <div v-else-if="evidenceUnavailable" class="review-state review-state-unavailable">
            <p>复核依据暂不可读取</p>
            <button type="button" class="retry-button" @click="load">重试</button>
          </div>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type {
  ApiId,
} from '@/api/types'
import {
  contentMaintenanceApi,
  isSafeContentMaintenancePostHref,
  type ContentMaintenanceLinkedPublicPost,
  type ContentMaintenanceRevisionEvidenceState,
  type ContentMaintenanceTaskReviewContext,
} from '@/api/contentMaintenance'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  taskId: ApiId
  contextKey?: string
}>()

interface ReviewContextRequestSnapshot {
  requestId: number
  taskId: string
  contextKey: string
  accountKey: string
  accountGeneration: number
  controller: AbortController
}

const authStore = useAuthStore()
const expanded = ref(false)
const loading = ref(false)
const loadFailed = ref(false)
const context = ref<ContentMaintenanceTaskReviewContext | null>(null)
let requestId = 0
let accountGeneration = 0
let controller: AbortController | null = null

const currentAccountKey = () => `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
const currentTaskId = () => String(props.taskId)
const currentContextKey = () => props.contextKey || ''
const accountIsReady = () => authStore.isLoggedIn && Boolean(authStore.user?.uid)

const abortLoad = () => {
  controller?.abort()
  controller = null
}

const requestIsCurrent = (snapshot: ReviewContextRequestSnapshot) => (
  snapshot.requestId === requestId
  && snapshot.taskId === currentTaskId()
  && snapshot.contextKey === currentContextKey()
  && snapshot.accountKey === currentAccountKey()
  && snapshot.accountGeneration === accountGeneration
  && controller === snapshot.controller
  && !snapshot.controller.signal.aborted
  && accountIsReady()
)

const reset = (collapse = false) => {
  requestId += 1
  abortLoad()
  loading.value = false
  loadFailed.value = false
  context.value = null
  if (collapse) expanded.value = false
}

const source = computed(() => (
  context.value?.source?.availability === 'AVAILABLE' ? context.value.source : null
))
const delivery = computed(() => (
  context.value?.delivery?.availability === 'AVAILABLE' ? context.value.delivery : null
))
const linkedPostHref = (post: ContentMaintenanceLinkedPublicPost | null) => (
  post?.availability === 'AVAILABLE' && isSafeContentMaintenancePostHref(post.postHref)
    ? post.postHref.trim()
    : null
)
const sourceHref = computed(() => linkedPostHref(source.value))
const deliveryHref = computed(() => linkedPostHref(delivery.value))
const evidenceUnavailable = computed(() => context.value?.evidence.state === 'EVIDENCE_UNAVAILABLE')
const showUpdates = computed(() => (
  context.value?.evidence.state === 'SAME_POST_UPDATED'
  && context.value.evidence.updates.length > 0
))
const evidenceStateLabel = computed(() => evidenceLabel(context.value?.evidence.state))
const evidenceStateClass = computed(() => (
  evidenceUnavailable.value ? 'evidence-unavailable' : 'evidence-factual'
))
const deliveryMessage = computed(() => {
  if (context.value?.evidence.state === 'NON_POST_DELIVERY') {
    return '已提交非帖子交付，当前无帖子修订依据'
  }
  return linkedPostMessage(context.value?.delivery || null)
})

const linkedPostMessage = (post: ContentMaintenanceLinkedPublicPost | null) => {
  if (!post || post.availability === 'NOT_LINKED') return '当前没有关联公开内容。'
  return '关联内容当前不可作为公开复核依据。'
}

const evidenceLabel = (state: ContentMaintenanceRevisionEvidenceState | undefined) => ({
  NOT_SUBMITTED: '尚未提交交付',
  NON_POST_DELIVERY: '已提交非帖子交付，当前无帖子修订依据',
  SAME_POST_UPDATED: '任务创建后存在公开更新说明',
  SAME_POST_NO_PUBLIC_UPDATE: '未找到任务创建后的公开更新说明',
  SEPARATE_PUBLIC_DELIVERY: '交付为独立公开内容',
  SOURCE_UNAVAILABLE: '关联原内容当前不可作为公开复核依据',
  DELIVERY_UNAVAILABLE: '交付内容当前不可作为公开复核依据',
  EVIDENCE_UNAVAILABLE: '复核依据暂不可读取',
}[state || 'EVIDENCE_UNAVAILABLE'])

const formatTime = (value: string) => value.replace('T', ' ').slice(0, 16) || '--'

const load = async () => {
  if (loading.value || !accountIsReady()) return
  abortLoad()
  const nextController = new AbortController()
  const snapshot: ReviewContextRequestSnapshot = {
    requestId: ++requestId,
    taskId: currentTaskId(),
    contextKey: currentContextKey(),
    accountKey: currentAccountKey(),
    accountGeneration,
    controller: nextController,
  }
  controller = nextController
  loading.value = true
  loadFailed.value = false
  try {
    const res = await contentMaintenanceApi.reviewContext(props.taskId, {
      signal: nextController.signal,
    })
    if (!requestIsCurrent(snapshot)) return
    if (!res.data) {
      context.value = null
      loadFailed.value = true
      return
    }
    context.value = res.data
  } catch {
    if (!requestIsCurrent(snapshot)) return
    context.value = null
    loadFailed.value = true
  } finally {
    if (requestIsCurrent(snapshot)) {
      loading.value = false
      controller = null
    }
  }
}

const toggle = () => {
  if (expanded.value) {
    expanded.value = false
    reset()
    return
  }
  expanded.value = true
  if (!context.value) void load()
}

watch(
  [currentTaskId, currentContextKey],
  ([taskId, contextKey], [previousTaskId, previousContextKey]) => {
    if (taskId === previousTaskId && contextKey === previousContextKey) return
    reset(true)
  },
)

watch(
  [() => authStore.user?.uid, () => authStore.token],
  ([uid, token], [previousUid, previousToken]) => {
    if (uid === previousUid && token === previousToken) return
    accountGeneration += 1
    reset(true)
  },
)

onBeforeUnmount(() => {
  requestId += 1
  abortLoad()
})
</script>

<style scoped>
.review-context-panel { margin-top: .9rem; border-top: 1px solid rgb(226 232 240); padding-top: .8rem; }
.review-context-toggle { display: inline-flex; min-height: 32px; align-items: center; gap: .35rem; border: 0; background: transparent; padding: .2rem 0; color: rgb(8 145 178); font-size: .76rem; font-weight: 900; }
.review-context-toggle svg { transition: transform .15s ease; }
.review-context-content { margin-top: .65rem; }
.context-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
.context-section { border: 1px solid rgb(226 232 240); border-radius: .5rem; padding: .7rem; }
.context-section h3 { margin: 0; color: rgb(51 65 85); font-size: .73rem; font-weight: 900; }
.content-title,.muted-copy,.evidence-state,.evidence-summary { margin: .45rem 0 0; color: rgb(51 65 85); font-size: .76rem; line-height: 1.55; }
.muted-copy { color: rgb(100 116 139); }
.content-link { display: inline-flex; margin-top: .45rem; color: rgb(8 145 178); font-size: .73rem; font-weight: 800; }
.evidence-section { margin-top: .65rem; }
.evidence-state { font-weight: 900; }
.evidence-factual { color: rgb(14 116 144); }
.evidence-unavailable { color: rgb(185 28 28); }
.degraded-note { margin: 0 0 .65rem; border-left: 2px solid rgb(251 191 36); padding-left: .6rem; color: rgb(146 64 14); font-size: .74rem; line-height: 1.55; }
.update-list { display: grid; gap: .5rem; margin-top: .65rem; }
.update-item { border-top: 1px solid rgb(241 245 249); padding-top: .55rem; }
.update-item:first-child { border-top: 0; padding-top: 0; }
.update-meta { display: flex; justify-content: space-between; gap: .6rem; color: rgb(100 116 139); font-size: .7rem; font-weight: 800; }
.update-item p,.update-item small { display: block; margin: .35rem 0 0; color: rgb(71 85 105); font-size: .74rem; line-height: 1.5; }
.update-item small { color: rgb(100 116 139); }
.review-state { border: 1px dashed rgb(203 213 225); border-radius: .5rem; padding: .85rem; color: rgb(100 116 139); font-size: .76rem; text-align: center; }
.review-state p { margin: 0; }
.review-state-error,.review-state-unavailable { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.review-state-unavailable { margin-top: .65rem; }
.retry-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; margin-top: .55rem; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .35rem .65rem; color: rgb(51 65 85); font-size: .73rem; font-weight: 900; }
@media (max-width: 640px) { .context-grid { grid-template-columns: 1fr; } }
.dark .review-context-panel,.dark .update-item { border-color: rgb(51 65 85); }
.dark .context-section,.dark .retry-button,.dark .review-state { border-color: rgb(51 65 85); background: rgb(15 23 42); }
.dark .context-section h3,.dark .content-title,.dark .evidence-summary,.dark .update-item p { color: rgb(203 213 225); }
.dark .muted-copy,.dark .update-meta,.dark .update-item small,.dark .review-state { color: rgb(148 163 184); }
.dark .retry-button { color: rgb(203 213 225); }
</style>
