<template>
  <div class="app-shell contact-page">
    <AppHeader />

    <main class="community-page contact-main">
      <section class="page-heading">
        <div>
          <p class="page-kicker">个人工作台 · 联系</p>
          <h1>联系请求</h1>
          <p>处理收到的请求，跟踪已发出的状态，并控制谁可以向你发起联系。</p>
        </div>
        <button type="button" class="secondary-action" :disabled="activeList.loading" @click="reloadActiveList">
          <RefreshCw class="control-icon" :class="{ 'animate-spin': activeList.loading }" />
          {{ activeList.loading ? '刷新中...' : '刷新当前列表' }}
        </button>
      </section>

      <section class="settings-panel">
        <div class="settings-copy">
          <div class="settings-title-row">
            <ShieldCheck class="settings-icon" />
            <div>
              <p class="panel-kicker">接收策略</p>
              <h2>联系权限</h2>
              <p>控制是否接收请求，以及允许发起联系的用户范围。</p>
            </div>
          </div>
          <p v-if="settingsError" class="notice-error mt-4">{{ settingsError }}</p>
        </div>

        <div v-if="settingsLoading" class="settings-loading">正在加载设置...</div>
        <form v-else class="settings-form" @submit.prevent="saveSettings">
          <label class="switch-row">
            <span>
              <strong>接收联系请求</strong>
              <small>关闭后，其他用户不应继续向你发起联系请求。</small>
            </span>
            <input
              v-model="settingsForm.acceptContactRequest"
              type="checkbox"
              class="switch-input"
              :disabled="settingsSaving"
              @change="syncAcceptPolicy"
            >
          </label>

          <label class="setting-field">
            <span>谁可以联系我</span>
            <select
              v-model="settingsForm.contactRequestPolicy"
              class="form-select"
              :disabled="settingsSaving || !settingsForm.acceptContactRequest"
              @change="syncPolicyAccept"
            >
              <option v-for="option in policyOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <div class="settings-actions">
            <button type="button" class="secondary-action" :disabled="settingsLoading || settingsSaving" @click="loadSettings">
              {{ settingsLoading ? '加载中...' : '重新加载' }}
            </button>
            <button type="submit" class="primary-action" :disabled="settingsSaving">
              {{ settingsSaving ? '保存中...' : '保存设置' }}
            </button>
          </div>
        </form>
      </section>

      <section class="request-panel">
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="['tab-button', activeTab === tab.value ? 'tab-active' : '']"
            @click="setActiveTab(tab.value)"
          >
            <component :is="tab.icon" class="control-icon" />
            {{ tab.label }}
            <span>{{ tab.value === 'inbox' ? inbox.items.length : outbox.items.length }}</span>
          </button>
        </div>

        <div v-if="activeTab === 'inbox'" class="request-list">
          <StateBlock
            v-if="inbox.loading && !inbox.items.length"
            title="正在加载收到的联系请求..."
          />
          <StateBlock
            v-else-if="inbox.error && !inbox.items.length"
            title="收到的联系请求加载失败"
            :description="inbox.error"
            action-label="重试"
            @action="loadInbox()"
          />
          <StateBlock
            v-else-if="!inbox.items.length"
            title="暂时没有收到的联系请求"
            description="新的联系请求会在这里出现，你可以选择同意、拒绝、忽略或举报。"
          />
          <template v-else>
            <p v-if="inbox.error" class="notice-error">{{ inbox.error }}</p>
            <article v-for="request in inbox.items" :key="request.requestId" class="request-card">
              <div class="request-main">
                <div class="request-title-row">
                  <h2>{{ request.requesterName || request.requester?.nickname || '未知用户' }}</h2>
                  <span :class="['status-badge', statusClass(request.requestStatus)]">{{ statusLabel(request.requestStatus) }}</span>
                </div>
                <dl class="request-meta">
                  <div>
                    <dt>来源</dt>
                    <dd>{{ sourceLabel(request.sourceType) }}</dd>
                  </div>
                  <div>
                    <dt>场景</dt>
                    <dd>{{ sceneLabel(request.scene) }}</dd>
                  </div>
                  <div>
                    <dt>时间</dt>
                    <dd>{{ formatTime(request.createdAt) }}</dd>
                  </div>
                </dl>
                <p class="request-message">{{ request.messagePreview || '对方未填写说明。' }}</p>
              </div>
              <div class="request-actions">
                <button type="button" class="primary-action" :disabled="isActionDisabled(request)" @click="handleRequestAction(request, 'accept')">
                  {{ actionButtonLabel(request, 'accept', '同意') }}
                </button>
                <button type="button" class="secondary-action" :disabled="isActionDisabled(request)" @click="handleRequestAction(request, 'reject')">
                  {{ actionButtonLabel(request, 'reject', '拒绝') }}
                </button>
                <button type="button" class="secondary-action" :disabled="isActionDisabled(request)" @click="handleRequestAction(request, 'ignore')">
                  {{ actionButtonLabel(request, 'ignore', '忽略') }}
                </button>
                <button type="button" class="danger-action" :disabled="isActionDisabled(request)" @click="handleRequestAction(request, 'report')">
                  {{ actionButtonLabel(request, 'report', '举报') }}
                </button>
              </div>
            </article>
            <LoadMoreButton :state="inbox" @load-more="loadInbox(true)" />
          </template>
        </div>

        <div v-else class="request-list">
          <StateBlock
            v-if="outbox.loading && !outbox.items.length"
            title="正在加载发出的联系请求..."
          />
          <StateBlock
            v-else-if="outbox.error && !outbox.items.length"
            title="发出的联系请求加载失败"
            :description="outbox.error"
            action-label="重试"
            @action="loadOutbox()"
          />
          <StateBlock
            v-else-if="!outbox.items.length"
            title="暂时没有发出的联系请求"
            description="你从作者主页或帖子作者区发起的请求会在这里显示状态。"
          />
          <template v-else>
            <p v-if="outbox.error" class="notice-error">{{ outbox.error }}</p>
            <article v-for="request in outbox.items" :key="request.requestId" class="request-card outbox-card">
              <div class="request-main">
                <div class="request-title-row">
                  <h2>{{ request.receiverName || request.receiver?.nickname || '未知用户' }}</h2>
                  <span :class="['status-badge', statusClass(request.requestStatus)]">{{ statusLabel(request.requestStatus) }}</span>
                </div>
                <dl class="request-meta">
                  <div>
                    <dt>场景</dt>
                    <dd>{{ sceneLabel(request.scene) }}</dd>
                  </div>
                  <div>
                    <dt>创建时间</dt>
                    <dd>{{ formatTime(request.createdAt) }}</dd>
                  </div>
                </dl>
              </div>
            </article>
            <LoadMoreButton :state="outbox" @load-more="loadOutbox(true)" />
          </template>
        </div>
      </section>

      <div v-if="reportDialog.open" class="modal-backdrop" @click.self="closeReportDialog">
        <form class="report-dialog" @submit.prevent="submitReportDialog">
          <div>
            <p class="panel-kicker">治理反馈</p>
            <h2>选择举报原因</h2>
            <p>举报会进入治理队列，处理后该请求状态会同步更新。</p>
          </div>
          <label class="setting-field">
            <span>原因</span>
            <select v-model="reportDialog.reason" class="form-select" :disabled="Boolean(reportDialog.loading)">
              <option value="CONTACT_REQUEST_ABUSE">骚扰或滥用</option>
              <option value="SPAM">垃圾信息</option>
              <option value="FRAUD">疑似欺诈</option>
              <option value="OTHER">其他</option>
            </select>
          </label>
          <label class="setting-field">
            <span>补充说明</span>
            <textarea
              v-model="reportDialog.detail"
              class="form-textarea"
              maxlength="500"
              rows="4"
              :disabled="Boolean(reportDialog.loading)"
              placeholder="补充上下文，便于管理员判断。"
            />
          </label>
          <p v-if="reportDialog.error" class="notice-error">{{ reportDialog.error }}</p>
          <div class="settings-actions">
            <button type="button" class="secondary-action" :disabled="Boolean(reportDialog.loading)" @click="closeReportDialog">取消</button>
            <button type="submit" class="danger-action" :disabled="Boolean(reportDialog.loading)">
              {{ reportDialog.loading ? '提交中...' : '提交举报' }}
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Inbox, RefreshCw, Send, ShieldCheck } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import { interactionApi } from '@/api/interaction'
import type { ApiId, ContactRequest, ContactRequestSettings, PaginatedResponse } from '@/api/types'

