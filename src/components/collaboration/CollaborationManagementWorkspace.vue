<template>
  <div class="management-workspace">
    <section class="access-note">
      <ShieldCheck class="h-5 w-5" />
      <div>
        <strong>低风险社区能力</strong>
        <p>创建合集、活动和讨论会由服务端实时校验有效社区角色、领域范围、到期状态与风险冻结；社区角色不替代审核员权限。</p>
      </div>
      <button type="button" class="secondary-button" :disabled="loadingAny" @click="refreshAll">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingAny }" />刷新
      </button>
    </section>

    <nav class="manage-tabs" aria-label="共建管理分区">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" class="h-4 w-4" />{{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'needs'" class="manage-layout">
      <div class="manage-panel" data-need-acceptance-queue>
        <div class="panel-heading"><div><h2><FileCheck2 class="h-5 w-5" />待验收产出</h2><p>创建者或版主验收认领者提交的公开产出，确认后才会完成需求并结算贡献。</p></div></div>
        <div v-if="submittedNeeds.length" class="dense-list">
          <div v-for="need in submittedNeeds" :key="String(need.id)" class="dense-row review-row">
            <div>
              <strong>{{ need.title }}</strong>
              <p>
                认领者 UID {{ need.submittedByUid || need.claimedByUid || '未知' }}
                · {{ submissionTargetLabel(need) }}
              </p>
              <p v-if="need.submissionNote">{{ need.submissionNote }}</p>
              <small v-if="need.submittedAt">提交于 {{ formatDate(need.submittedAt) }}</small>
              <RouterLink
                :to="`/collaboration/needs/${need.id}`"
                class="submission-link"
              >
                查看需求详情
              </RouterLink>
              <RouterLink
                v-if="submissionPath(need)"
                :to="submissionPath(need)!"
                class="submission-link"
              >
                查看待验收产出
              </RouterLink>
            </div>
            <div class="review-actions">
              <button
                type="button"
                class="primary-button compact"
                :disabled="busy"
                @click="acceptNeed(need.id)"
              >
                <Check class="h-4 w-4" />
                验收通过
              </button>
              <div class="reject-control">
                <input
                  v-model.trim="rejectReasons[String(need.id)]"
                  class="field-control"
                  maxlength="500"
                  placeholder="填写退回理由"
                  aria-label="退回理由"
                >
                <button
                  type="button"
                  class="danger-button compact"
                  :disabled="busy || !rejectReasons[String(need.id)]?.trim()"
                  @click="rejectNeed(need.id)"
                >
                  <X class="h-4 w-4" />
                  退回修改
                </button>
              </div>
            </div>
          </div>
        </div>
        <EmptyHint v-else title="暂无待验收产出" description="认领者提交产出后会出现在这里。" />
        <div class="section-divider" />
        <div class="subsection-heading">
          <strong>直接完成需求</strong>
          <span>保留原有负责人直接履约路径，仅适用于待认领或交付中的需求。</span>
        </div>
        <form class="form-stack" @submit.prevent="fulfillNeed">
          <label><span>需求</span><select v-model="needForm.needId" class="field-control" required>
            <option value="">选择可管理需求</option>
            <option v-for="need in directlyFulfillableNeeds" :key="String(need.id)" :value="String(need.id)">{{ need.title }} · {{ need.status }}</option>
          </select></label>
          <div class="field-grid">
            <label><span>交付类型</span><select v-model="needForm.resolutionType" class="field-control">
              <option value="POST">帖子</option>
              <option value="QUESTION">问题</option>
              <option value="SERIES">合集</option>
            </select></label>
            <label><span>交付对象 ID</span><input v-model.trim="needForm.resolutionId" class="field-control" inputmode="numeric" required></label>
          </div>
          <label><span>交付说明</span><textarea v-model.trim="needForm.note" class="field-control" rows="3" maxlength="500" /></label>
          <button type="submit" class="primary-button" :disabled="!canFulfillNeed"><FileCheck2 class="h-4 w-4" />确认完成</button>
        </form>
      </div>
      <div class="manage-panel action-panel">
        <div class="panel-heading"><div><h2><GitMerge class="h-5 w-5" />合并或关闭</h2><p>合并指向已有需求；关闭必须留下可解释原因。</p></div></div>
        <form class="form-stack" @submit.prevent="mergeNeed">
          <label><span>源需求</span><select v-model="needMergeForm.needId" class="field-control" required>
            <option value="">选择待合并需求</option>
            <option v-for="need in manageableNeeds.filter((item) => item.status === 'OPEN')" :key="String(need.id)" :value="String(need.id)">{{ need.title }}</option>
          </select></label>
          <label><span>目标需求 ID</span><input v-model.trim="needMergeForm.targetNeedId" class="field-control" inputmode="numeric" required></label>
          <label><span>合并说明</span><input v-model.trim="needMergeForm.note" class="field-control" maxlength="500"></label>
          <button type="submit" class="secondary-button" :disabled="!canMergeNeed"><GitMerge class="h-4 w-4" />合并需求</button>
        </form>
        <div class="section-divider" />
        <form class="form-stack" @submit.prevent="closeNeed">
          <label><span>待关闭需求</span><select v-model="needCloseForm.needId" class="field-control" required>
            <option value="">选择需求</option>
            <option v-for="need in closableNeeds" :key="String(need.id)" :value="String(need.id)">{{ need.title }} · {{ need.status }}</option>
          </select></label>
          <label><span>关闭原因</span><textarea v-model.trim="needCloseForm.note" class="field-control" rows="3" maxlength="500" required /></label>
          <button type="submit" class="danger-button" :disabled="!canCloseNeed"><Archive class="h-4 w-4" />关闭需求</button>
        </form>
      </div>
    </section>

    <section v-else-if="activeTab === 'series'" class="manage-layout">
      <div class="manage-panel">
        <div class="panel-heading"><div><h2><Layers3 class="h-5 w-5" />创建协作合集</h2><p>有效共建角色可在授权领域发起；所有成员与审核动作保留记录。</p></div></div>
        <form class="form-stack" @submit.prevent="createSeries">
          <label><span>领域</span><select v-model.number="seriesCreate.domain" class="field-control">
            <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">{{ domain.domainName }}</option>
          </select></label>
          <label><span>标题</span><input v-model.trim="seriesCreate.title" class="field-control" maxlength="120" required></label>
          <label><span>说明</span><textarea v-model.trim="seriesCreate.description" class="field-control" rows="4" maxlength="2000" required /></label>
          <label><span>投稿要求</span><textarea v-model.trim="seriesCreate.submissionInstructions" class="field-control" rows="3" maxlength="1000" /></label>
          <label v-if="seriesCreate.domain === 5" class="check-row"><input v-model="seriesCreate.riskAcknowledged" type="checkbox"><span>确认仅组织风险认知与经验内容，不构成投资建议。</span></label>
          <button type="submit" class="primary-button" :disabled="!canCreateSeries"><Plus class="h-4 w-4" />创建合集</button>
        </form>
      </div>
      <div class="manage-panel">
        <div class="panel-heading"><div><h2><Users class="h-5 w-5" />成员与投稿审核</h2><p>选择一个可管理合集后处理成员和待审投稿。</p></div></div>
        <label class="field-label"><span>当前合集</span><select v-model="selectedSeriesId" class="field-control" @change="loadSeriesWorkspace">
          <option value="">选择可管理合集</option>
          <option v-for="series in manageableSeries" :key="String(series.id)" :value="String(series.id)">{{ series.title }} · {{ series.status }}</option>
        </select></label>
        <template v-if="selectedSeries">
          <form class="inline-form" @submit.prevent="addSeriesMember">
            <input v-model.trim="seriesMemberForm.uid" class="field-control" inputmode="numeric" placeholder="成员 UID" required>
            <select v-model="seriesMemberForm.role" class="field-control">
              <option value="EDITOR">编辑</option><option value="CONTRIBUTOR">贡献者</option>
            </select>
            <button type="submit" class="secondary-button" :disabled="!isPositiveId(seriesMemberForm.uid) || busy"><UserPlus class="h-4 w-4" />添加</button>
          </form>
          <div class="dense-list compact-list">
            <div v-for="member in seriesMembers" :key="String(member.id)" class="dense-row">
              <div><strong>UID {{ member.uid }}</strong><small>{{ member.role }} · {{ member.status }}</small></div>
              <button v-if="member.role !== 'OWNER' && member.status === 'ACTIVE'" type="button" class="danger-button compact" :disabled="busy" @click="removeSeriesMember(member.uid)"><UserMinus class="h-4 w-4" />移除</button>
            </div>
          </div>
          <div class="section-divider" />
          <div class="dense-list">
            <div v-for="submission in seriesSubmissions" :key="String(submission.id)" class="dense-row">
              <div><strong>帖子 #{{ submission.postId }}</strong><p>{{ submission.note || '无投稿说明' }}</p><small>投稿人 {{ submission.submitterUid }} · {{ submission.reviewStatus }}</small></div>
              <div v-if="submission.reviewStatus === 'PENDING'" class="row-actions">
                <button type="button" class="primary-button compact" :disabled="busy" @click="reviewSeriesSubmission(submission.id, 'APPROVED')"><Check class="h-4 w-4" />通过</button>
                <button type="button" class="danger-button compact" :disabled="busy" @click="reviewSeriesSubmission(submission.id, 'REJECTED')"><X class="h-4 w-4" />拒绝</button>
              </div>
            </div>
          </div>
          <button v-if="selectedSeries.status === 'OPEN'" type="button" class="danger-button top-gap" :disabled="busy" @click="closeSeries"><Archive class="h-4 w-4" />关闭合集</button>
        </template>
        <EmptyHint v-else title="尚未选择合集" description="创建或选择一个当前账号可管理的合集。" />
      </div>
    </section>

    <section v-else-if="activeTab === 'activities'" class="manage-layout">
      <div class="manage-panel">
        <div class="panel-heading"><div><h2><CalendarPlus class="h-5 w-5" />创建共创活动</h2><p>角色只解锁低风险组织能力，投稿仍需逐条审核。</p></div></div>
        <form class="form-stack" @submit.prevent="createActivity">
          <div class="field-grid">
            <label><span>领域</span><select v-model.number="activityCreate.domain" class="field-control"><option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">{{ domain.domainName }}</option></select></label>
            <label><span>类型</span><select v-model="activityCreate.activityType" class="field-control">
              <option value="OPEN_CALL">公开征集</option><option value="SPRINT">共创冲刺</option><option value="CHALLENGE">主题挑战</option><option value="RESEARCH">共同研究</option><option value="CURATION">策展活动</option>
            </select></label>
          </div>
          <label><span>标题</span><input v-model.trim="activityCreate.title" class="field-control" maxlength="120" required></label>
          <label><span>说明</span><textarea v-model.trim="activityCreate.description" class="field-control" rows="4" maxlength="2000" required /></label>
          <label><span>投稿规则</span><textarea v-model.trim="activityCreate.submissionRule" class="field-control" rows="3" maxlength="1000" /></label>
          <div class="field-grid"><label><span>开始</span><input v-model="activityCreate.startsAt" class="field-control" type="datetime-local"></label><label><span>结束</span><input v-model="activityCreate.endsAt" class="field-control" type="datetime-local"></label></div>
          <label v-if="activityCreate.domain === 5" class="check-row"><input v-model="activityCreate.riskAcknowledged" type="checkbox"><span>确认不征集荐股、收益承诺或代客决策内容。</span></label>
          <button type="submit" class="primary-button" :disabled="!canCreateActivity"><Plus class="h-4 w-4" />创建活动草稿</button>
        </form>
      </div>
      <div class="manage-panel">
        <div class="panel-heading"><div><h2><ClipboardCheck class="h-5 w-5" />活动执行</h2><p>变更状态、审核投稿，并在无待审投稿后发布总结。</p></div></div>
        <label class="field-label"><span>当前活动</span><select v-model="selectedActivityId" class="field-control" @change="loadActivityWorkspace">
          <option value="">选择可管理活动</option><option v-for="activity in manageableActivities" :key="String(activity.id)" :value="String(activity.id)">{{ activity.title }} · {{ activity.status }}</option>
        </select></label>
        <template v-if="selectedActivity">
          <div class="row-actions action-strip">
            <button v-if="selectedActivity.status === 'DRAFT'" type="button" class="primary-button compact" :disabled="busy" @click="updateActivityStatus('OPEN')"><Play class="h-4 w-4" />开放</button>
            <button v-if="selectedActivity.status === 'OPEN'" type="button" class="secondary-button compact" :disabled="busy" @click="updateActivityStatus('REVIEWING')"><ClipboardCheck class="h-4 w-4" />进入评审</button>
            <button v-if="['OPEN', 'REVIEWING'].includes(selectedActivity.status)" type="button" class="danger-button compact" :disabled="busy" @click="updateActivityStatus('ARCHIVED')"><Archive class="h-4 w-4" />归档</button>
          </div>
          <div class="dense-list">
            <div v-for="submission in activitySubmissions" :key="String(submission.id)" class="dense-row">
              <div><strong>帖子 #{{ submission.postId }}</strong><p>{{ submission.note || '无投稿说明' }}</p><small>投稿人 {{ submission.submitterUid }} · {{ submission.reviewStatus }}</small></div>
              <div v-if="submission.reviewStatus === 'PENDING'" class="row-actions">
                <button type="button" class="primary-button compact" :disabled="busy" @click="reviewActivitySubmission(submission.id, 'APPROVED')"><Check class="h-4 w-4" />通过</button>
                <button type="button" class="danger-button compact" :disabled="busy" @click="reviewActivitySubmission(submission.id, 'REJECTED')"><X class="h-4 w-4" />拒绝</button>
              </div>
            </div>
          </div>
          <form class="form-stack top-gap" @submit.prevent="summarizeActivity">
            <label><span>活动总结</span><textarea v-model.trim="activitySummary" class="field-control" rows="5" maxlength="4000" required placeholder="总结产出、共识、分歧和后续安排。" /></label>
            <button type="submit" class="primary-button" :disabled="activitySummary.length < 10 || busy"><FileText class="h-4 w-4" />发布总结</button>
          </form>
        </template>
        <EmptyHint v-else title="尚未选择活动" description="创建或选择一个当前账号可管理的活动。" />
      </div>
    </section>

    <section v-else class="manage-layout">
      <div class="manage-panel">
        <div class="panel-heading"><div><h2><MessagesSquare class="h-5 w-5" />创建结构化讨论</h2><p>讨论绑定公开帖子，以有限选项收集观点，再由作者或治理人员总结。</p></div></div>
        <form class="form-stack" @submit.prevent="createDiscussion">
          <label><span>来源帖子 ID</span><input v-model.trim="discussionCreate.sourcePostId" class="field-control" inputmode="numeric" required></label>
          <label><span>标题</span><input v-model.trim="discussionCreate.title" class="field-control" maxlength="120" required></label>
          <label><span>讨论提示</span><textarea v-model.trim="discussionCreate.prompt" class="field-control" rows="4" maxlength="2000" required /></label>
          <label><span>选项（每行一个，2-10 项）</span><textarea v-model="discussionCreate.optionsText" class="field-control" rows="6" maxlength="3000" required /></label>
          <label class="check-row"><input v-model="discussionCreate.riskAcknowledged" type="checkbox"><span>若来源属于高风险领域，我已阅读对应提示并保持问题中立。</span></label>
          <button type="submit" class="primary-button" :disabled="!canCreateDiscussion"><Plus class="h-4 w-4" />创建讨论</button>
        </form>
      </div>
      <div class="manage-panel">
        <div class="panel-heading"><div><h2><FileText class="h-5 w-5" />讨论总结</h2><p>只有可管理讨论会出现在此处。</p></div></div>
        <label class="field-label"><span>当前讨论</span><select v-model="selectedDiscussionId" class="field-control">
          <option value="">选择可管理讨论</option><option v-for="discussion in manageableDiscussions" :key="String(discussion.id)" :value="String(discussion.id)">{{ discussion.title }} · {{ discussion.status }}</option>
        </select></label>
        <form v-if="selectedDiscussion" class="form-stack top-gap" @submit.prevent="summarizeDiscussion">
          <label><span>总结</span><textarea v-model.trim="discussionSummary.summary" class="field-control" rows="5" maxlength="4000" required /></label>
          <label><span>共识状态</span><select v-model="discussionSummary.consensusState" class="field-control"><option value="REACHED">形成共识</option><option value="PARTIAL">部分共识</option><option value="NOT_REACHED">未形成共识</option></select></label>
          <label><span>作者后续回应</span><textarea v-model.trim="discussionSummary.authorFollowUp" class="field-control" rows="3" maxlength="2000" /></label>
          <label class="check-row"><input v-model="discussionSummary.closeAfterSummary" type="checkbox"><span>总结后关闭投票</span></label>
          <button type="submit" class="primary-button" :disabled="discussionSummary.summary.length < 10 || busy"><FileText class="h-4 w-4" />发布总结</button>
        </form>
        <EmptyHint v-else title="尚未选择讨论" description="创建或选择一个当前账号可管理的结构化讨论。" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import {
  Archive,
  CalendarPlus,
  Check,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitMerge,
  Layers3,
  MessagesSquare,
  Plus,
  Play,
  RefreshCw,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage, type Result } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import {
  collaborationApi,
  type CollaborationActivity,
  type CollaborationActivityType,
  type CollaborationNeed,
  type CollaborationSeries,
  type CollaborationSubmission,
  type NeedResolutionType,
  type PageResult,
  type ReviewDecision,
  type SeriesMember,
  type SeriesMemberRole,
  type StructuredDiscussion,
} from '@/api/collaboration'
import type { ApiId } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

