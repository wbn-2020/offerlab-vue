<template>
  <section id="community-role-workspace" class="role-workspace" aria-label="社区角色工作台">
    <div class="workspace-heading">
      <div>
        <p class="eyebrow">V8 · 角色证据</p>
        <h2><BadgeCheck class="h-5 w-5" />社区角色工作台</h2>
        <span>查看角色领域、资格证据、申请状态和当前服务端开放的公共维护入口。</span>
      </div>
      <button type="button" class="icon-button" title="刷新角色工作台" :disabled="loading" @click="loadWorkspace">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div v-if="errorText" class="state state-error" role="alert">
      <AlertTriangle class="h-5 w-5" />
      <span>{{ errorText }}</span>
      <button type="button" class="secondary-button compact" @click="loadWorkspace">重试</button>
    </div>
    <div v-else-if="loading && cards.length === 0" class="state">
      <Loader2 class="h-5 w-5 animate-spin" />正在读取角色工作台
    </div>
    <div v-else-if="cards.length === 0" class="state">
      <BadgeCheck class="h-5 w-5" />当前没有可展示的角色定义。
    </div>
    <template v-else>
      <div class="role-card-grid">
        <button
          v-for="card in cards"
          :key="roleKey(card)"
          type="button"
          :class="['role-card', selectedKey === roleKey(card) ? 'role-card-selected' : '']"
          @click="selectRole(card)"
        >
          <div class="card-topline">
            <span class="meta-chip">{{ card.definition.domainCode }}</span>
            <span :class="['status-pill', grantClass(card.evidence.grantStatus)]">
              {{ grantLabel(card.evidence.grantStatus) }}
            </span>
          </div>
          <strong>{{ card.definition.roleName }}</strong>
          <small>{{ card.definition.roleCode }}</small>
          <p>{{ card.definition.description || '暂无角色说明' }}</p>
          <div class="card-footer">
            <span>{{ card.evidence.eligible ? '资格满足' : `缺口 ${card.evidence.failedChecks.length}` }}</span>
            <span v-if="card.evidence.expiresAt">到期 {{ formatTime(card.evidence.expiresAt) }}</span>
          </div>
        </button>
      </div>

      <div class="workspace-grid">
        <RoleEligibilityPanel
          :evidence="selectedEvidence"
          :loading="evidenceLoading"
          :error="evidenceError"
          @retry="refreshEvidence"
        />
        <aside class="selection-summary">
          <h3><ClipboardCheck class="h-5 w-5" />当前选择</h3>
          <p v-if="selectedCard">{{ selectedCard.definition.roleName }} · {{ selectedCard.definition.domainCode }}</p>
          <dl v-if="selectedCard">
            <div><dt>申请记录</dt><dd>{{ selectedCard.application ? statusLabel(selectedCard.application.status) : '暂无' }}</dd></div>
            <div><dt>授权记录</dt><dd>{{ selectedCard.grant ? statusLabel(selectedCard.grant.status) : '暂无' }}</dd></div>
            <div><dt>人工审核</dt><dd>{{ selectedEvidence?.manualApprovalRequired ? '需要' : '不需要' }}</dd></div>
          </dl>
          <p class="boundary-copy">角色权限只在服务端授予的领域和能力范围内生效；页面上的可执行状态不替代服务端复验。</p>
        </aside>
      </div>

      <MaintenanceTaskCandidateList v-if="selectedEvidence?.canUseMaintenanceWorkspace" />
      <div v-else class="candidate-locked">
        <LockKeyhole class="h-5 w-5" />
        <span>当前选择的角色没有服务端开放的公共维护候选入口。</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCheck,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  communityRolesApi,
  type CommunityRoleEvidence,
  type CommunityRoleWorkspaceCard,
} from '@/api/communityRoles'
import MaintenanceTaskCandidateList from './MaintenanceTaskCandidateList.vue'
import RoleEligibilityPanel from './RoleEligibilityPanel.vue'

const cards = ref<CommunityRoleWorkspaceCard[]>([])
const selectedKey = ref('')
const selectedEvidence = ref<CommunityRoleEvidence | null>(null)
const loading = ref(false)
const evidenceLoading = ref(false)
const errorText = ref('')
const evidenceError = ref('')
let evidenceRequest = 0

const selectedCard = computed(() => cards.value.find((card) => roleKey(card) === selectedKey.value) || null)

const roleKey = (card: CommunityRoleWorkspaceCard) =>
  `${card.definition.roleCode}:${card.definition.domainCode}`

const selectRole = async (card: CommunityRoleWorkspaceCard) => {
  const requestId = ++evidenceRequest
  selectedKey.value = roleKey(card)
  selectedEvidence.value = card.evidence
  evidenceError.value = ''
  evidenceLoading.value = true
  try {
    const response = await communityRolesApi.evidence(
      card.definition.roleCode,
      card.definition.domainCode,
    )
    if (requestId === evidenceRequest && selectedKey.value === roleKey(card)) {
      selectedEvidence.value = response.data || card.evidence
    }
  } catch (error) {
    if (requestId === evidenceRequest) {
      evidenceError.value = getErrorMessage(error, '角色证据暂时无法读取')
    }
  } finally {
    if (requestId === evidenceRequest) evidenceLoading.value = false
  }
}

const refreshEvidence = () => {
  if (selectedCard.value) return selectRole(selectedCard.value)
  return Promise.resolve()
}