type TabValue = 'inbox' | 'outbox'
type RequestAction = 'accept' | 'reject' | 'ignore' | 'report'

interface ListState {
  items: ContactRequest[]
  cursor?: string
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: string
}

const tabs = [
  { value: 'inbox' as TabValue, label: '收到的', icon: Inbox },
  { value: 'outbox' as TabValue, label: '发出的', icon: Send },
]

const policyOptions = [
  { value: 'all', label: '所有登录用户' },
  { value: 'following', label: '我关注的人' },
  { value: 'mutual', label: '互相关注' },
  { value: 'off', label: '关闭' },
]

const statusLabels: Record<string, string> = {
  PENDING: '待处理',
  ACCEPTED: '已同意',
  REJECTED: '已拒绝',
  IGNORED: '已忽略',
  REPORTED: '已举报',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
}

const sceneLabels: Record<string, string> = {
  ask: '请教问题',
  supplement: '补充资料',
  feedback: '内容反馈',
  collaboration: '合作讨论',
}

const sourceLabels: Record<string, string> = {
  profile: '作者主页',
  post: '帖子',
  comment: '评论',
}

const actionSuccessCopy: Record<RequestAction, string> = {
  accept: '已同意联系请求',
  reject: '已拒绝联系请求',
  ignore: '已忽略联系请求',
  report: '已举报联系请求',
}

