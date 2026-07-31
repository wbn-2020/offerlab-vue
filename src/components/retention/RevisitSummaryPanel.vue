<template>
  <section
    class="revisit-panel"
    :class="{ 'revisit-panel-compact': compact }"
    data-stage6-server-revisits
    data-on-site-only
    :data-revisit-state="state"
  >
    <div class="revisit-head">
      <div class="min-w-0">
        <p class="revisit-eyebrow">站内回访</p>
        <h2>{{ compact ? '回来看看' : '回来看看：值得继续的公开内容与讨论' }}</h2>
        <p>只整理你已有的站内公开内容关系，不产生外部推送、广告或支付。</p>
      </div>
      <RouterLink :to="authStore.isLoggedIn ? '/me?tab=favorites' : '/login'" class="revisit-action">
        {{ authStore.isLoggedIn ? '我的内容' : '登录查看' }}
      </RouterLink>
    </div>

    <div v-if="routeState" class="revisit-filters">
      <label>
        <span>回访状态</span>
        <select :value="effectiveStatus" @change="setRouteStatus">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="!authStore.isLoggedIn" class="revisit-empty">
      <LogIn class="h-4 w-4" />
      <span>登录后显示你可以继续处理的站内回访项。</span>
    </div>

    <div v-else-if="loading && items.length === 0" class="revisit-empty" role="status" data-revisit-state="loading">
      <RefreshCcw class="h-4 w-4 animate-spin" />
      <span>正在读取站内回访项...</span>
    </div>

    <div v-else-if="errorText && items.length === 0" class="revisit-empty revisit-error" role="alert" data-revisit-state="error">
      <AlertCircle class="h-4 w-4" />
      <div>
        <strong>站内回访暂时无法读取</strong>
        <span>{{ errorText }}</span>
      </div>
      <button type="button" class="revisit-action" @click="loadRevisits">重试</button>
    </div>

    <div v-else-if="groups.length" class="revisit-block-grid">
      <article v-for="group in groups" :key="group.key" class="revisit-block">
        <div class="revisit-block-title">
          <component :is="group.icon" class="h-4 w-4" />
          <strong>{{ group.title }}</strong>
        </div>
        <p>{{ group.description }}</p>

        <div class="revisit-link-list">
          <div v-for="item in group.items" :key="item.id" class="revisit-item">
            <RouterLink :to="item.targetPath" class="revisit-link">
              <span>{{ item.title }}</span>
              <small>{{ item.description || reasonLabel(item.reasonType) }}</small>
            </RouterLink>
            <div v-if="item.status === 'OPEN' || item.status === 'SNOOZED'" class="revisit-item-actions">
              <button
                type="button"
                :disabled="Boolean(pendingId)"
                title="完成回访"
                aria-label="完成回访"
                @click="complete(item)"
              >
                <Check class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                :disabled="Boolean(pendingId)"
                title="两天后再提醒"
                aria-label="两天后再提醒"
                @click="snooze(item)"
              >
                <Clock3 class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                :disabled="Boolean(pendingId)"
                title="忽略此项"
                aria-label="忽略此项"
                @click="ignore(item)"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="revisit-empty" data-revisit-state="empty">
      <BookOpen class="h-4 w-4" />
      <span>当前筛选下没有需要回访的站内内容。</span>
    </div>

    <p class="revisit-preference-note">
      回访项由服务端保留并按当前状态更新；仅基于既有公开内容关系，不保存私信、联系方式或设备推送信息。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AlertCircle, BookOpen, BookmarkCheck, Check, Clock3, LogIn, MessageCircle, RefreshCcw, UserRoundCheck, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { retentionApi, type RevisitItem, type RevisitStatus } from '@/api/retention'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  compact?: boolean
  routeState?: boolean
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const items = ref<RevisitItem[]>([])
const loading = ref(false)
const pendingId = ref('')
const errorText = ref('')
let requestGeneration = 0

const statusOptions: Array<{ value: RevisitStatus; label: string }> = [
  { value: 'OPEN', label: '待回访' },
  { value: 'SNOOZED', label: '已延后' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'IGNORED', label: '已忽略' },
]
const validStatuses = new Set(statusOptions.map((option) => option.value))
const routeStatus = computed(() => {
  if (!props.routeState) return 'OPEN' as RevisitStatus
  const raw = Array.isArray(route.query.status) ? route.query.status[0] : route.query.status
  const value = String(raw || '').toUpperCase() as RevisitStatus
  return validStatuses.has(value) ? value : 'OPEN'
})
const effectiveStatus = computed(() => routeStatus.value)
const requestKey = computed(() => (
  `${String(authStore.user?.uid ?? 'anonymous')}:${String(authStore.token ?? '')}:${effectiveStatus.value}`
))
const state = computed(() => {
  if (!authStore.isLoggedIn) return 'empty'
  if (loading.value && items.value.length === 0) return 'loading'
  if (errorText.value && items.value.length === 0) return 'error'
  return items.value.length ? 'ready' : 'empty'
})