const loadWorkspace = async () => {
  loading.value = true
  errorText.value = ''
  try {
    const response = await communityRolesApi.workspace()
    cards.value = Array.isArray(response.data?.roles) ? response.data.roles : []
    const next = cards.value.find((card) => roleKey(card) === selectedKey.value) || cards.value[0]
    if (next) await selectRole(next)
    else {
      selectedKey.value = ''
      selectedEvidence.value = null
    }
  } catch (error) {
    errorText.value = getErrorMessage(error, '社区角色工作台暂时无法读取')
  } finally {
    loading.value = false
  }
}

const statusLabel = (value: string) => ({
  SUBMITTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  ACTIVE: '生效',
  SUSPENDED: '暂停',
  REVOKED: '撤销',
  EXPIRED: '到期',
}[value] || value)

const grantLabel = (value?: string | null) => value ? statusLabel(value) : '未授权'
const grantClass = (value?: string | null) => {
  if (value === 'ACTIVE') return 'status-ok'
  if (['SUSPENDED', 'SUBMITTED'].includes(value || '')) return 'status-warn'
  return 'status-muted'
}
const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN')
}

onMounted(loadWorkspace)
</script>

<style scoped>
.role-workspace { display: grid; gap: 1rem; border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1rem; }
.workspace-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.workspace-heading h2 { display: flex; align-items: center; gap: .4rem; margin: .2rem 0 0; color: rgb(15 23 42); font-size: 1rem; font-weight: 900; }
.workspace-heading span { display: block; margin-top: .35rem; color: rgb(100 116 139); font-size: .74rem; line-height: 1.5; }
.eyebrow { margin: 0; color: rgb(8 145 178); font-size: .66rem; font-weight: 900; letter-spacing: .05em; }
.icon-button { display: inline-flex; height: 2.25rem; width: 2.25rem; flex: none; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; color: rgb(51 65 85); }
.role-card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; }
.role-card { min-width: 0; border: 1px solid rgb(226 232 240); border-radius: .5rem; background: rgb(248 250 252); padding: .75rem; text-align: left; transition: border-color .15s ease, background .15s ease; }
.role-card:hover, .role-card-selected { border-color: rgb(8 145 178); background: rgb(240 249 255); }
.card-topline, .card-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .35rem; }
.status-pill, .meta-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: .2rem .48rem; font-size: .64rem; font-weight: 900; }
.status-ok { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-warn { background: rgb(254 243 199); color: rgb(146 64 14); }
.status-muted, .meta-chip { background: rgb(241 245 249); color: rgb(71 85 105); }
.role-card > strong, .role-card > small, .role-card > p { display: block; overflow-wrap: anywhere; }
.role-card > strong { margin-top: .65rem; color: rgb(30 41 59); font-size: .82rem; font-weight: 900; }
.role-card > small { margin-top: .15rem; color: rgb(100 116 139); font-size: .66rem; }
.role-card > p { min-height: 2.2rem; margin: .45rem 0; color: rgb(71 85 105); font-size: .7rem; line-height: 1.45; }
.card-footer { color: rgb(8 145 178); font-size: .66rem; font-weight: 800; }
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(15rem, .8fr); gap: 1rem; align-items: start; }
.selection-summary { min-width: 0; border: 1px solid rgb(226 232 240); border-radius: .625rem; padding: 1rem; }
.selection-summary h3 { display: flex; align-items: center; gap: .4rem; margin: 0; color: rgb(15 23 42); font-size: .9rem; font-weight: 900; }
.selection-summary > p { margin: .55rem 0; color: rgb(71 85 105); font-size: .75rem; line-height: 1.5; }
.selection-summary dl { display: grid; gap: .45rem; margin: .8rem 0; }
.selection-summary dl div { display: flex; justify-content: space-between; gap: .6rem; border-bottom: 1px solid rgb(241 245 249); padding-bottom: .4rem; font-size: .7rem; }
.selection-summary dt { color: rgb(100 116 139); }
.selection-summary dd { margin: 0; color: rgb(30 41 59); font-weight: 900; text-align: right; overflow-wrap: anywhere; }
.boundary-copy { border-left: 2px solid rgb(125 211 252); padding-left: .6rem; color: rgb(100 116 139) !important; font-size: .68rem !important; }
.state, .candidate-locked { display: flex; min-height: 6rem; align-items: center; justify-content: center; gap: .5rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; padding: 1rem; color: rgb(100 116 139); font-size: .76rem; text-align: center; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.candidate-locked { justify-content: flex-start; border-color: rgb(226 232 240); background: rgb(248 250 252); text-align: left; }
.secondary-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: .35rem .6rem; color: rgb(51 65 85); font-size: .7rem; font-weight: 900; }
button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 900px) { .role-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .workspace-grid { grid-template-columns: 1fr; } }
@media (max-width: 580px) { .role-card-grid { grid-template-columns: 1fr; } }
.dark .role-workspace, .dark .selection-summary, .dark .icon-button, .dark .secondary-button { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }
.dark .workspace-heading h2, .dark .selection-summary h3, .dark .selection-summary dd, .dark .role-card > strong { color: rgb(248 250 252); }
.dark .workspace-heading span, .dark .selection-summary > p, .dark .selection-summary dt, .dark .boundary-copy, .dark .role-card > small, .dark .role-card > p, .dark .state { color: rgb(148 163 184); }
.dark .role-card { border-color: rgb(51 65 85); background: rgb(2 6 23 / .6); }
.dark .role-card:hover, .dark .role-card-selected { border-color: rgb(34 211 238); background: rgb(8 47 73 / .35); }
.dark .selection-summary dl div { border-color: rgb(51 65 85); }
.dark .candidate-locked { border-color: rgb(51 65 85); background: rgb(2 6 23 / .6); }
.dark .status-muted, .dark .meta-chip { background: rgb(30 41 59); color: rgb(203 213 225); }
</style>