const createListState = (): ListState => reactive({
  items: [],
  cursor: undefined,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: '',
})

const defaultSettings = (): ContactRequestSettings => ({
  acceptContactRequest: true,
  contactRequestPolicy: 'following',
  dailyLimit: 0,
})

const activeTab = ref<TabValue>('inbox')
const route = useRoute()
const router = useRouter()
const inbox = createListState()
const outbox = createListState()
const operationById = ref<Record<string, RequestAction>>({})

const settingsLoading = ref(false)
const settingsSaving = ref(false)
const settingsError = ref('')
const settingsForm = reactive(defaultSettings())
const reportDialog = reactive<{
  open: boolean
  request: ContactRequest | null
  reason: string
  detail: string
  loading: boolean
  error: string
}>({
  open: false,
  request: null,
  reason: 'CONTACT_REQUEST_ABUSE',
  detail: '',
  loading: false,
  error: '',
})

const activeList = computed(() => activeTab.value === 'inbox' ? inbox : outbox)
const normalizeTab = (value: unknown): TabValue => value === 'outbox' ? 'outbox' : 'inbox'

const setActiveTab = (tab: TabValue) => {
  activeTab.value = tab
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab } })
  }
}

const normalizeStatus = (status: string) => String(status || 'PENDING').toUpperCase()
const statusLabel = (status: string) => statusLabels[normalizeStatus(status)] || normalizeStatus(status)
const sceneLabel = (scene: string) => sceneLabels[String(scene || '').toLowerCase()] || scene || '未标注'
const sourceLabel = (source: string) => sourceLabels[String(source || '').toLowerCase()] || source || '未知来源'
const isPending = (request: ContactRequest) => normalizeStatus(request.requestStatus) === 'PENDING'
const requestKey = (requestId: ApiId) => String(requestId)

