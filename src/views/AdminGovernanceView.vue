<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Governance</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">治理中心</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            集中查看迁移状态、审计记录，并维护内容关键词与用户禁言封禁状态。
          </p>
        </div>
        <button type="button" class="secondary-button" :disabled="isLoading" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          刷新
        </button>
      </section>

      <section class="mb-6 grid gap-4 md:grid-cols-4">
        <article class="metric-card">
          <span>迁移状态</span>
          <strong :class="migration?.ready ? 'text-emerald-600' : 'text-amber-600'">{{ migration?.ready ? 'Ready' : 'Check' }}</strong>
        </article>
        <article class="metric-card">
          <span>关键词</span>
          <strong>{{ keywords.length }}</strong>
        </article>
        <article class="metric-card">
          <span>受限用户</span>
          <strong>{{ users.length }}</strong>
        </article>
        <article class="metric-card">
          <span>敏感词命中</span>
          <strong>{{ hits.length }}</strong>
        </article>
      </section>

      <section class="tabs">
        <button v-for="tab in tabs" :key="tab.value" type="button" :class="['tab-button', activeTab === tab.value ? 'tab-active' : '']" @click="activeTab = tab.value">
          {{ tab.label }}
        </button>
      </section>

      <section v-if="activeTab === 'migration'" class="panel">
        <h2 class="panel-title">迁移检查</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <StatusList title="表" :items="migration?.tables || {}" />
          <StatusList title="索引" :items="migration?.indexes || {}" />
        </div>
      </section>

      <section v-else-if="activeTab === 'keywords'" class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article class="panel">
          <h2 class="panel-title">敏感词</h2>
          <div class="space-y-3">
            <button v-for="item in keywords" :key="item.id" type="button" class="row-card" @click="selectKeyword(item)">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['status-pill', item.enabled === 1 ? 'status-ok' : 'status-muted']">{{ item.enabled === 1 ? '启用' : '停用' }}</span>
                  <strong>{{ item.keyword }}</strong>
                  <span class="meta-chip">{{ item.scope }}</span>
                  <span class="meta-chip">{{ item.matchType }}</span>
                </div>
                <p class="mt-2 text-sm text-slate-500">{{ item.remark || '暂无备注' }}</p>
              </div>
            </button>
          </div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">{{ selectedKeyword ? '编辑关键词' : '新增关键词' }}</h2>
          <form class="space-y-3" @submit.prevent="saveKeyword">
            <input v-model.trim="keywordForm.keyword" class="field-input" placeholder="关键词" />
            <select v-model="keywordForm.scope" class="field-input">
              <option value="ALL">ALL</option>
              <option value="POST">POST</option>
              <option value="COMMENT">COMMENT</option>
              <option value="REPORT">REPORT</option>
            </select>
            <select v-model="keywordForm.matchType" class="field-input">
              <option value="CONTAINS">CONTAINS</option>
              <option value="EXACT">EXACT</option>
            </select>
            <select v-model="keywordForm.action" class="field-input">
              <option value="BLOCK">BLOCK</option>
              <option value="REVIEW">REVIEW</option>
            </select>
            <select v-model="keywordForm.enabled" class="field-input">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
            <textarea v-model.trim="keywordForm.remark" class="field-input min-h-[90px]" placeholder="备注" />
            <div class="flex gap-2">
              <button type="submit" class="primary-button" :disabled="isSaving || keywordForm.keyword.length < 2">保存</button>
              <button type="button" class="secondary-button" @click="resetKeyword">新增</button>
            </div>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'users'" class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article class="panel">
          <h2 class="panel-title">用户限制</h2>
          <div class="space-y-3">
            <div v-for="item in users" :key="item.uid" class="row-card">
              <div class="user-limit-row">
                <div class="user-limit-main">
                  <div class="user-brief">
                    <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="" class="user-avatar" />
                    <div v-else class="user-avatar user-avatar-fallback">
                      <CircleUserRound class="h-5 w-5" />
                    </div>
                    <div class="min-w-0">
                      <strong class="block truncate text-slate-950 dark:text-slate-50">{{ item.nickname || `用户 ${item.uid}` }}</strong>
                      <span class="font-mono text-xs font-semibold text-slate-400">UID {{ item.uid }}</span>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span :class="['status-pill', isMuted(item) ? 'status-warn' : 'status-muted']">禁言至 {{ formatTime(item.mutedUntil) }}</span>
                    <span :class="['status-pill', isBanned(item) ? 'status-danger' : 'status-muted']">封禁至 {{ formatTime(item.bannedUntil) }}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-500">{{ item.reason || '暂无限制原因' }}</p>
                  <div class="violation-card">
                    <div class="flex flex-wrap items-center gap-2">
                      <AlertTriangle class="h-4 w-4 text-amber-600" />
                      <strong>最近违规</strong>
                      <span v-if="item.recentViolationKeyword" class="meta-chip">{{ item.recentViolationKeyword }}</span>
                      <span v-if="item.recentViolationAction" :class="['status-pill', item.recentViolationAction === 'REVIEW' ? 'status-warn' : 'status-danger']">{{ item.recentViolationAction }}</span>
                    </div>
                    <p class="mt-2 text-sm text-slate-500">{{ item.recentViolationSummary || '暂无敏感词命中记录' }}</p>
                    <p v-if="item.recentViolationTime" class="mt-1 text-xs font-semibold text-slate-400">{{ formatTime(item.recentViolationTime) }}</p>
                  </div>
                </div>
                <div class="user-limit-actions">
                  <button type="button" class="secondary-button" :disabled="!isMuted(item) || moderationActionKey === actionKey(item.uid, 'mute')" @click="clearUserMute(item)">
                    <Unlock class="h-4 w-4" />
                    解除禁言
                  </button>
                  <button type="button" class="secondary-button danger-button" :disabled="!isBanned(item) || moderationActionKey === actionKey(item.uid, 'ban')" @click="clearUserBan(item)">
                    <ShieldOff class="h-4 w-4" />
                    解除封禁
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">设置限制</h2>
          <form class="space-y-3" @submit.prevent="saveUserState">
            <input v-model.trim="userForm.uid" class="field-input" inputmode="numeric" placeholder="用户 UID" />
            <input v-model.number="userForm.muteHours" class="field-input" type="number" min="0" placeholder="禁言小时数，0 为清除" />
            <input v-model.number="userForm.banHours" class="field-input" type="number" min="0" placeholder="封禁小时数，0 为清除" />
            <textarea v-model.trim="userForm.reason" class="field-input min-h-[90px]" placeholder="原因" />
            <button type="submit" class="primary-button" :disabled="isSaving || !userForm.uid">保存</button>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'hits'" class="panel">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="panel-title !mb-1">敏感词命中日志</h2>
            <p class="text-sm text-slate-500">记录发布、评论、举报中的关键词命中，REVIEW 动作可用于后续人工巡检。</p>
          </div>
          <div class="grid gap-2 sm:grid-cols-5">
            <select v-model="hitFilters.scope" class="field-input">
              <option value="">全部范围</option>
              <option value="POST">POST</option>
              <option value="COMMENT">COMMENT</option>
              <option value="REPORT">REPORT</option>
            </select>
            <select v-model="hitFilters.action" class="field-input">
              <option value="">全部动作</option>
              <option value="BLOCK">BLOCK</option>
              <option value="REVIEW">REVIEW</option>
            </select>
            <input v-model.trim="hitFilters.keyword" class="field-input" placeholder="关键词" />
            <input v-model.trim="hitFilters.uid" class="field-input" inputmode="numeric" placeholder="用户 UID" />
            <button type="button" class="secondary-button" :disabled="isLoading" @click="loadHits">筛选</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>范围</th><th>用户</th><th>关键词</th><th>动作</th><th>摘要</th><th>时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in hits" :key="item.id">
                <td class="font-mono text-xs">{{ item.id }}</td>
                <td>{{ item.scope }}</td>
                <td>{{ item.uid || '--' }}</td>
                <td>{{ item.keyword }}</td>
                <td><span :class="['status-pill', item.action === 'REVIEW' ? 'status-warn' : 'status-danger']">{{ item.action }}</span></td>
                <td class="max-w-[360px] truncate">{{ item.contentSummary || '--' }}</td>
                <td>{{ formatTime(item.createTime) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="panel">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="panel-title !mb-1">审计日志</h2>
            <p class="text-sm text-slate-500">按动作、对象、操作者和日期定位后台操作。</p>
          </div>
          <div class="audit-filter-grid">
            <input v-model.trim="auditFilters.action" class="field-input" placeholder="动作 action" />
            <input v-model.trim="auditFilters.resourceType" class="field-input" placeholder="对象类型" />
            <input v-model.trim="auditFilters.operatorUid" class="field-input" inputmode="numeric" placeholder="操作者 UID" />
            <input v-model="auditFilters.startDate" class="field-input" type="date" />
            <input v-model="auditFilters.endDate" class="field-input" type="date" />
            <button type="button" class="secondary-button" :disabled="isLoading" @click="applyAuditFilters">筛选</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>操作者</th><th>动作</th><th>对象</th><th>备注</th><th>时间</th><th class="text-right">详情</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in auditLogs" :key="item.id">
                <td class="font-mono text-xs">{{ item.id }}</td>
                <td>{{ item.operatorUid || '--' }}</td>
                <td>{{ item.action }}</td>
                <td>{{ item.resourceType }} / {{ item.resourceId || '--' }}</td>
                <td>{{ item.remark || '--' }}</td>
                <td>{{ formatTime(item.createTime) }}</td>
                <td class="text-right">
                  <button type="button" class="text-button" @click="openAuditDetail(item)">查看</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination-bar">
          <span>共 {{ auditTotal }} 条 · 第 {{ auditPage }} 页</span>
          <div class="flex gap-2">
            <button type="button" class="secondary-button" :disabled="isLoading || auditPage <= 1" @click="changeAuditPage(auditPage - 1)">上一页</button>
            <button type="button" class="secondary-button" :disabled="isLoading || !auditHasMore" @click="changeAuditPage(auditPage + 1)">下一页</button>
          </div>
        </div>
      </section>
    </main>

    <div v-if="selectedAudit" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="closeAuditDetail">
      <article class="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" tabindex="-1">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Audit Detail</p>
            <h2 id="audit-detail-title" class="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">{{ selectedAudit.action }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ selectedAudit.resourceType }} / {{ selectedAudit.resourceId || '--' }}</p>
          </div>
          <button ref="auditCloseButton" type="button" class="secondary-button" @click="closeAuditDetail">关闭</button>
        </div>
        <div class="grid max-h-[68vh] gap-4 overflow-auto p-5 lg:grid-cols-2">
          <div class="detail-card">
            <span>操作者</span>
            <strong>{{ selectedAudit.operatorUid || '--' }}</strong>
          </div>
          <div class="detail-card">
            <span>备注</span>
            <strong>{{ selectedAudit.remark || '--' }}</strong>
          </div>
          <div class="lg:col-span-2">
            <h3 class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">变更前</h3>
            <pre class="json-box">{{ formatJson(selectedAudit.beforeJson) }}</pre>
          </div>
          <div class="lg:col-span-2">
            <h3 class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">变更后</h3>
            <pre class="json-box">{{ formatJson(selectedAudit.afterJson) }}</pre>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, onMounted, reactive, ref } from 'vue'