const EmptyHint = defineComponent({
  props: { title: { type: String, required: true }, description: { type: String, required: true } },
  setup: (props) => () => h('div', { class: 'empty-hint' }, [h('strong', props.title), h('p', props.description)]),
})

const tabs = [
  { key: 'needs', label: '需求验收', icon: FileCheck2 },
  { key: 'series', label: '合集管理', icon: Layers3 },
  { key: 'activities', label: '活动管理', icon: CalendarPlus },
  { key: 'discussions', label: '讨论管理', icon: MessagesSquare },
] as const
const authStore = useAuthStore()
const activeTab = ref<(typeof tabs)[number]['key']>('needs')
const pendingAction = ref('')
type LoadKey = 'needs' | 'series' | 'activities' | 'discussions' | 'workspace'
const loading = reactive<Record<LoadKey, boolean>>({
  needs: false,
  series: false,
  activities: false,
  discussions: false,
  workspace: false,
})
const loadRequestIds = reactive<Record<LoadKey, number>>({
  needs: 0,
  series: 0,
  activities: 0,
  discussions: 0,
  workspace: 0,
})
const busy = computed(() => pendingAction.value !== '')
const loadingAny = computed(() => Object.values(loading).some(Boolean) || busy.value)

const needs = ref<CollaborationNeed[]>([])
const seriesItems = ref<CollaborationSeries[]>([])
const activities = ref<CollaborationActivity[]>([])
const discussions = ref<StructuredDiscussion[]>([])
const seriesMembers = ref<SeriesMember[]>([])
const seriesSubmissions = ref<CollaborationSubmission[]>([])
const activitySubmissions = ref<CollaborationSubmission[]>([])

