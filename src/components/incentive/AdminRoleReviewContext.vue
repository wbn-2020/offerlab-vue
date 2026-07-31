<template>
  <section class="review-context" aria-label="角色审核上下文">
    <div class="panel-heading">
      <div>
        <h2><ClipboardCheck class="h-5 w-5" />角色审核上下文</h2>
        <p>读取申请人的资格证据、维护履约和授权历史；实际审核动作仍由服务端复验。</p>
      </div>
      <span :class="['status-pill', canInspect ? 'status-ok' : 'status-muted']">
        {{ permissionLoading ? '权限核验中' : canInspect ? '可查看' : '无查看权限' }}
      </span>
    </div>

    <div v-if="permissionError" class="state state-error" role="alert">
      <AlertTriangle class="h-5 w-5" />{{ permissionError }}
    </div>
    <div v-else-if="!canInspect" class="state">
      <ShieldAlert class="h-5 w-5" />当前账号没有角色审核上下文权限，服务端不会返回申请人证据。
    </div>
    <template v-else>
      <div class="query-form">
        <label>
          <span>申请 ID</span>
          <input v-model.trim="applicationId" class="field-control" inputmode="numeric" placeholder="例如 10001">
        </label>
        <label class="reason-field">
          <span>查看理由</span>
          <input v-model.trim="reason" class="field-control" maxlength="500" placeholder="说明本次审核查看的依据">
        </label>
        <button type="button" class="primary-button" :disabled="!canLoad" @click="load">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <Search v-else class="h-4 w-4" />
          {{ loading ? '读取中' : '读取上下文' }}
        </button>
      </div>

      <div v-if="errorText" class="state state-error" role="alert">
        <AlertTriangle class="h-5 w-5" />{{ errorText }}
        <button type="button" class="secondary-button compact" @click="load">重试</button>
      </div>
      <div v-else-if="!context" class="state">
        <Info class="h-5 w-5" />输入申请 ID 和查看理由后读取。
      </div>
      <div v-else class="context-grid">
        <div class="context-main">
          <div class="context-title">
            <div>
              <span class="meta-chip">{{ context.application.status }}</span>
              <h3>{{ context.definition.roleName }} · {{ context.definition.domainCode }}</h3>
              <p>申请人 UID {{ context.application.applicantUid }} · 申请 #{{ context.application.id }}</p>
            </div>
            <span :class="['status-pill', context.riskFrozen ? 'status-danger' : 'status-ok']">
              {{ context.riskFrozen ? '风险冻结' : '无风险冻结' }}
            </span>
          </div>
          <blockquote>{{ context.application.statement }}</blockquote>
          <RoleEligibilityPanel :evidence="context.evidence" :loading="false" error="" :refreshable="false" />
        </div>

        <aside class="metrics-panel">
          <h3><BarChart3 class="h-5 w-5" />审核摘要</h3>
          <dl>
            <div><dt>近期可信贡献</dt><dd>{{ formatNumber(context.recentTrustedContributionCount) }}</dd></div>
            <div><dt>完成维护任务</dt><dd>{{ formatNumber(context.completedMaintenanceTaskCount) }}</dd></div>
            <div><dt>退回维护任务</dt><dd>{{ formatNumber(context.returnedMaintenanceTaskCount) }}</dd></div>
            <div><dt>有效违规</dt><dd>{{ formatNumber(context.activeViolationCount) }}</dd></div>
          </dl>
          <h4>授权历史</h4>
          <div v-if="context.grantHistory.length === 0" class="history-empty">暂无授权变更记录。</div>
          <div v-else class="history-list">
            <div v-for="item in context.grantHistory" :key="String(item.id)">
              <strong>{{ item.fromStatus || '无' }} → {{ item.toStatus }}</strong>
              <small>{{ item.actionReason }} · {{ formatTime(item.createTime) }}</small>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Info,
  Loader2,
  Search,
  ShieldAlert,
} from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  communityRolesApi,
  type CommunityRoleReviewContext,
} from '@/api/communityRoles'
import RoleEligibilityPanel from './RoleEligibilityPanel.vue'

const props = defineProps<{
  canInspect: boolean
  permissionLoading: boolean
  permissionError: string
}>()

const applicationId = ref('')
const reason = ref('')
const loading = ref(false)
const errorText = ref('')
const context = ref<CommunityRoleReviewContext | null>(null)
const canLoad = computed(() => props.canInspect
  && /^[1-9]\d*$/.test(applicationId.value)
  && reason.value.trim().length >= 2
  && !loading.value)

const load = async () => {
  if (!canLoad.value) return
  loading.value = true
  errorText.value = ''
  try {
    const response = await communityRolesApi.reviewContext(applicationId.value, reason.value.trim())
    context.value = response.data
  } catch (error) {
    context.value = null
    errorText.value = getErrorMessage(error, '角色审核上下文暂时无法读取')
  } finally {
    loading.value = false
  }
}