import { AlertTriangle, CircleUserRound, RefreshCw, ShieldOff, Unlock } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import { opsApi, type AdminAuditLog, type MigrationStatus, type ModerationKeyword, type ModerationKeywordHit, type UserModerationState } from '@/api/ops'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'

const tabs = [
  { label: '迁移检查', value: 'migration' },
  { label: '敏感词', value: 'keywords' },
  { label: '命中日志', value: 'hits' },
  { label: '用户限制', value: 'users' },
  { label: '审计日志', value: 'audit' },
]

const activeTab = ref('migration')
const isLoading = ref(false)
const isSaving = ref(false)
const migration = ref<MigrationStatus | null>(null)
const keywords = ref<ModerationKeyword[]>([])
const hits = ref<ModerationKeywordHit[]>([])
const users = ref<UserModerationState[]>([])
const auditLogs = ref<AdminAuditLog[]>([])
const selectedAudit = ref<AdminAuditLog | null>(null)
const selectedKeyword = ref<ModerationKeyword | null>(null)
const auditCloseButton = ref<HTMLButtonElement | null>(null)
const keywordForm = reactive({ keyword: '', scope: 'ALL', matchType: 'CONTAINS', action: 'BLOCK', enabled: 1, remark: '' })
const hitFilters = reactive({ scope: '', action: '', keyword: '', uid: '' })
const auditFilters = reactive({ action: '', resourceType: '', operatorUid: '', startDate: '', endDate: '' })
const auditPage = ref(1)
const auditPageSize = ref(20)
const auditTotal = ref(0)
const auditHasMore = ref(false)
const moderationActionKey = ref('')
const userForm = reactive({ uid: '', muteHours: 0, banHours: 0, reason: '' })