const manageableNeeds = computed(() => needs.value.filter((item) => item.canManage))
const submittedNeeds = computed(() => manageableNeeds.value.filter((item) => item.status === 'SUBMITTED'))
const directlyFulfillableNeeds = computed(() => (
  manageableNeeds.value.filter((item) => ['OPEN', 'CLAIMED'].includes(item.status))
))
const closableNeeds = computed(() => (
  manageableNeeds.value.filter((item) => ['OPEN', 'CLAIMED', 'SUBMITTED'].includes(item.status))
))
const manageableSeries = computed(() => seriesItems.value.filter((item) => item.canManage))
const manageableActivities = computed(() => activities.value.filter((item) => item.canManage))
const manageableDiscussions = computed(() => discussions.value.filter((item) => item.canManage))

const needForm = reactive({ needId: '', resolutionType: 'POST' as NeedResolutionType, resolutionId: '', note: '' })
const needMergeForm = reactive({ needId: '', targetNeedId: '', note: '' })
const needCloseForm = reactive({ needId: '', note: '' })
const rejectReasons = reactive<Record<string, string>>({})

const seriesCreate = reactive({
  domain: localDomainConfigs[0]?.domain ?? 1,
  title: '',
  description: '',
  submissionInstructions: '',
  riskAcknowledged: false,
})
const selectedSeriesId = ref('')
const selectedSeries = computed(() => manageableSeries.value.find((item) => String(item.id) === selectedSeriesId.value) || null)
const seriesMemberForm = reactive({ uid: '', role: 'CONTRIBUTOR' as Exclude<SeriesMemberRole, 'OWNER'> })