const formatTime = (value: number) => {
  if (!value) return '未知时间'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const statusClass = (status: string) => {
  switch (normalizeStatus(status)) {
    case 'ACCEPTED':
      return 'status-accepted'
    case 'REJECTED':
    case 'REPORTED':
      return 'status-danger'
    case 'IGNORED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'status-muted'
    default:
      return 'status-pending'
  }
}

const mergePage = (state: ListState, page: PaginatedResponse<ContactRequest> | null, append: boolean) => {
  const items = page?.items || []
  state.items = append ? [...state.items, ...items] : items
  state.cursor = page?.nextCursor
  state.hasMore = Boolean(page?.hasMore)
}

const loadInbox = async (append = false) => {
  if (append && (!inbox.hasMore || inbox.loadingMore)) return
  inbox.error = ''
  inbox.loading = !append
  inbox.loadingMore = append
  try {
    const res = await interactionApi.listContactRequestInbox({ cursor: append ? inbox.cursor : undefined, limit: 20 })
    mergePage(inbox, res.data, append)
  } catch (error: any) {
    inbox.error = getErrorMessage(error, '收到的联系请求加载失败')
  } finally {
    inbox.loading = false
    inbox.loadingMore = false
  }
}

const loadOutbox = async (append = false) => {
  if (append && (!outbox.hasMore || outbox.loadingMore)) return
  outbox.error = ''
  outbox.loading = !append
  outbox.loadingMore = append
  try {
    const res = await interactionApi.listContactRequestOutbox({ cursor: append ? outbox.cursor : undefined, limit: 20 })
    mergePage(outbox, res.data, append)
  } catch (error: any) {
    outbox.error = getErrorMessage(error, '发出的联系请求加载失败')
  } finally {
    outbox.loading = false
    outbox.loadingMore = false
  }
}

const reloadActiveList = () => {
  if (activeTab.value === 'inbox') {
    loadInbox()
  } else {
    loadOutbox()
  }
}

const openReportDialog = (request: ContactRequest) => {
  reportDialog.open = true
  reportDialog.request = request
  reportDialog.reason = 'CONTACT_REQUEST_ABUSE'
  reportDialog.detail = request.messagePreview || ''
  reportDialog.error = ''
}

const closeReportDialog = () => {
  if (reportDialog.loading) return
  reportDialog.open = false
  reportDialog.request = null
  reportDialog.error = ''
}

const applySettings = (settings: ContactRequestSettings | null) => {
  const next = settings || defaultSettings()
  settingsForm.acceptContactRequest = next.acceptContactRequest && String(next.contactRequestPolicy).toLowerCase() !== 'off'
  settingsForm.contactRequestPolicy = settingsForm.acceptContactRequest ? next.contactRequestPolicy : 'off'
  settingsForm.dailyLimit = next.dailyLimit
}

const loadSettings = async () => {
  settingsLoading.value = true
  settingsError.value = ''
  try {
    const res = await interactionApi.getContactRequestSettings()
    applySettings(res.data)
  } catch (error: any) {
    settingsError.value = getErrorMessage(error, '联系请求设置加载失败')
  } finally {
    settingsLoading.value = false
  }
}

const syncAcceptPolicy = () => {
  if (!settingsForm.acceptContactRequest) {
    settingsForm.contactRequestPolicy = 'off'
    return
  }
  if (String(settingsForm.contactRequestPolicy).toLowerCase() === 'off') {
    settingsForm.contactRequestPolicy = 'following'
  }
}

const syncPolicyAccept = () => {
  settingsForm.acceptContactRequest = String(settingsForm.contactRequestPolicy).toLowerCase() !== 'off'
}

const saveSettings = async () => {
  settingsSaving.value = true
  settingsError.value = ''
  const contactRequestPolicy = settingsForm.acceptContactRequest ? settingsForm.contactRequestPolicy : 'off'
  try {
    const res = await interactionApi.updateContactRequestSettings({
      acceptContactRequest: settingsForm.acceptContactRequest,
      contactRequestPolicy,
      dailyLimit: settingsForm.dailyLimit,
      contactRequestDailyLimit: settingsForm.dailyLimit,
    })
    applySettings(res.data)
    toast.success('联系请求设置已保存')
  } catch (error: any) {
    settingsError.value = getErrorMessage(error, '联系请求设置保存失败')
  } finally {
    settingsSaving.value = false
  }
}

const updateRequestInState = (state: ListState, updated: ContactRequest) => {
  state.items = state.items.map((item) => (
    String(item.requestId) === String(updated.requestId) ? updated : item
  ))
}

const applyActionResult = (request: ContactRequest, action: RequestAction, updated?: ContactRequest | null) => {
  if (!updated) {
    throw new Error('Contact request action did not return an updated request')
  }
  const next = updated
  updateRequestInState(inbox, next)
  updateRequestInState(outbox, next)
}

const isActionDisabled = (request: ContactRequest) => Boolean(operationById.value[requestKey(request.requestId)]) || !isPending(request)
const actionButtonLabel = (request: ContactRequest, action: RequestAction, label: string) => (
  operationById.value[requestKey(request.requestId)] === action ? '处理中...' : label
)

const handleRequestAction = async (request: ContactRequest, action: RequestAction) => {
  if (isActionDisabled(request)) return
  if (action === 'report') {
    openReportDialog(request)
    return
  }

  operationById.value = { ...operationById.value, [requestKey(request.requestId)]: action }
  try {
    const res = await {
      accept: interactionApi.acceptContactRequest,
      reject: interactionApi.rejectContactRequest,
      ignore: interactionApi.ignoreContactRequest,
    }[action](request.requestId)
    applyActionResult(request, action, res.data)
    toast.success(actionSuccessCopy[action])
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'Contact request action failed'))
  } finally {
    const next = { ...operationById.value }
    delete next[requestKey(request.requestId)]
    operationById.value = next
  }
}