const StatusList = defineComponent({
  props: { title: String, items: { type: Object, required: true } },
  setup(props) {
    return () => h('div', { class: 'status-list' }, [
      h('h3', { class: 'mb-3 font-semibold text-slate-900 dark:text-slate-100' }, props.title),
      ...Object.entries(props.items as Record<string, boolean>).map(([key, ok]) =>
        h('div', { class: 'status-row' }, [
          h('span', key),
          h('strong', { class: ok ? 'text-emerald-600' : 'text-amber-600' }, ok ? 'OK' : 'Missing'),
        ]),
      ),
    ])
  },
})

const refreshAll = async () => {
  isLoading.value = true
  try {
    const [migrationRes, keywordRes, hitRes, userRes, auditRes] = await Promise.allSettled([
      opsApi.migrationStatus(),
      opsApi.listModerationKeywords({ limit: 80 }),
      opsApi.listModerationHits({ limit: 80 }),
      opsApi.listModerationUsers(80),
      opsApi.pageAuditLogs(auditQueryParams()),
    ])
    if (migrationRes.status === 'fulfilled') migration.value = migrationRes.value.data
    if (keywordRes.status === 'fulfilled') keywords.value = keywordRes.value.data || []
    if (hitRes.status === 'fulfilled') hits.value = hitRes.value.data || []
    if (userRes.status === 'fulfilled') users.value = userRes.value.data || []
    if (auditRes.status === 'fulfilled') applyAuditPageResult(auditRes.value.data)
    if ([migrationRes, keywordRes, hitRes, userRes, auditRes].every((item) => item.status === 'rejected')) {
      toast.error('治理数据加载失败')
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '治理数据加载失败'))
  } finally {
    isLoading.value = false
  }
}