const activityCreate = reactive({
  domain: localDomainConfigs[0]?.domain ?? 1,
  activityType: 'OPEN_CALL' as CollaborationActivityType,
  title: '',
  description: '',
  submissionRule: '',
  startsAt: '',
  endsAt: '',
  riskAcknowledged: false,
})
const selectedActivityId = ref('')
const selectedActivity = computed(() => manageableActivities.value.find((item) => String(item.id) === selectedActivityId.value) || null)
const activitySummary = ref('')

const discussionCreate = reactive({
  sourcePostId: '',
  title: '',
  prompt: '',
  optionsText: '',
  riskAcknowledged: false,
})
const selectedDiscussionId = ref('')
const selectedDiscussion = computed(() => manageableDiscussions.value.find((item) => String(item.id) === selectedDiscussionId.value) || null)
const discussionSummary = reactive({
  summary: '',
  consensusState: 'PARTIAL' as 'REACHED' | 'PARTIAL' | 'NOT_REACHED',
  authorFollowUp: '',
  closeAfterSummary: false,
})

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

const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value.trim())
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const formatDate = (value?: string | null) => {
  if (!value) return '时间待定'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}
const submissionTargetLabel = (need: CollaborationNeed) => {
  if (!need.submissionResolutionType || !need.submissionResolutionId) return '产出信息待刷新'
  const labels: Record<NeedResolutionType, string> = {
    POST: '帖子',
    QUESTION: '问题',
    SERIES: '合集',
  }
  return `${labels[need.submissionResolutionType]} #${need.submissionResolutionId}`
}
const submissionPath = (need: CollaborationNeed): RouteLocationRaw | null => {
  if (!need.submissionResolutionId) return null
  if (need.submissionResolutionType === 'QUESTION') {
    return `/questions/${need.submissionResolutionId}`
  }
  if (need.submissionResolutionType === 'SERIES') {
    return {
      path: '/collaboration',
      query: { tab: 'series', seriesId: String(need.submissionResolutionId) },
    }
  }
  if (need.submissionResolutionType === 'POST') {
    return `/post/${need.submissionResolutionId}`
  }
  return null
}
const canFulfillNeed = computed(() => !busy.value && isPositiveId(needForm.needId) && isPositiveId(needForm.resolutionId))
const canMergeNeed = computed(() => !busy.value && isPositiveId(needMergeForm.needId) && isPositiveId(needMergeForm.targetNeedId))
const canCloseNeed = computed(() => !busy.value && isPositiveId(needCloseForm.needId) && needCloseForm.note.length >= 2)
const canCreateSeries = computed(() => !busy.value && seriesCreate.title.length >= 2 && seriesCreate.description.length >= 10 && (seriesCreate.domain !== 5 || seriesCreate.riskAcknowledged))
const canCreateActivity = computed(() => !busy.value && activityCreate.title.length >= 2 && activityCreate.description.length >= 10 && (!activityCreate.endsAt || !activityCreate.startsAt || new Date(activityCreate.endsAt) > new Date(activityCreate.startsAt)) && (activityCreate.domain !== 5 || activityCreate.riskAcknowledged))
const discussionOptions = computed(() => discussionCreate.optionsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))
const canCreateDiscussion = computed(() => !busy.value && isPositiveId(discussionCreate.sourcePostId) && discussionCreate.title.length >= 2 && discussionCreate.prompt.length >= 10 && discussionOptions.value.length >= 2 && discussionOptions.value.length <= 10)