const submitReportDialog = async () => {
  const request = reportDialog.request
  const reason = reportDialog.reason.trim()
  if (!request || !reason || isActionDisabled(request)) return
  reportDialog.loading = true
  reportDialog.error = ''
  operationById.value = { ...operationById.value, [requestKey(request.requestId)]: 'report' }
  try {
    const res = await interactionApi.reportContactRequest(request.requestId, {
      reason,
      detail: reportDialog.detail.trim() || undefined,
    })
    applyActionResult(request, 'report', res.data)
    toast.success(actionSuccessCopy.report)
    reportDialog.open = false
    reportDialog.request = null
    reportDialog.error = ''
  } catch (error: any) {
    reportDialog.error = getErrorMessage(error, 'Contact request report failed')
  } finally {
    const next = { ...operationById.value }
    delete next[requestKey(request.requestId)]
    operationById.value = next
    reportDialog.loading = false
  }
}
const StateBlock = defineComponent({
  props: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
  },
  emits: ['action'],
  setup(props, { emit }) {
    return () => h('div', { class: 'state-block' }, [
      h('h2', props.title),
      props.description ? h('p', props.description) : null,
      props.actionLabel
        ? h('button', { type: 'button', class: 'secondary-action', onClick: () => emit('action') }, props.actionLabel)
        : null,
    ])
  },
})

const LoadMoreButton = defineComponent({
  props: {
    state: { type: Object as () => ListState, required: true },
  },
  emits: ['load-more'],
  setup(props, { emit }) {
    return () => props.state.hasMore
      ? h('div', { class: 'load-more-row' }, [
          h('button', {
            type: 'button',
            class: 'secondary-action',
            disabled: props.state.loadingMore,
            onClick: () => emit('load-more'),
          }, props.state.loadingMore ? '加载中...' : '加载更多'),
        ])
      : null
  },
})

onMounted(() => {
  activeTab.value = normalizeTab(route.query.tab)
  loadInbox()
  loadOutbox()
  loadSettings()
})

watch(() => route.query.tab, (tab) => {
  activeTab.value = normalizeTab(tab)
})
</script>

<style scoped>
.page-heading,
.settings-panel,
.request-panel {
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: white;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
}

.page-heading h1 {
  margin-top: 0.15rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 900;
}

.page-heading p:last-child {
  margin-top: 0.45rem;
  max-width: 42rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
}

.settings-panel {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 0.9fr) minmax(20rem, 1.1fr);
  padding: 1.25rem;
}

.settings-title-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.settings-panel h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.settings-panel p,
.settings-loading {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
}

.settings-form {
  display: grid;
  gap: 1rem;
}

.switch-row,
.setting-field {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.625rem;
  background: var(--surface-soft);
  padding: 0.9rem;
}

.switch-row strong,
.switch-row small,
.setting-field span {
  display: block;
}