const auditQueryParams = () => ({
  action: auditFilters.action || undefined,
  resourceType: auditFilters.resourceType || undefined,
  operatorUid: auditFilters.operatorUid || undefined,
  startDate: auditFilters.startDate || undefined,
  endDate: auditFilters.endDate || undefined,
  page: auditPage.value,
  pageSize: auditPageSize.value,
})

const applyAuditPageResult = (pageData: Awaited<ReturnType<typeof opsApi.pageAuditLogs>>['data']) => {
  auditLogs.value = pageData?.items || []
  auditTotal.value = Number(pageData?.total ?? auditLogs.value.length)
  auditHasMore.value = Boolean(pageData?.hasMore)
}

const loadAuditLogs = async () => {
  isLoading.value = true
  try {
    const res = await opsApi.pageAuditLogs(auditQueryParams())
    applyAuditPageResult(res.data)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '审计日志加载失败'))
  } finally {
    isLoading.value = false
  }
}

const applyAuditFilters = async () => {
  auditPage.value = 1
  await loadAuditLogs()
}

const changeAuditPage = async (page: number) => {
  auditPage.value = Math.max(1, page)
  await loadAuditLogs()
}

const openAuditDetail = (item: AdminAuditLog) => {
  selectedAudit.value = item
}

const closeAuditDetail = () => {
  selectedAudit.value = null
}