const runLoad = async (key: LoadKey, task: (isCurrent: () => boolean) => Promise<void>, fallback: string) => {
  const requestId = ++loadRequestIds[key]
  const isCurrent = () => loadRequestIds[key] === requestId
  loading[key] = true
  try {
    await task(isCurrent)
  } catch (error) {
    if (isCurrent()) toast.error(getErrorMessage(error, fallback))
  } finally {
    if (isCurrent()) loading[key] = false
  }
}
const runAction = async (key: string, task: () => Promise<void>, success: string) => {
  if (busy.value) return
  pendingAction.value = key
  try {
    await task()
    toast.success(success)
  } catch (error) {
    toast.error(getErrorMessage(error, '共建管理操作失败'))
  } finally {
    pendingAction.value = ''
  }
}

const loadNeeds = () => {
  if (!authStore.isLoggedIn) {
    needs.value = []
    return Promise.resolve()
  }
  return runLoad('needs', async (isCurrent) => {
    const items = await collectCollaborationPages((cursor) => collaborationApi.needs.createdMine({
      cursor, size: COLLECTION_PAGE_SIZE,
    }), isCurrent)
    if (isCurrent()) {
      needs.value = items
      const submittedIds = new Set(items
        .filter((item) => item.status === 'SUBMITTED')
        .map((item) => String(item.id)))
      for (const needId of Object.keys(rejectReasons)) {
        if (!submittedIds.has(needId)) delete rejectReasons[needId]
      }
    }
  }, '我发起的需求加载失败')
}
const loadSeries = () => runLoad('series', async (isCurrent) => {
  const items = await collectCollaborationPages((cursor) => collaborationApi.series.list({
    cursor, size: COLLECTION_PAGE_SIZE,
  }), isCurrent)
  if (isCurrent()) seriesItems.value = items
}, '可管理合集加载失败')
const loadActivities = () => runLoad('activities', async (isCurrent) => {
  const items = await collectCollaborationPages((cursor) => collaborationApi.activities.list({
    cursor, size: COLLECTION_PAGE_SIZE,
  }), isCurrent)
  if (isCurrent()) activities.value = items
}, '可管理活动加载失败')
const loadDiscussions = () => runLoad('discussions', async (isCurrent) => {
  const items = await collectCollaborationPages((cursor) => collaborationApi.discussions.list({
    cursor, size: COLLECTION_PAGE_SIZE,
  }), isCurrent)
  if (isCurrent()) discussions.value = items
}, '可管理讨论加载失败')
const refreshAll = () => Promise.all([loadNeeds(), loadSeries(), loadActivities(), loadDiscussions()])

