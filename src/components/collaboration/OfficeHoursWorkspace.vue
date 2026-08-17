<template>
  <div class="office-workspace">
    <section class="boundary-band" aria-label="经验交流边界">
      <div><CircleDollarSign class="h-4 w-4" /><strong>无付费</strong><span>不收取现金或野点，不允许私下售卖名额。</span></div>
      <div><MessageSquare class="h-4 w-4" /><strong>无聊天</strong><span>平台只记录公开时段、预约主题和状态，不提供私聊。</span></div>
      <div><ShieldOff class="h-4 w-4" /><strong>无担保</strong><span>交流者的观点不代表平台背书、专业资质或结果保证。</span></div>
    </section>

    <div class="office-grid">
      <section class="office-panel">
        <div class="panel-heading">
          <div>
            <h2><CalendarPlus class="h-5 w-5" />创建公开时段</h2>
            <p>开放经验答疑名额，平台会校验社区角色、领域风险和时间范围。</p>
          </div>
        </div>

        <form class="form-stack" @submit.prevent="createOfficeHour">
          <div class="field-grid">
            <label>
              <span>领域</span>
              <select v-model.number="createForm.domain" class="field-control">
                <option :value="0" disabled>请选择频道</option>
                <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                  {{ domain.domainName }}
                </option>
              </select>
            </label>
            <label>
              <span>名额</span>
              <input v-model.number="createForm.capacity" class="field-control" type="number" min="1" max="100">
            </label>
          </div>
          <label>
            <span>时段标题</span>
            <input v-model.trim="createForm.title" class="field-control" maxlength="120" required placeholder="例如：第一次转岗产品经理的准备与踩坑">
          </label>
          <label>
            <span>经验范围</span>
            <textarea v-model.trim="createForm.description" class="field-control" rows="4" maxlength="2000" required placeholder="说明你能分享的亲身经验、适用对象和边界。" />
          </label>
          <label>
            <span>提问指引</span>
            <textarea v-model.trim="createForm.topicGuidance" class="field-control" rows="3" maxlength="1000" placeholder="建议预约者提前提供哪些背景。" />
          </label>
          <div class="field-grid">
            <label>
              <span>开始时间</span>
              <input v-model="createForm.startsAt" class="field-control" type="datetime-local" required>
            </label>
            <label>
              <span>结束时间</span>
              <input v-model="createForm.endsAt" class="field-control" type="datetime-local" required>
            </label>
          </div>
          <label v-if="createForm.domain === 5" class="check-row">
            <input v-model="createForm.riskAcknowledged" type="checkbox">
            <span>我确认只交流个人经历与风险认知，不提供投资建议或收益承诺。</span>
          </label>
          <button type="submit" class="primary-button" :disabled="!canCreate">
            <Loader2 v-if="pendingAction === 'create'" class="h-4 w-4 animate-spin" />
            <CalendarPlus v-else class="h-4 w-4" />
            创建草稿
          </button>
        </form>
      </section>

      <section class="office-panel office-list-panel">
        <div class="panel-heading filter-heading">
          <div>
            <h2><CalendarClock class="h-5 w-5" />公开经验时段</h2>
            <p>预约只提交主题与必要背景，敏感信息请勿写入。</p>
          </div>
          <div class="filters">
            <select v-model.number="filters.domain" class="field-control compact-control" @change="loadOfficeHours">
              <option value="">全部领域</option>
              <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                {{ domain.domainName }}
              </option>
            </select>
            <select v-model="filters.status" class="field-control compact-control" @change="loadOfficeHours">
              <option value="">全部状态</option>
              <option value="OPEN">开放预约</option>
              <option value="DRAFT">草稿</option>
              <option value="CLOSED">已关闭</option>
              <option value="CANCELLED">已取消</option>
            </select>
            <button type="button" class="icon-button" title="刷新公开时段" :disabled="officeState.loading" @click="loadOfficeHours">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': officeState.loading }" />
            </button>
          </div>
        </div>

        <StateBlock
          :loading="officeState.loading"
          :error="officeState.error"
          :empty="officeHours.length === 0"
          empty-title="暂无匹配时段"
          empty-description="可以调整筛选，或创建一个边界清晰的公开交流时段。"
          @retry="loadOfficeHours"
        />

        <div v-if="!officeState.loading && !officeState.error" class="dense-list">
          <article v-for="office in officeHours" :key="String(office.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(office.status)]">{{ statusLabel(office.status) }}</span>
                <span class="meta-chip">{{ domainLabel(office.domain) }}</span>
                <strong>{{ office.title }}</strong>
              </div>
              <p>{{ office.description }}</p>
              <small class="actor-meta">
                <PublicActorIdentity :actor="office.host" role-label="主持人" compact />
                <span aria-hidden="true">·</span>
                <span>{{ formatTime(office.startsAt) }} 至 {{ formatTime(office.endsAt) }}</span>
                <span aria-hidden="true">·</span>
                <span>剩余 {{ office.availableCount }}/{{ office.capacity }}</span>
              </small>
              <p v-if="office.topicGuidance" class="guidance-copy"><strong>提问指引：</strong>{{ office.topicGuidance }}</p>
            </div>
            <div class="row-actions">
              <template v-if="office.canManage">
                <button v-if="office.status === 'DRAFT'" type="button" class="primary-button compact" :disabled="busy" @click="setOfficeStatus(office, 'OPEN')">
                  <Play class="h-4 w-4" />开放
                </button>
                <button v-if="office.status === 'OPEN'" type="button" class="secondary-button compact" :disabled="busy" @click="setOfficeStatus(office, 'CLOSED')">
                  <DoorClosed class="h-4 w-4" />关闭
                </button>
                <button v-if="office.status === 'DRAFT' || office.status === 'OPEN'" type="button" class="danger-button compact" :disabled="busy" @click="setOfficeStatus(office, 'CANCELLED')">
                  <Ban class="h-4 w-4" />取消
                </button>
                <button type="button" class="secondary-button compact" :disabled="busy" @click="selectHostOffice(office)">
                  <Users class="h-4 w-4" />预约管理
                </button>
              </template>
              <button
                v-if="office.status === 'OPEN' && !office.canManage && office.availableCount > 0"
                type="button"
                class="primary-button compact"
                :disabled="busy"
                @click="selectReservationOffice(office)"
              >
                <BookmarkPlus class="h-4 w-4" />预约
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <section v-if="selectedReservationOffice" class="office-panel inline-editor">
      <div class="panel-heading">
        <div>
          <h2><BookmarkPlus class="h-5 w-5" />预约“{{ selectedReservationOffice.title }}”</h2>
          <p>只提交交流主题和必要上下文，不要填写手机号、微信、住址或其他隐私。</p>
        </div>
        <button type="button" class="icon-button" title="关闭预约表单" @click="selectedReservationOffice = null"><X class="h-4 w-4" /></button>
      </div>
      <form class="form-stack" @submit.prevent="reserveOfficeHour">
        <label>
          <span>交流主题</span>
          <input v-model.trim="reservationForm.topic" class="field-control" maxlength="160" required placeholder="用一句话说明希望交流的问题">
        </label>
        <label>
          <span>背景说明</span>
          <textarea v-model.trim="reservationForm.contextDetail" class="field-control" rows="4" maxlength="1500" placeholder="提供有助于理解问题的背景，避免敏感信息。" />
        </label>
        <label v-if="selectedReservationOffice.domain === 5" class="check-row">
          <input v-model="reservationForm.riskAcknowledged" type="checkbox">
          <span>我理解本次交流不构成投资建议，任何决策由我自行判断。</span>
        </label>
        <button type="submit" class="primary-button" :disabled="!canReserve">
          <Loader2 v-if="pendingAction === 'reserve'" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />提交预约
        </button>
      </form>
    </section>

    <div class="office-grid lower-grid">
      <section class="office-panel">
        <div class="panel-heading filter-heading">
          <div><h2><ClipboardList class="h-5 w-5" />我的预约</h2><p>参与者和主持人的相关预约会汇总在这里。</p></div>
          <button type="button" class="icon-button" title="刷新我的预约" :disabled="mineState.loading" @click="loadMyReservations">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': mineState.loading }" />
          </button>
        </div>
        <StateBlock
          :loading="mineState.loading"
          :error="mineState.error"
          :empty="myReservations.length === 0"
          empty-title="暂无预约"
          empty-description="预约公开时段后，状态和双方确认会显示在这里。"
          @retry="loadMyReservations"
        />
        <div v-if="!mineState.loading && !mineState.error" class="dense-list">
          <article v-for="reservation in myReservations" :key="String(reservation.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(reservation.status)]">{{ reservationStatusLabel(reservation.status) }}</span>
                <strong>{{ reservation.topic }}</strong>
              </div>
              <p>{{ reservation.contextDetail || '未补充背景' }}</p>
              <small class="actor-meta">
                <span>时段 #{{ reservation.officeHourId }}</span>
                <span aria-hidden="true">·</span>
                <PublicActorIdentity :actor="reservation.host" role-label="主持人" compact />
                <span aria-hidden="true">·</span>
                <PublicActorIdentity :actor="reservation.attendee" role-label="参与者" compact />
              </small>
              <small v-if="reservation.responseNote">主持人回复：{{ reservation.responseNote }}</small>
            </div>
            <div class="row-actions">
              <button
                v-if="['PENDING', 'ACCEPTED'].includes(reservation.status)"
                type="button"
                class="danger-button compact"
                :disabled="busy"
                @click="cancelReservation(reservation)"
              >
                <XCircle class="h-4 w-4" />取消
              </button>
              <button
                v-if="reservation.status === 'ACCEPTED' && !hasCurrentUserConfirmed(reservation)"
                type="button"
                class="primary-button compact"
                :disabled="busy"
                @click="confirmReservation(reservation)"
              >
                <CheckCheck class="h-4 w-4" />确认已完成
              </button>
              <button
                v-if="reservation.status === 'COMPLETED'"
                type="button"
                class="secondary-button compact"
                :disabled="busy"
                @click="openFeedback(reservation)"
              >
                <Star class="h-4 w-4" />反馈
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="office-panel">
        <div class="panel-heading">
          <div>
            <h2><UserRoundCheck class="h-5 w-5" />主持人预约处理</h2>
            <p>{{ selectedHostOffice ? `当前时段：${selectedHostOffice.title}` : '从公开时段中选择“预约管理”。' }}</p>
          </div>
        </div>
        <StateBlock
          v-if="selectedHostOffice"
          :loading="hostState.loading"
          :error="hostState.error"
          :empty="hostReservations.length === 0"
          empty-title="该时段暂无预约"
          empty-description="收到预约后，可根据主题和名额接受或拒绝。"
          @retry="loadHostReservations"
        />
        <div v-if="selectedHostOffice && !hostState.loading && !hostState.error" class="dense-list">
          <article
            v-for="reservation in hostReservations"
            :key="String(reservation.id)"
            :class="['dense-row', { 'dense-row-focused': String(reservation.id) === String(props.focusReservationId || '') }]"
            :data-reservation-id="String(reservation.id)"
          >
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(reservation.status)]">{{ reservationStatusLabel(reservation.status) }}</span>
                <strong>{{ reservation.topic }}</strong>
              </div>
              <p>{{ reservation.contextDetail || '未补充背景' }}</p>
              <small class="actor-meta">
                <PublicActorIdentity :actor="reservation.attendee" role-label="参与者" compact />
                <span aria-hidden="true">·</span>
                <span>{{ formatTime(reservation.createTime) }}</span>
              </small>
            </div>
            <div class="row-actions">
              <button v-if="reservation.status === 'PENDING'" type="button" class="primary-button compact" :disabled="busy" @click="decideReservation(reservation, 'ACCEPTED')">
                <Check class="h-4 w-4" />接受
              </button>
              <button v-if="reservation.status === 'PENDING'" type="button" class="danger-button compact" :disabled="busy" @click="decideReservation(reservation, 'REJECTED')">
                <X class="h-4 w-4" />拒绝
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <section v-if="feedbackReservation" class="office-panel inline-editor">
      <div class="panel-heading">
        <div><h2><Star class="h-5 w-5" />交流反馈</h2><p>双方分别提交，反馈不折算积分，也不构成公开资质。</p></div>
        <button type="button" class="icon-button" title="关闭反馈" @click="closeFeedback"><X class="h-4 w-4" /></button>
      </div>
      <div v-if="feedbackState.loading" class="loading-line"><Loader2 class="h-4 w-4 animate-spin" />加载既有反馈</div>
      <div v-else-if="feedbackItems.length" class="feedback-list">
        <div v-for="item in feedbackItems" :key="String(item.id)">
          <strong>{{ item.rating }}/5</strong>
          <PublicActorIdentity :actor="item.author" role-label="反馈者" compact />
          <span>{{ item.feedback || '未填写文字反馈' }}</span>
        </div>
      </div>
      <form class="form-stack" @submit.prevent="submitFeedback">
        <label>
          <span>评分</span>
          <select v-model.number="feedbackForm.rating" class="field-control">
            <option v-for="rating in 5" :key="rating" :value="rating">{{ rating }} 分</option>
          </select>
        </label>
        <label>
          <span>反馈（可选）</span>
          <textarea v-model.trim="feedbackForm.feedback" class="field-control" rows="3" maxlength="1000" placeholder="描述交流是否清晰、有边界、对你是否有帮助。" />
        </label>
        <button type="submit" class="primary-button" :disabled="busy"><Send class="h-4 w-4" />提交反馈</button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import {
  Ban,
  BookmarkPlus,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCheck,
  CircleDollarSign,
  ClipboardList,
  DoorClosed,
  Inbox,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  ShieldOff,
  Star,
  UserRoundCheck,
  Users,
  X,
  XCircle,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage, type Result } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import { isKnownDomain } from '@/utils/domains'