useAccessibleDialog(() => Boolean(selectedAudit.value), {
  close: closeAuditDetail,
  initialFocus: auditCloseButton,
})

const loadHits = async () => {
  isLoading.value = true
  try {
    const res = await opsApi.listModerationHits({
      scope: hitFilters.scope || undefined,
      action: hitFilters.action || undefined,
      uid: hitFilters.uid || undefined,
      keyword: hitFilters.keyword || undefined,
      limit: 80,
    })
    hits.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '命中日志加载失败'))
  } finally {
    isLoading.value = false
  }
}

const selectKeyword = (item: ModerationKeyword) => {
  selectedKeyword.value = item
  keywordForm.keyword = item.keyword
  keywordForm.scope = item.scope || 'ALL'
  keywordForm.matchType = item.matchType || 'CONTAINS'
  keywordForm.action = item.action || 'BLOCK'
  keywordForm.enabled = item.enabled ?? 1
  keywordForm.remark = item.remark || ''
}

const resetKeyword = () => {
  selectedKeyword.value = null
  keywordForm.keyword = ''
  keywordForm.scope = 'ALL'
  keywordForm.matchType = 'CONTAINS'
  keywordForm.action = 'BLOCK'
  keywordForm.enabled = 1
  keywordForm.remark = ''
}

const saveKeyword = async () => {
  isSaving.value = true
  try {
    const payload = { ...keywordForm }
    selectedKeyword.value
      ? await opsApi.updateModerationKeyword(selectedKeyword.value.id, payload)
      : await opsApi.createModerationKeyword(payload)
    toast.success('关键词已保存')
    resetKeyword()
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关键词保存失败'))
  } finally {
    isSaving.value = false
  }
}

const saveUserState = async () => {
  isSaving.value = true
  try {
    await opsApi.saveModerationUser({
      uid: userForm.uid,
      muteHours: Number(userForm.muteHours || 0),
      banHours: Number(userForm.banHours || 0),
      reason: userForm.reason,
    })
    toast.success('用户限制已保存')
    userForm.uid = ''
    userForm.muteHours = 0
    userForm.banHours = 0
    userForm.reason = ''
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '用户限制保存失败'))
  } finally {
    isSaving.value = false
  }
}

const actionKey = (uid: UserModerationState['uid'], type: 'mute' | 'ban') => `${uid}:${type}`

const isFutureTime = (value?: string) => Boolean(value && new Date(value).getTime() > Date.now())

const isMuted = (item: UserModerationState) => isFutureTime(item.mutedUntil)

const isBanned = (item: UserModerationState) => isFutureTime(item.bannedUntil)

const replaceUserState = (state?: UserModerationState | null) => {
  if (!state) return
  const index = users.value.findIndex((item) => String(item.uid) === String(state.uid))
  if (index >= 0) {
    users.value.splice(index, 1, state)
  }
}

const clearUserMute = async (item: UserModerationState) => {
  moderationActionKey.value = actionKey(item.uid, 'mute')
  try {
    const res = await opsApi.clearModerationMute(item.uid)
    replaceUserState(res.data)
    toast.success('已解除禁言')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '解除禁言失败'))
  } finally {
    moderationActionKey.value = ''
  }
}