const fulfillNeed = () => runAction('fulfill-need', async () => {
  await collaborationApi.needs.fulfill(needForm.needId, {
    resolutionType: needForm.resolutionType,
    resolutionId: needForm.resolutionId,
    resolutionPostId: needForm.resolutionType === 'POST' ? needForm.resolutionId : undefined,
    note: needForm.note || undefined,
  })
  Object.assign(needForm, { needId: '', resolutionType: 'POST', resolutionId: '', note: '' })
  await loadNeeds()
}, '需求已完成')
const acceptNeed = (needId: ApiId) => runAction(`accept-need:${needId}`, async () => {
  await collaborationApi.needs.accept(needId)
  delete rejectReasons[String(needId)]
  await loadNeeds()
}, '产出已验收，需求已完成')
const rejectNeed = (needId: ApiId) => {
  const reason = rejectReasons[String(needId)]?.trim()
  if (!reason) return Promise.resolve()
  return runAction(`reject-need:${needId}`, async () => {
    await collaborationApi.needs.reject(needId, { reason })
    delete rejectReasons[String(needId)]
    await loadNeeds()
  }, '产出已退回认领者修改')
}
const mergeNeed = () => runAction('merge-need', async () => {
  await collaborationApi.needs.merge(needMergeForm.needId, { targetNeedId: needMergeForm.targetNeedId, note: needMergeForm.note || undefined })
  Object.assign(needMergeForm, { needId: '', targetNeedId: '', note: '' })
  await loadNeeds()
}, '需求已合并')
const closeNeed = () => {
  const selectedNeed = manageableNeeds.value.find((item) => String(item.id) === needCloseForm.needId)
  if (selectedNeed?.status === 'SUBMITTED'
    && !window.confirm('该需求有认领者提交的产出待处理，确认关闭？')) {
    return Promise.resolve()
  }
  return runAction('close-need', async () => {
    await collaborationApi.needs.close(needCloseForm.needId, { note: needCloseForm.note })
    Object.assign(needCloseForm, { needId: '', note: '' })
    await loadNeeds()
  }, '需求已关闭')
}