const sourceMeta = (sourceType: string) => {
  const source = sourceType.toUpperCase()
  if (source === 'DISCUSSION_FOLLOW') {
    return { key: 'discussion', title: '参与过的讨论', description: '有新回复或关键讨论进展的公开内容。', icon: MessageCircle }
  }
  if (source === 'FOLLOWING_AUTHOR') {
    return { key: 'following', title: '关注作者更新', description: '你已关注作者发布的公开更新。', icon: UserRoundCheck }
  }
  if (source === 'FAVORITE') {
    return { key: 'favorite', title: '收藏与稍后处理', description: '你保存过、可以继续整理的公开内容。', icon: BookmarkCheck }
  }
  return { key: 'other', title: '其他站内回访', description: '来自既有站内公开内容关系的回访项。', icon: BookOpen }
}

const groups = computed(() => {
  const bucket = new Map<string, { key: string; title: string; description: string; icon: any; items: RevisitItem[] }>()
  for (const item of items.value) {
    const meta = sourceMeta(item.sourceType)
    const group = bucket.get(meta.key) || { ...meta, items: [] }
    group.items.push(item)
    bucket.set(meta.key, group)
  }
  return [...bucket.values()]
    .map((group) => ({ ...group, items: group.items.slice(0, 5) }))
    .filter((group) => group.items.length > 0)
})

const reasonLabel = (reasonType: string) => {
  const reason = String(reasonType || '').toUpperCase()
  if (reason.includes('COMMENT')) return '讨论有新的公开回复'
  if (reason.includes('FAVORITE')) return '来自你保存的公开内容'
  if (reason.includes('FOLLOW')) return '来自你关注的作者更新'
  return '来自既有的站内内容关系'
}

const removeOrReplace = (item: RevisitItem | null) => {
  if (!item || item.status !== 'OPEN') {
    items.value = items.value.filter((candidate) => String(candidate.id) !== String(item?.id ?? ''))
    return
  }
  items.value = items.value.map((candidate) => String(candidate.id) === String(item.id) ? item : candidate)
}

const loadRevisits = async () => {
  const generation = ++requestGeneration
  const key = requestKey.value
  if (!authStore.isLoggedIn) {
    items.value = []
    errorText.value = ''
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    const res = await retentionApi.listRevisits({ status: effectiveStatus.value, size: 20 })
    if (generation !== requestGeneration || key !== requestKey.value) return
    items.value = res.data?.items || []
    errorText.value = res.data?.diagnostics?.migrationPending === true
      ? '站内回访服务正在等待数据迁移完成。'
      : ''
  } catch (error) {
    if (generation !== requestGeneration || key !== requestKey.value) return
    items.value = []
    errorText.value = getErrorMessage(error, '站内回访项暂时无法读取。')
  } finally {
    if (generation === requestGeneration && key === requestKey.value) loading.value = false
  }
}

const complete = async (item: RevisitItem) => {
  pendingId.value = String(item.id)
  try {
    const res = await retentionApi.completeRevisit(item.id)
    removeOrReplace(res.data)
  } catch (error) {
    toast.error(getErrorMessage(error, '暂时无法完成这条回访。'))
  } finally {
    pendingId.value = ''
  }
}

const snooze = async (item: RevisitItem) => {
  pendingId.value = String(item.id)
  try {
    const until = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const res = await retentionApi.snoozeRevisit(item.id, {
      until: new Date(until.getTime() - until.getTimezoneOffset() * 60_000).toISOString().slice(0, 19),
    })
    removeOrReplace(res.data)
    toast.success('两天后再提醒。')
  } catch (error) {
    toast.error(getErrorMessage(error, '暂时无法延后这条回访。'))
  } finally {
    pendingId.value = ''
  }
}

const ignore = async (item: RevisitItem) => {
  pendingId.value = String(item.id)
  try {
    const res = await retentionApi.ignoreRevisit(item.id)
    removeOrReplace(res.data)
  } catch (error) {
    toast.error(getErrorMessage(error, '暂时无法忽略这条回访。'))
  } finally {
    pendingId.value = ''
  }
}

const setRouteStatus = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value.toUpperCase() as RevisitStatus
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      status: validStatuses.has(value) && value !== 'OPEN' ? value : undefined,
    },
  })
}

watch(requestKey, () => {
  items.value = []
  errorText.value = ''
  void loadRevisits()
}, { immediate: true })
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

.revisit-item {
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.55rem;
}

.revisit-link {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
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

.revisit-item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
  margin-top: 0.45rem;
}

.revisit-item-actions button {
  display: inline-flex;
  min-width: 2rem;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  color: rgb(71 85 105);
}

.revisit-item-actions button:hover:not(:disabled) {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
}

.revisit-item-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
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

.dark .revisit-item {
  background: rgb(15 23 42);
}

.dark .revisit-item-actions button:hover:not(:disabled) {
  background: rgb(30 58 138 / 0.5);
  color: rgb(191 219 254);
}

.revisit-filters {
  margin-bottom: 1rem;
}

.revisit-filters label,
.revisit-filters span {
  display: block;
}

.revisit-filters span {
  margin-bottom: 0.35rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  font-weight: 800;
}

.revisit-filters select {
  width: min(100%, 16rem);
  min-height: 2.5rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0 0.7rem;
  color: rgb(15 23 42);
  font-size: 0.8rem;
}

.revisit-error {
  border-color: rgb(254 202 202);
  color: rgb(185 28 28);
}

.revisit-error strong,
.revisit-error span {
  display: block;
}

.dark .revisit-filters select {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

@media (max-width: 768px) {
  .revisit-head {
    flex-direction: column;
  }

  .revisit-action {
    width: 100%;
  }

  .revisit-block-grid {
    grid-template-columns: 1fr;
  }
}
</style>