import {
  collaborationApi,
  type OfficeHour,
  type OfficeHourFeedback,
  type OfficeHourReservation,
  type OfficeHourReservationDecision,
  type OfficeHourStatus,
  type PageResult,
} from '@/api/collaboration'
import { useAuthStore } from '@/stores/auth'
import PublicActorIdentity from '@/components/user/PublicActorIdentity.vue'

type LoadState = { loading: boolean; error: string; requestId: number }
const state = (): LoadState => reactive({ loading: false, error: '', requestId: 0 })

const StateBlock = defineComponent({
  props: {
    loading: { type: Boolean, required: true },
    error: { type: String, required: true },
    empty: { type: Boolean, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
  },
  emits: ['retry'],
  setup(props, { emit }) {
    return () => {
      if (props.loading) return h('div', { class: 'state-block' }, [h(Loader2, { class: 'h-5 w-5 animate-spin' }), '正在加载'])
      if (props.error) return h('div', { class: 'state-block state-error' }, [
        h('div', [h('strong', '加载失败'), h('p', props.error)]),
        h('button', { type: 'button', class: 'secondary-button compact', onClick: () => emit('retry') }, '重试'),
      ])
      if (props.empty) return h('div', { class: 'state-block' }, [
        h(Inbox, { class: 'h-5 w-5' }),
        h('div', [h('strong', props.emptyTitle), h('p', props.emptyDescription)]),
      ])
      return null
    }
  },
})

const authStore = useAuthStore()
const props = withDefaults(defineProps<{
  focusOfficeHourId?: string
  focusReservationId?: string
}>(), {
  focusOfficeHourId: '',
  focusReservationId: '',
})
const officeState = state()
const mineState = state()
const hostState = state()
const feedbackState = state()
const officeHours = ref<OfficeHour[]>([])
const myReservations = ref<OfficeHourReservation[]>([])
const hostReservations = ref<OfficeHourReservation[]>([])
const feedbackItems = ref<OfficeHourFeedback[]>([])
const selectedReservationOffice = ref<OfficeHour | null>(null)
const selectedHostOffice = ref<OfficeHour | null>(null)
const feedbackReservation = ref<OfficeHourReservation | null>(null)
const pendingAction = ref('')

const filters = reactive<{ domain: number | ''; status: OfficeHourStatus | '' }>({ domain: '', status: 'OPEN' })
const createForm = reactive({
  domain: 0,
  title: '',
  description: '',
  topicGuidance: '',
  startsAt: '',
  endsAt: '',
  capacity: 4,
  riskAcknowledged: false,
})
const reservationForm = reactive({ topic: '', contextDetail: '', riskAcknowledged: false })
const feedbackForm = reactive({ rating: 5, feedback: '' })
const COLLECTION_RETENTION_LIMIT = 300
const COLLECTION_PAGE_SIZE = 50

const collectCollaborationPages = async <T,>(
  request: (cursor: string | number) => Promise<Result<PageResult<T>>>,
  isCurrent: () => boolean = () => true,
): Promise<T[]> => {
  const items: T[] = []
  let cursor: string | number = 0
  for (let page = 0; page < COLLECTION_RETENTION_LIMIT / COLLECTION_PAGE_SIZE; page += 1) {
    if (!isCurrent()) break
    const response = await request(cursor)
    const data = response.data
    if (!data) break
    items.push(...data.items)
    if (!data.hasMore || !data.nextCursor || items.length >= COLLECTION_RETENTION_LIMIT) break
    if (String(data.nextCursor) === String(cursor)) break
    cursor = data.nextCursor
  }
  return items.slice(0, COLLECTION_RETENTION_LIMIT)
}

const busy = computed(() => pendingAction.value !== '')
const canCreate = computed(() => !busy.value
  && isKnownDomain(createForm.domain)
  && createForm.title.length >= 2
  && createForm.description.length >= 10
  && createForm.capacity >= 1
  && Boolean(createForm.startsAt)
  && Boolean(createForm.endsAt)
  && new Date(createForm.endsAt).getTime() > new Date(createForm.startsAt).getTime()
  && (createForm.domain !== 5 || createForm.riskAcknowledged))
const canReserve = computed(() => !busy.value
  && Boolean(selectedReservationOffice.value)
  && reservationForm.topic.length >= 2
  && (selectedReservationOffice.value?.domain !== 5 || reservationForm.riskAcknowledged))

const runLoad = async (
  target: LoadState,
  task: (isCurrent: () => boolean) => Promise<void>,
  fallback: string,
) => {
  const requestId = ++target.requestId
  const isCurrent = () => target.requestId === requestId
  target.loading = true
  target.error = ''
  try {
    await task(isCurrent)
  } catch (error) {
    if (isCurrent()) target.error = getErrorMessage(error, fallback)
  } finally {
    if (isCurrent()) target.loading = false
  }
}

const runAction = async (key: string, task: () => Promise<void>, success: string) => {
  if (busy.value) return
  pendingAction.value = key
  try {
    await task()
    toast.success(success)
  } catch (error) {
    toast.error(getErrorMessage(error, '经验交流操作失败'))
  } finally {
    pendingAction.value = ''
  }
}

const loadOfficeHours = () => runLoad(officeState, async (isCurrent) => {
  const items = await collectCollaborationPages((cursor) => collaborationApi.officeHours.list({
    domain: filters.domain || undefined,
    status: filters.status || undefined,
    cursor,
    size: COLLECTION_PAGE_SIZE,
  }), isCurrent)
  if (isCurrent()) officeHours.value = items
}, '公开时段加载失败')

const loadMyReservations = () => {
  if (!authStore.isLoggedIn) {
    myReservations.value = []
    return Promise.resolve()
  }
  return runLoad(mineState, async (isCurrent) => {
    const items = await collectCollaborationPages((cursor) =>
      collaborationApi.officeHours.reservations.mine({ cursor, size: COLLECTION_PAGE_SIZE }), isCurrent)
    if (isCurrent()) myReservations.value = items
  }, '我的预约加载失败')
}

const createOfficeHour = () => runAction('create', async () => {
  if (!isKnownDomain(createForm.domain)) {
    throw new Error('请选择频道')
  }
  await collaborationApi.officeHours.create({
    domain: createForm.domain,
    title: createForm.title,
    description: createForm.description,
    topicGuidance: createForm.topicGuidance || undefined,
    startsAt: createForm.startsAt,
    endsAt: createForm.endsAt,
    capacity: createForm.capacity,
    riskAcknowledged: createForm.riskAcknowledged,
  })
  Object.assign(createForm, {
    domain: 0,
    title: '',
    description: '',
    topicGuidance: '',
    startsAt: '',
    endsAt: '',
    capacity: 4,
    riskAcknowledged: false,
  })
  filters.status = ''
  await loadOfficeHours()
}, '公开时段草稿已创建')

const setOfficeStatus = (office: OfficeHour, status: 'OPEN' | 'CLOSED' | 'CANCELLED') =>
  runAction(`office:${office.id}:${status}`, async () => {
    const note = status === 'OPEN' ? '主持人确认开放预约' : status === 'CLOSED' ? '主持人结束预约' : '主持人取消时段'
    await collaborationApi.officeHours.updateStatus(office.id, { status, note })
    await Promise.all([loadOfficeHours(), loadMyReservations()])
  }, status === 'OPEN' ? '时段已开放' : status === 'CLOSED' ? '时段已关闭' : '时段已取消')

const selectReservationOffice = (office: OfficeHour) => {
  selectedReservationOffice.value = office
  Object.assign(reservationForm, { topic: '', contextDetail: '', riskAcknowledged: false })
}

const reserveOfficeHour = () => runAction('reserve', async () => {
  const office = selectedReservationOffice.value
  if (!office) return
  await collaborationApi.officeHours.reservations.create(office.id, {
    topic: reservationForm.topic,
    contextDetail: reservationForm.contextDetail || undefined,
    riskAcknowledged: reservationForm.riskAcknowledged,
  })
  selectedReservationOffice.value = null
  await Promise.all([loadOfficeHours(), loadMyReservations()])
}, '预约已提交，等待主持人处理')

const selectHostOffice = async (office: OfficeHour) => {
  selectedHostOffice.value = office
  await loadHostReservations()
}

const focusHostReservation = async () => {
  const officeHourId = String(props.focusOfficeHourId || '').trim()
  if (!officeHourId || !authStore.isLoggedIn) return

  let office = officeHours.value.find((item) => String(item.id) === officeHourId) || null
  if (!office) {
    try {
      const response = await collaborationApi.officeHours.detail(officeHourId)
      office = response.data || null
    } catch {
      return
    }
  }
  if (!office?.canManage) return
  selectedHostOffice.value = office
  await loadHostReservations()
}

const loadHostReservations = () => {
  const office = selectedHostOffice.value
  if (!office) return Promise.resolve()
  return runLoad(hostState, async (isCurrent) => {
    const items = await collectCollaborationPages((cursor) =>
      collaborationApi.officeHours.reservations.list(office.id, {
        cursor, size: COLLECTION_PAGE_SIZE,
      }), isCurrent)
    if (isCurrent() && selectedHostOffice.value?.id === office.id) {
      hostReservations.value = items
    }
  }, '主持人预约队列加载失败')
}

const decideReservation = (reservation: OfficeHourReservation, decision: OfficeHourReservationDecision) =>
  runAction(`decision:${reservation.id}`, async () => {
    await collaborationApi.officeHours.reservations.decide(reservation.officeHourId, reservation.id, {
      decision,
      note: decision === 'ACCEPTED' ? '主题与时段匹配' : '当前主题或名额不匹配',
    })
    await Promise.all([loadHostReservations(), loadMyReservations(), loadOfficeHours()])
  }, decision === 'ACCEPTED' ? '预约已接受' : '预约已拒绝')

const cancelReservation = (reservation: OfficeHourReservation) =>
  runAction(`cancel:${reservation.id}`, async () => {
    await collaborationApi.officeHours.reservations.cancel(reservation.officeHourId, reservation.id)
    await Promise.all([loadMyReservations(), loadHostReservations(), loadOfficeHours()])
  }, '预约已取消')

const confirmReservation = (reservation: OfficeHourReservation) =>
  runAction(`complete:${reservation.id}`, async () => {
    await collaborationApi.officeHours.reservations.confirmComplete(reservation.officeHourId, reservation.id)
    await Promise.all([loadMyReservations(), loadHostReservations()])
  }, '完成确认已记录；双方确认后预约完成')

const openFeedback = async (reservation: OfficeHourReservation) => {
  feedbackReservation.value = reservation
  feedbackForm.rating = 5
  feedbackForm.feedback = ''
  await runLoad(feedbackState, async (isCurrent) => {
    const response = await collaborationApi.officeHours.reservations.feedback.list(
      reservation.officeHourId,
      reservation.id,
    )
    if (isCurrent() && feedbackReservation.value?.id === reservation.id) {
      feedbackItems.value = response.data || []
    }
  }, '反馈加载失败')
}

const closeFeedback = () => {
  feedbackState.requestId += 1
  feedbackReservation.value = null
  feedbackItems.value = []
}

const submitFeedback = () => runAction('feedback', async () => {
  const reservation = feedbackReservation.value
  if (!reservation) return
  await collaborationApi.officeHours.reservations.feedback.create(
    reservation.officeHourId,
    reservation.id,
    { rating: feedbackForm.rating, feedback: feedbackForm.feedback || undefined },
  )
  await openFeedback(reservation)
}, '反馈已提交')

const hasCurrentUserConfirmed = (reservation: OfficeHourReservation) =>
  reservation.viewerRole === 'HOST'
    ? Boolean(reservation.hostConfirmedAt)
    : Boolean(reservation.attendeeConfirmedAt)

const domainLabel = (domain: number) => localDomainConfigs.find((item) => item.domain === domain)?.domainName || `领域 ${domain}`
const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
const statusLabel = (value: string) => ({
  DRAFT: '草稿',
  OPEN: '开放',
  CLOSED: '关闭',
  CANCELLED: '取消',
}[value] || value)
const reservationStatusLabel = (value: string) => ({
  PENDING: '待处理',
  ACCEPTED: '已接受',
  REJECTED: '已拒绝',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
}[value] || value)
const statusClass = (value: string) => {
  if (['OPEN', 'ACCEPTED', 'COMPLETED'].includes(value)) return 'status-ok'
  if (['CANCELLED', 'REJECTED', 'EXPIRED'].includes(value)) return 'status-danger'
  if (['DRAFT', 'PENDING'].includes(value)) return 'status-warn'
  return 'status-muted'
}

watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      void loadMyReservations()
      return
    }
    mineState.requestId += 1
    mineState.loading = false
    mineState.error = ''
    hostState.requestId += 1
    hostState.loading = false
    hostState.error = ''
    feedbackState.requestId += 1
    feedbackState.loading = false
    feedbackState.error = ''
    myReservations.value = []
    hostReservations.value = []
    selectedReservationOffice.value = null
    selectedHostOffice.value = null
    feedbackReservation.value = null
    feedbackItems.value = []
  },
)