const clearUserBan = async (item: UserModerationState) => {
  moderationActionKey.value = actionKey(item.uid, 'ban')
  try {
    const res = await opsApi.clearModerationBan(item.uid)
    replaceUserState(res.data)
    toast.success('已解除封禁')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '解除封禁失败'))
  } finally {
    moderationActionKey.value = ''
  }
}

const formatTime = (value?: string) => value ? value.replace('T', ' ').slice(0, 19) : '--'

const formatJson = (value?: string) => {
  if (!value) return '--'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

onMounted(refreshAll)
</script>

<style scoped>
.primary-button,
.secondary-button,
.tab-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.primary-button {
  background: rgb(37 99 235);
  color: white;
}

.secondary-button,
.tab-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.text-button {
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.tabs {
  margin-bottom: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tab-active {
  border-color: rgb(79 70 229);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.metric-card,
.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
}

.metric-card span {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.metric-card strong {
  margin-top: 0.5rem;
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.panel-title {
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.row-card,
.status-list {
  width: 100%;
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
  text-align: left;
}

.user-limit-row {
  display: grid;
  gap: 1rem;
}

.user-limit-main {
  min-width: 0;
}

.user-brief {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  height: 2.5rem;
  width: 2.5rem;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  object-fit: cover;
}

.user-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(239 246 255);
  color: rgb(37 99 235);
}

.violation-card {
  margin-top: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.75rem;
}

.violation-card strong {
  font-size: 0.8125rem;
  color: rgb(51 65 85);
}

.user-limit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.danger-button:not(:disabled) {
  border-color: rgb(254 202 202);
  color: rgb(185 28 28);
}

.secondary-button:disabled,
.danger-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgb(226 232 240);
  padding: 0.65rem 0;
  font-size: 0.875rem;
}

.status-pill,
.meta-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-muted,
.meta-chip {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

.status-warn {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.field-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.65rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
}

.audit-filter-grid {
  display: grid;
  width: min(100%, 760px);
  gap: 0.5rem;
}

.pagination-bar {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

@media (min-width: 640px) {
  .audit-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .user-limit-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .user-limit-actions {
    justify-content: flex-end;
  }
}

@media (min-width: 1024px) {
  .audit-filter-grid {
    grid-template-columns: 1fr 1fr 1fr 150px 150px auto;
  }
}

.data-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid rgb(226 232 240);
  padding: 0.8rem;
  text-align: left;
  font-size: 0.875rem;
}

.detail-card {
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.detail-card span {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.detail-card strong {
  margin-top: 0.35rem;
  display: block;
  word-break: break-all;
  color: rgb(15 23 42);
}

.json-box {
  max-height: 260px;
  overflow: auto;
  border-radius: 0.5rem;
  background: rgb(15 23 42);
  padding: 1rem;
  color: rgb(226 232 240);
  font-size: 0.8125rem;
}

:global(.dark) .panel,
:global(.dark) .metric-card,
:global(.dark) .secondary-button,
:global(.dark) .tab-button,
:global(.dark) .field-input,
:global(.dark) .row-card,
:global(.dark) .status-list {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .panel-title,
:global(.dark) .metric-card strong {
  color: rgb(248 250 252);
}

:global(.dark) .row-card,
:global(.dark) .status-list {
  background: rgb(2 6 23);
}

:global(.dark) .violation-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .violation-card strong {
  color: rgb(226 232 240);
}

:global(.dark) .user-avatar {
  border-color: rgb(30 41 59);
}

:global(.dark) .user-avatar-fallback {
  background: rgb(30 41 59);
  color: rgb(147 197 253);
}

:global(.dark) .detail-card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .pagination-bar {
  border-top-color: rgb(30 41 59);
  color: rgb(148 163 184);
}

:global(.dark) .detail-card strong {
  color: rgb(248 250 252);
}
</style>