const formatNumber = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('zh-CN').format(Number(value || 0))

const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

watch(
  () => props.canInspect,
  (allowed) => {
    if (!allowed) {
      context.value = null
      errorText.value = ''
    }
  },
)
</script>

<style scoped>
.review-context { display: grid; gap: 1rem; border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1rem; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; }
.panel-heading h2 { display: flex; align-items: center; gap: .4rem; margin: 0; color: rgb(15 23 42); font-size: 1rem; font-weight: 900; }
.panel-heading p { margin: .3rem 0 0; color: rgb(100 116 139); font-size: .73rem; line-height: 1.5; }
.status-pill, .meta-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: .22rem .5rem; font-size: .64rem; font-weight: 900; }
.status-ok { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-danger { background: rgb(254 226 226); color: rgb(185 28 28); }
.status-muted, .meta-chip { background: rgb(241 245 249); color: rgb(71 85 105); }
.query-form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: .6rem; }
.query-form label { display: grid; min-width: 10rem; flex: 0 1 13rem; gap: .25rem; }
.query-form .reason-field { flex: 1 1 20rem; }
.query-form label span { color: rgb(71 85 105); font-size: .68rem; font-weight: 800; }
.field-control { width: 100%; min-height: 36px; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: .45rem .6rem; color: rgb(15 23 42); font-size: .73rem; }
.primary-button, .secondary-button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: .35rem; border-radius: .45rem; padding: .4rem .7rem; font-size: .72rem; font-weight: 900; }
.primary-button { border: 1px solid rgb(8 145 178); background: rgb(8 145 178); color: white; }
.secondary-button { border: 1px solid rgb(203 213 225); background: white; color: rgb(51 65 85); }
.state { display: flex; min-height: 5.5rem; align-items: center; justify-content: center; gap: .5rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; padding: 1rem; color: rgb(100 116 139); font-size: .75rem; text-align: center; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.context-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(16rem, .7fr); gap: 1rem; align-items: start; }
.context-main { min-width: 0; display: grid; gap: .8rem; }
.context-title { display: flex; align-items: flex-start; justify-content: space-between; gap: .7rem; }
.context-title h3 { margin: .35rem 0 0; color: rgb(30 41 59); font-size: .9rem; font-weight: 900; }
.context-title p { margin: .25rem 0 0; color: rgb(100 116 139); font-size: .7rem; }
blockquote { margin: 0; border-left: 2px solid rgb(125 211 252); padding: .55rem .7rem; color: rgb(71 85 105); font-size: .75rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.metrics-panel { min-width: 0; border: 1px solid rgb(226 232 240); border-radius: .625rem; padding: .85rem; }
.metrics-panel h3 { display: flex; align-items: center; gap: .35rem; margin: 0; color: rgb(15 23 42); font-size: .85rem; font-weight: 900; }
.metrics-panel dl { display: grid; gap: .45rem; margin: .8rem 0; }
.metrics-panel dl div { display: flex; justify-content: space-between; gap: .5rem; border-bottom: 1px solid rgb(241 245 249); padding-bottom: .4rem; font-size: .7rem; }
.metrics-panel dt { color: rgb(100 116 139); }
.metrics-panel dd { margin: 0; color: rgb(30 41 59); font-weight: 900; }
.metrics-panel h4 { margin: 1rem 0 .45rem; color: rgb(30 41 59); font-size: .75rem; font-weight: 900; }
.history-list { display: grid; gap: .5rem; }
.history-list div { border-left: 2px solid rgb(186 230 253); padding-left: .5rem; }
.history-list strong, .history-list small { display: block; overflow-wrap: anywhere; }
.history-list strong { color: rgb(30 41 59); font-size: .7rem; }
.history-list small, .history-empty { margin-top: .2rem; color: rgb(100 116 139); font-size: .67rem; line-height: 1.45; }
button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 850px) { .context-grid { grid-template-columns: 1fr; } }
.dark .review-context, .dark .metrics-panel, .dark .field-control, .dark .secondary-button { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }
.dark .panel-heading h2, .dark .context-title h3, .dark .metrics-panel h3, .dark .metrics-panel h4, .dark .metrics-panel dd, .dark .history-list strong { color: rgb(248 250 252); }
.dark .panel-heading p, .dark .query-form label span, .dark .context-title p, .dark blockquote, .dark .metrics-panel dt, .dark .history-list small, .dark .history-empty, .dark .state { color: rgb(148 163 184); }
.dark .metrics-panel dl div { border-color: rgb(51 65 85); }
.dark .status-muted, .dark .meta-chip { background: rgb(30 41 59); color: rgb(203 213 225); }
</style>