onMounted(() => {
  void (async () => {
    await Promise.all([loadOfficeHours(), loadMyReservations()])
    await focusHostReservation()
  })()
})

watch(
  () => [props.focusOfficeHourId, props.focusReservationId, authStore.isLoggedIn],
  () => {
    if (props.focusOfficeHourId && authStore.isLoggedIn) void focusHostReservation()
  },
)
</script>

<style scoped>
.office-workspace,
.form-stack,
.dense-list {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.boundary-band {
  display: grid;
  gap: 0.7rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.boundary-band > div {
  display: grid;
  min-width: 0;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: start;
  gap: 0.5rem;
  color: rgb(71 85 105);
  font-size: 0.78rem;
  line-height: 1.5;
}

.boundary-band svg,
.panel-heading svg {
  color: rgb(14 116 144);
}

.boundary-band strong {
  color: rgb(15 23 42);
}

.office-grid {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.office-panel {
  min-width: 0;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.panel-heading,
.filters,
.row-title,
.row-actions,
.loading-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.panel-heading {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.panel-heading h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.panel-heading p {
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  line-height: 1.5;
}

.form-stack label {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
  color: rgb(51 65 85);
  font-size: 0.76rem;
  font-weight: 800;
}

.field-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.58rem 0.65rem;
  color: rgb(15 23 42);
  font-size: 0.8rem;
  line-height: 1.45;
  outline: none;
}

.field-control:focus {
  border-color: rgb(8 145 178);
  box-shadow: 0 0 0 3px rgb(165 243 252 / 0.65);
}

.compact-control {
  width: auto;
  min-width: 8.5rem;
}

.check-row {
  display: flex !important;
  align-items: flex-start;
  gap: 0.5rem !important;
  border: 1px solid rgb(253 230 138);
  border-radius: 0.5rem;
  background: rgb(255 251 235);
  padding: 0.7rem;
  color: rgb(120 53 15) !important;
}

.check-row input {
  margin-top: 0.15rem;
  accent-color: rgb(8 145 178);
}

.dense-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.85rem;
}

.dense-row-focused {
  border-radius: 0.5rem;
  background: rgb(240 249 255);
  box-shadow: inset 0 0 0 1px rgb(14 165 233 / 0.35);
  padding: 0.85rem;
}

.dense-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.row-main {
  min-width: 0;
  flex: 1;
}

.row-title {
  flex-wrap: wrap;
}

.row-title strong {
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.88rem;
  font-weight: 900;
}

.row-main p {
  margin-top: 0.4rem;
  max-width: 72ch;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.78rem;
  line-height: 1.5;
}

.row-main small {
  display: block;
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  color: rgb(100 116 139);
  font-size: 0.7rem;
  line-height: 1.45;
}

.row-main small.actor-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.guidance-copy {
  color: rgb(51 65 85) !important;
}

.row-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-pill,
.meta-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 900;
}

.meta-chip,
.status-muted {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.primary-button,
.secondary-button,
.danger-button,
.icon-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 900;
}

.primary-button {
  border: 1px solid rgb(14 116 144);
  background: rgb(14 116 144);
  color: white;
}

.secondary-button,
.icon-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
}

.danger-button {
  border: 1px solid rgb(220 38 38);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.compact {
  min-height: 34px;
  padding: 0.35rem 0.55rem;
}

.icon-button {
  height: 40px;
  width: 40px;
  flex: 0 0 auto;
  padding: 0;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.state-block {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.65rem;
  border: 1px dashed rgb(203 213 225);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.8rem;
  color: rgb(71 85 105);
  font-size: 0.78rem;
}

.state-block strong {
  color: rgb(30 41 59);
  font-weight: 900;
}

.state-block p {
  margin-top: 0.2rem;
  line-height: 1.45;
}

.state-error {
  justify-content: space-between;
  border-style: solid;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.feedback-list {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.feedback-list > div {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.55rem;
}

.feedback-list span {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.feedback-list > div {
  display: flex;
  min-width: 0;
  gap: 0.6rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.55rem;
  color: rgb(71 85 105);
  font-size: 0.78rem;
}

.feedback-list > div > * {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (min-width: 980px) {
  .office-grid {
    grid-template-columns: minmax(18rem, 0.72fr) minmax(0, 1.28fr);
  }

  .lower-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .filter-heading,
  .dense-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filters,
  .row-actions {
    justify-content: flex-start;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .compact-control {
    width: 100%;
  }
}

.dark .boundary-band,
.dark .office-panel,
.dark .field-control,
.dark .secondary-button,
.dark .icon-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .boundary-band strong,
.dark .panel-heading h2,
.dark .row-title strong,
.dark .state-block strong {
  color: rgb(248 250 252);
}

.dark .boundary-band > div,
.dark .panel-heading p,
.dark .row-main p,
.dark .form-stack label {
  color: rgb(148 163 184);
}

.dark .dense-row,
.dark .feedback-list > div {
  border-color: rgb(51 65 85);
}

.dark .state-block {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.65);
  color: rgb(148 163 184);
}
</style>