.switch-row strong,
.setting-field span {
  color: var(--text-strong);
  font-size: 0.9rem;
  font-weight: 800;
}

.switch-row small {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.switch-input {
  height: 1.25rem;
  width: 1.25rem;
  flex: 0 0 auto;
  accent-color: rgb(26 127 90);
}

.form-select {
  min-height: 2.5rem;
  width: min(100%, 14rem);
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: white;
  padding: 0.5rem 0.75rem;
  color: var(--text-strong);
  font-size: 0.875rem;
  outline: none;
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.tab-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1rem;
}

.tab-button {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 2px solid transparent;
  padding: 0 0.75rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 800;
  white-space: nowrap;
}

.tab-button span {
  border-radius: 999px;
  background: var(--surface-soft);
  padding: 0.1rem 0.45rem;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.tab-active {
  border-color: rgb(26 127 90);
  color: rgb(26 127 90);
}

.request-list {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.request-card {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) auto;
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: var(--surface-soft);
  padding: 1rem;
}

.outbox-card {
  grid-template-columns: 1fr;
}

.request-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.request-title-row h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.request-meta {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.request-meta dt {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.request-meta dd {
  margin-top: 0.2rem;
  color: var(--text-primary);
  font-size: 0.84rem;
  font-weight: 700;
}

.request-message {
  margin-top: 0.85rem;
  border-radius: 0.625rem;
  background: white;
  padding: 0.8rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.6;
}

.request-actions {
  display: flex;
  min-width: 14rem;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-end;
  gap: 0.5rem;
}

.status-badge {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.status-pending {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-accepted {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.status-muted {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.primary-button,
.secondary-button,
.danger-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.85rem;
  font-size: 0.84rem;
  font-weight: 800;
}

.primary-button {
  background: rgb(26 127 90);
  color: white;
}

.secondary-button {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.danger-button {
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.state-block,
.notice-error {
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: white;
  padding: 2rem 1.25rem;
  text-align: center;
}

.state-block h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.state-block p {
  margin: 0.5rem auto 0;
  max-width: 32rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
}

.state-block button {
  margin-top: 1rem;
}

.notice-error {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
  font-size: 0.875rem;
  font-weight: 700;
}

.load-more-row {
  display: flex;
  justify-content: center;
}

.dark .page-heading,
.dark .settings-panel,
.dark .request-panel,
.dark .state-block,
.dark .secondary-button,
.dark .form-select {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .page-heading h1,
.dark .settings-panel h2,
.dark .switch-row strong,
.dark .setting-field span,
.dark .request-title-row h2,
.dark .state-block h2,
.dark .form-select {
  color: var(--text-strong);
}

.dark .page-heading p:last-child,
.dark .settings-panel p,
.dark .settings-loading,
.dark .switch-row small,
.dark .state-block p {
  color: var(--text-muted);
}

.dark .switch-row,
.dark .setting-field,
.dark .request-card {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .tab-bar {
  border-color: var(--border-subtle);
}

.dark .tab-button {
  color: var(--text-muted);
}

.dark .tab-active {
  color: rgb(124 195 165);
}

.dark .tab-button span,
.dark .status-muted {
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .request-meta dt {
  color: var(--text-muted);
}

.dark .request-meta dd,
.dark .request-message,
.dark .secondary-button {
  color: var(--text-muted);
}

.dark .request-message {
  background: var(--surface-1);
}

.dark .danger-button {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

@media (max-width: 760px) {
  .page-heading,
  .settings-panel,
  .request-card {
    grid-template-columns: 1fr;
  }

  .page-heading {
    flex-direction: column;
  }

  .request-actions,
  .request-actions button,
  .settings-actions,
  .settings-actions button {
    width: 100%;
  }

  .request-meta {
    grid-template-columns: 1fr;
  }

  .switch-row,
  .setting-field {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-select {
    width: 100%;
  }
}
</style>

<style scoped>
.contact-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.contact-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
  align-items: start;
  gap: 1.25rem;
  padding-top: 1.5rem;
  padding-bottom: 4rem;
}

.contact-page .page-heading {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin: 0;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  padding: 0 0 1.25rem;
}

.page-kicker,
.panel-kicker {
  margin: 0 0 0.3rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 850;
}

.contact-page .page-heading h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0;
}

.contact-page .page-heading p:last-child {
  max-width: 64ch;
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.control-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.settings-icon {
  width: 1.2rem;
  height: 1.2rem;
  flex: none;
  color: var(--primary-600);
}

.contact-page .request-panel {
  grid-column: 1;
  grid-row: 2;
  min-width: 0;
  overflow: hidden;
  margin: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.contact-page .settings-panel {
  position: sticky;
  top: 5.5rem;
  grid-column: 2;
  grid-row: 2;
  display: block;
  min-width: 0;
  margin: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1rem;
}

.contact-page .settings-title-row {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.contact-page .settings-panel h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 850;
}

.contact-page .settings-panel p,
.contact-page .settings-loading {
  margin: 0.35rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.contact-page .settings-form {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.contact-page .switch-row,
.contact-page .setting-field {
  display: flex;
  min-height: 0;
  align-items: flex-start;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.8rem;
}

.contact-page .switch-row {
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
}

.contact-page .switch-row strong,
.contact-page .setting-field > span {
  color: var(--text-strong);
  font-size: 0.8rem;
  font-weight: 800;
}

.contact-page .switch-row small {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.contact-page .switch-input {
  width: 1.1rem;
  height: 1.1rem;
  flex: none;
  accent-color: var(--primary-600);
}

.contact-page .form-select,
.contact-page .form-textarea {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface);
  padding: 0.55rem 0.7rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  outline: none;
}

.contact-page .form-textarea {
  min-height: 7rem;
  resize: vertical;
  line-height: 1.55;
}

.contact-page .form-select:focus,
.contact-page .form-textarea:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-500) 14%, transparent);
}

.contact-page .settings-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
}

.contact-page .settings-actions > * {
  width: 100%;
}

.contact-page .tab-bar {
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1.1rem;
  scrollbar-width: none;
}

.contact-page .tab-bar::-webkit-scrollbar {
  display: none;
}

.contact-page .tab-button {
  display: inline-flex;
  min-height: 3rem;
  flex: none;
  align-items: center;
  gap: 0.45rem;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  padding: 0 0.1rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 800;
  white-space: nowrap;
}

.contact-page .tab-button span {
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  padding: 0.12rem 0.45rem;
  color: var(--text-muted);
  font-size: 0.68rem;
}

.contact-page .tab-button:hover,
.contact-page .tab-active {
  border-bottom-color: var(--primary-600);
  color: var(--primary-700);
}

.contact-page .request-list {
  display: grid;
  gap: 0;
  padding: 0;
}

.contact-page .request-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 1rem;
  margin: 0;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: var(--surface);
  padding: 1rem 1.1rem;
}

.contact-page .request-card:last-of-type {
  border-bottom: 0;
}

.contact-page .outbox-card {
  grid-template-columns: minmax(0, 1fr);
}

.contact-page .request-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.contact-page .request-title-row h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.contact-page .request-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.contact-page .outbox-card .request-meta {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.contact-page .request-meta dt {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.contact-page .request-meta dd {
  margin: 0.2rem 0 0;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.contact-page .request-message {
  margin: 0.85rem 0 0;
  border-left: 2px solid var(--border-strong);
  border-radius: 0;
  background: transparent;
  padding: 0.1rem 0 0.1rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.contact-page .request-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(5.25rem, 1fr));
  align-content: flex-start;
  gap: 0.5rem;
  min-width: 11rem;
}

.contact-page .primary-action,
.contact-page .secondary-action,
.contact-page .danger-action {
  min-height: 2.75rem;
}

.contact-page .request-actions > * {
  min-width: 0;
  padding-right: 0.75rem;
  padding-left: 0.75rem;
  font-size: 0.78rem;
}

.danger-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border-subtle));
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  padding: 0.5rem 0.85rem;
  color: var(--danger);
  font-size: 0.84rem;
  font-weight: 800;
}

.danger-action:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 13%, var(--surface));
}

.contact-page .primary-action:disabled,
.contact-page .secondary-action:disabled,
.contact-page .danger-action:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.contact-page .status-badge {
  display: inline-flex;
  min-height: 1.5rem;
  flex: none;
  align-items: center;
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 850;
}

.contact-page .status-pending {
  background: color-mix(in srgb, var(--warning) 12%, var(--surface));
  color: var(--warning);
}

.contact-page .status-accepted {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: var(--success);
}

.contact-page .status-danger {
  background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  color: var(--danger);
}

.contact-page .status-muted {
  background: var(--surface-3);
  color: var(--text-muted);
}

.contact-page .state-block {
  display: flex;
  min-height: 15rem;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0;
  border: 0;
  border-radius: 0;
  background: var(--surface);
  padding: 2rem;
  color: var(--text-muted);
  text-align: center;
}

.contact-page .state-block h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 850;
}

.contact-page .state-block p {
  max-width: 34rem;
  margin: 0.4rem auto 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.contact-page .state-block button {
  margin-top: 1rem;
}

.contact-page .notice-error {
  margin: 0;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--danger) 24%, var(--border-subtle));
  border-radius: 0;
  background: color-mix(in srgb, var(--danger) 7%, var(--surface));
  padding: 0.8rem 1.1rem;
  color: var(--danger);
  font-size: 0.78rem;
  font-weight: 700;
  text-align: left;
}

.contact-page .settings-panel .notice-error {
  margin-top: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--danger) 24%, var(--border-subtle));
  border-radius: var(--radius-control);
  padding: 0.7rem;
}

.contact-page .load-more-row {
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--border-subtle);
  padding: 0.85rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(16 24 40 / 0.56);
}

.report-dialog {
  display: grid;
  width: min(100%, 32rem);
  max-height: min(90vh, 44rem);
  overflow-y: auto;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.25rem;
  box-shadow: 0 20px 50px rgb(16 24 40 / 0.2);
}

.report-dialog h2 {
  margin: 0.2rem 0 0;
  color: var(--text-strong);
  font-size: 1.2rem;
  font-weight: 850;
}

.report-dialog > div:first-child > p:last-child {
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.report-dialog .setting-field {
  display: grid;
  gap: 0.45rem;
  border: 0;
  background: transparent;
  padding: 0;
}

.report-dialog .setting-field > span {
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 800;
}

.report-dialog .notice-error {
  border: 1px solid color-mix(in srgb, var(--danger) 24%, var(--border-subtle));
  border-radius: var(--radius-control);
  padding: 0.7rem;
}

.report-dialog .settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

@media (max-width: 900px) {
  .contact-main {
    grid-template-columns: minmax(0, 1fr);
  }

  .contact-page .request-panel,
  .contact-page .settings-panel {
    grid-column: 1;
  }

  .contact-page .settings-panel {
    position: static;
    grid-row: 3;
  }

  .contact-page .settings-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .contact-page .settings-actions {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .contact-main {
    gap: 1rem;
    padding-top: 1rem;
  }

  .contact-page .page-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
  }

  .contact-page .page-heading h1 {
    font-size: 1.5rem;
  }

  .contact-page .page-heading .secondary-action {
    width: 100%;
  }

  .contact-page .tab-bar {
    margin-right: calc(var(--community-page-gutter) * -1);
    margin-left: calc(var(--community-page-gutter) * -1);
    padding-right: var(--community-page-gutter);
    padding-left: var(--community-page-gutter);
  }

  .contact-page .request-card {
    grid-template-columns: minmax(0, 1fr);
    padding: 1rem;
  }

  .contact-page .request-meta,
  .contact-page .outbox-card .request-meta {
    grid-template-columns: minmax(0, 1fr);
  }

  .contact-page .request-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
  }

  .contact-page .settings-form,
  .contact-page .settings-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .contact-page .state-block {
    min-height: 13rem;
    padding: 1.25rem;
  }

  .report-dialog .settings-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .report-dialog .settings-actions > * {
    width: 100%;
  }
}

@media (max-width: 390px) {
  .contact-page .request-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .contact-page *,
  .report-dialog * {
    scroll-behavior: auto;
  }
}
</style>