const createSeries = () => runAction('create-series', async () => {
  await collaborationApi.series.create({
    domain: seriesCreate.domain,
    title: seriesCreate.title,
    description: seriesCreate.description,
    submissionInstructions: seriesCreate.submissionInstructions || undefined,
    riskAcknowledged: seriesCreate.riskAcknowledged,
  })
  Object.assign(seriesCreate, { title: '', description: '', submissionInstructions: '', riskAcknowledged: false })
  await loadSeries()
}, '协作合集已创建')
const loadSeriesWorkspace = () => {
  const id = selectedSeriesId.value
  if (!isPositiveId(id)) {
    loadRequestIds.workspace += 1
    seriesMembers.value = []
    seriesSubmissions.value = []
    return Promise.resolve()
  }
  return runLoad('workspace', async (isCurrent) => {
    const [members, submissions] = await Promise.all([
      collectCollaborationPages((cursor) => collaborationApi.series.members.list(id, {
        cursor, size: COLLECTION_PAGE_SIZE,
      }), isCurrent),
      collectCollaborationPages((cursor) => collaborationApi.series.submissions.list(id, {
        cursor, size: COLLECTION_PAGE_SIZE,
      }), isCurrent),
    ])
    if (isCurrent() && selectedSeriesId.value === id) {
      seriesMembers.value = members
      seriesSubmissions.value = submissions
    }
  }, '合集工作区加载失败')
}
const addSeriesMember = () => runAction('add-member', async () => {
  await collaborationApi.series.members.add(selectedSeriesId.value, { uid: seriesMemberForm.uid, role: seriesMemberForm.role })
  seriesMemberForm.uid = ''
  await loadSeriesWorkspace()
}, '合集成员已添加')
const removeSeriesMember = (uid: ApiId) => runAction(`remove-member:${uid}`, async () => {
  await collaborationApi.series.members.remove(selectedSeriesId.value, uid)
  await loadSeriesWorkspace()
}, '合集成员已移除')
const reviewSeriesSubmission = (submissionId: ApiId, decision: ReviewDecision) => runAction(`series-review:${submissionId}`, async () => {
  await collaborationApi.series.submissions.decide(selectedSeriesId.value, submissionId, { decision, note: decision === 'APPROVED' ? '符合合集要求' : '不符合当前投稿要求' })
  await Promise.all([loadSeriesWorkspace(), loadSeries()])
}, decision === 'APPROVED' ? '合集投稿已通过' : '合集投稿已拒绝')
const closeSeries = () => runAction('close-series', async () => {
  await collaborationApi.series.close(selectedSeriesId.value)
  await loadSeries()
}, '合集已关闭')

const createActivity = () => runAction('create-activity', async () => {
  await collaborationApi.activities.create({
    domain: activityCreate.domain,
    activityType: activityCreate.activityType,
    title: activityCreate.title,
    description: activityCreate.description,
    submissionRule: activityCreate.submissionRule || undefined,
    startsAt: activityCreate.startsAt || undefined,
    endsAt: activityCreate.endsAt || undefined,
    riskAcknowledged: activityCreate.riskAcknowledged,
  })
  Object.assign(activityCreate, { title: '', description: '', submissionRule: '', startsAt: '', endsAt: '', riskAcknowledged: false })
  await loadActivities()
}, '共创活动草稿已创建')
const loadActivityWorkspace = () => {
  const id = selectedActivityId.value
  if (!isPositiveId(id)) {
    loadRequestIds.workspace += 1
    activitySubmissions.value = []
    return Promise.resolve()
  }
  return runLoad('workspace', async (isCurrent) => {
    const items = await collectCollaborationPages((cursor) =>
      collaborationApi.activities.submissions.list(id, { cursor, size: COLLECTION_PAGE_SIZE }), isCurrent)
    if (isCurrent() && selectedActivityId.value === id) activitySubmissions.value = items
  }, '活动投稿加载失败')
}
const updateActivityStatus = (status: 'OPEN' | 'REVIEWING' | 'ARCHIVED') => runAction(`activity-status:${status}`, async () => {
  await collaborationApi.activities.updateStatus(selectedActivityId.value, { status, note: `负责人将活动调整为 ${status}` })
  await loadActivities()
}, '活动状态已更新')
const reviewActivitySubmission = (submissionId: ApiId, decision: ReviewDecision) => runAction(`activity-review:${submissionId}`, async () => {
  await collaborationApi.activities.submissions.decide(selectedActivityId.value, submissionId, { decision, note: decision === 'APPROVED' ? '符合活动要求' : '不符合当前投稿要求' })
  await Promise.all([loadActivityWorkspace(), loadActivities()])
}, decision === 'APPROVED' ? '活动投稿已通过' : '活动投稿已拒绝')
const summarizeActivity = () => runAction('activity-summary', async () => {
  await collaborationApi.activities.updateSummary(selectedActivityId.value, { resultSummary: activitySummary.value })
  activitySummary.value = ''
  await loadActivities()
}, '活动总结已发布')

const createDiscussion = () => runAction('create-discussion', async () => {
  await collaborationApi.discussions.create({
    sourcePostId: discussionCreate.sourcePostId,
    title: discussionCreate.title,
    prompt: discussionCreate.prompt,
    options: discussionOptions.value,
    riskAcknowledged: discussionCreate.riskAcknowledged,
  })
  Object.assign(discussionCreate, { sourcePostId: '', title: '', prompt: '', optionsText: '', riskAcknowledged: false })
  await loadDiscussions()
}, '结构化讨论已创建')
const summarizeDiscussion = () => runAction('discussion-summary', async () => {
  await collaborationApi.discussions.updateSummary(selectedDiscussionId.value, {
    summary: discussionSummary.summary,
    consensusState: discussionSummary.consensusState,
    authorFollowUp: discussionSummary.authorFollowUp || undefined,
    closeAfterSummary: discussionSummary.closeAfterSummary,
  })
  Object.assign(discussionSummary, { summary: '', consensusState: 'PARTIAL', authorFollowUp: '', closeAfterSummary: false })
  await loadDiscussions()
}, '讨论总结已发布')

const resetPrivateWorkspace = () => {
  (Object.keys(loadRequestIds) as LoadKey[]).forEach((key) => {
    loadRequestIds[key] += 1
    loading[key] = false
  })
  needs.value = []
  seriesItems.value = []
  activities.value = []
  discussions.value = []
  seriesMembers.value = []
  seriesSubmissions.value = []
  activitySubmissions.value = []
  selectedSeriesId.value = ''
  selectedActivityId.value = ''
  selectedDiscussionId.value = ''
  for (const needId of Object.keys(rejectReasons)) delete rejectReasons[needId]
  pendingAction.value = ''
}

watch(
  [() => authStore.isLoggedIn, () => authStore.user?.uid],
  ([isLoggedIn]) => {
    resetPrivateWorkspace()
    if (isLoggedIn) void refreshAll()
  },
)

onMounted(() => {
  if (authStore.isLoggedIn) void refreshAll()
})
</script>

<style scoped>
.management-workspace,
.form-stack,
.dense-list {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.access-note {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid rgb(186 230 253);
  border-radius: 0.75rem;
  background: rgb(240 249 255);
  padding: 0.9rem 1rem;
  color: rgb(3 105 161);
}

.access-note > div {
  min-width: 0;
  flex: 1;
}

.access-note strong {
  color: rgb(12 74 110);
  font-size: 0.85rem;
  font-weight: 900;
}

.access-note p {
  margin-top: 0.2rem;
  font-size: 0.76rem;
  line-height: 1.5;
}

.manage-tabs,
.row-actions,
.inline-form,
.panel-heading h2 {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.manage-tabs {
  overflow-x: auto;
  padding-bottom: 0.15rem;
}

.manage-tabs button {
  display: inline-flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.75rem;
  color: rgb(51 65 85);
  font-size: 0.78rem;
  font-weight: 900;
}

.manage-tabs button.active {
  border-color: rgb(8 145 178);
  background: rgb(236 254 255);
  color: rgb(14 116 144);
}

.manage-layout {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.manage-panel {
  min-width: 0;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.panel-heading {
  margin-bottom: 1rem;
}

.panel-heading h2 {
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.panel-heading h2 svg {
  color: rgb(14 116 144);
}

.panel-heading p {
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  line-height: 1.5;
}

.subsection-heading {
  margin-bottom: 0.8rem;
}

.subsection-heading strong,
.subsection-heading span {
  display: block;
}

.subsection-heading strong {
  color: rgb(30 41 59);
  font-size: 0.82rem;
}

.subsection-heading span {
  margin-top: 0.2rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  line-height: 1.45;
}

.form-stack label,
.field-label {
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

.inline-form {
  align-items: flex-end;
  margin-bottom: 1rem;
}

.inline-form .field-control {
  flex: 1;
}

.dense-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.75rem;
}

.dense-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.dense-row > div:first-child {
  min-width: 0;
  flex: 1;
}

.dense-row strong {
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.83rem;
  font-weight: 900;
}

.dense-row p,
.dense-row small {
  display: block;
  margin-top: 0.3rem;
  overflow-wrap: anywhere;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  line-height: 1.45;
}

.review-row {
  align-items: stretch;
}

.review-actions,
.reject-control {
  display: grid;
  min-width: 0;
  gap: 0.5rem;
}

.review-actions {
  width: min(100%, 18rem);
  flex: 0 0 18rem;
}

.reject-control {
  grid-template-columns: minmax(0, 1fr) auto;
}

.submission-link {
  display: inline-flex;
  margin-top: 0.4rem;
  color: rgb(8 145 178);
  font-size: 0.72rem;
  font-weight: 850;
}

.compact-list {
  margin-top: 0.9rem;
}

.section-divider {
  margin: 1rem 0;
  border-top: 1px solid rgb(226 232 240);
}

.action-strip,
.top-gap {
  margin-top: 1rem;
}

.primary-button,
.secondary-button,
.danger-button {
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

.secondary-button {
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

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.empty-hint {
  border: 1px dashed rgb(203 213 225);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
  color: rgb(71 85 105);
}

.empty-hint strong {
  color: rgb(30 41 59);
  font-size: 0.82rem;
  font-weight: 900;
}

.empty-hint p {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  line-height: 1.45;
}

@media (min-width: 960px) {
  .manage-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .access-note,
  .dense-row,
  .inline-form {
    align-items: stretch;
    flex-direction: column;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .row-actions {
    justify-content: flex-start;
  }

  .review-actions {
    width: 100%;
    flex-basis: auto;
  }

  .reject-control {
    grid-template-columns: minmax(0, 1fr);
  }
}

.dark .manage-panel,
.dark .manage-tabs button,
.dark .field-control,
.dark .secondary-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .panel-heading h2,
.dark .dense-row strong,
.dark .empty-hint strong,
.dark .subsection-heading strong {
  color: rgb(248 250 252);
}

.dark .panel-heading p,
.dark .form-stack label,
.dark .field-label,
.dark .subsection-heading span {
  color: rgb(148 163 184);
}

.dark .dense-row,
.dark .section-divider {
  border-color: rgb(51 65 85);
}

.dark .empty-hint {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.7);
  color: rgb(148 163 184);
}
</style>
