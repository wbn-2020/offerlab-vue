<template>
  <div class="operations-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-black text-cyan-700 dark:text-cyan-300">社区运营编排</p>
          <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-white">运营整理入口</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            组织公开可见内容、精选池、运营位和专题/活动草稿。后端能力不可用时只展示不可用或降级视图，不提供本地假发布。
          </p>
        </div>
        <button type="button" class="secondary-button" :disabled="isLoading" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          刷新
        </button>
      </section>

      <section v-if="loadError" class="notice notice-warn mb-6">{{ loadError }}</section>
      <section v-if="!canEnter" class="notice notice-warn mb-6">
        当前账号不能进入运营编排后台。路由已要求管理员权限，本页也会在本地关闭操作入口。
      </section>

      <section class="operations-metric-grid mb-6 grid gap-4 md:grid-cols-4">
        <article class="metric-card">
          <span>候选池</span>
          <strong>{{ candidates.items.length }}</strong>
          <small>{{ sourceLabel(candidates) }}</small>
        </article>
        <article class="metric-card">
          <span>精选池</span>
          <strong>{{ curationPool.items.length }}</strong>
          <small>{{ sourceLabel(curationPool) }}</small>
        </article>
        <article class="metric-card">
          <span>运营位</span>
          <strong>{{ slots.items.length }}</strong>
          <small>{{ sourceLabel(slots) }}</small>
        </article>
        <article class="metric-card">
          <span>专题/活动草稿</span>
          <strong>{{ topics.items.length }}</strong>
          <small>{{ sourceLabel(topics) }}</small>
        </article>
      </section>

      <section class="notice mb-6">
        <ShieldCheck class="h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <strong>边界说明</strong>
          <p>运营入口只消费公开、合规、当前可见的社区内容。前台会明确展示为运营整理，不伪装成自然推荐，也不提供商业化分发能力。</p>
        </div>
      </section>

      <section class="tabs mb-6">
        <button v-for="tab in tabs" :key="tab.key" type="button" :class="['tab-button', activeTab === tab.key ? 'tab-active' : '']" @click="activeTab = tab.key">
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </section>

      <section v-if="activeTab === 'overview'" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>状态流转</h2>
              <p>覆盖草稿、预览、发布、下线、回滚。发布类操作需要管理员和运营权限，并通过风险确认。</p>
            </div>
          </div>
          <div class="status-flow">
            <div v-for="item in statusFlow" :key="item.status" class="status-flow-item">
              <span :class="['status-pill', statusClass(item.status)]">{{ item.label }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </article>

        <aside class="panel">
          <h2>能力接入</h2>
          <div class="capability-list">
            <div v-for="item in capabilityCards" :key="item.label" class="capability-row">
              <span :class="['status-dot', item.available ? 'status-dot-ok' : 'status-dot-warn']" />
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.text }}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section v-else-if="activeTab === 'candidates'" class="panel">
        <div class="panel-head">
          <div>
            <h2>运营候选池</h2>
            <p>{{ candidates.degraded ? '当前为公开内容查询降级视图，不能直接加入正式运营位。' : '来自运营候选接口，可进入精选池或专题编排。' }}</p>
          </div>
          <span :class="['status-pill', candidates.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(candidates) }}</span>
        </div>
        <div v-if="candidates.items.length" class="content-grid">
          <article v-for="item in candidates.items" :key="String(item.id)" class="content-card">
            <span class="meta-chip">{{ item.sourceType }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.summary || item.reason || '暂无摘要' }}</p>
            <div class="card-footer">
              <span>{{ item.governanceState || 'eligible' }}</span>
              <RouterLink v-if="item.href" :to="item.href">查看</RouterLink>
            </div>
            <div class="action-row">
              <button
                type="button"
                class="secondary-button"
                :disabled="isActing || !canAddCandidateToHomeFeatured(item)"
                @click="addSlotItemToHomeFeatured(item)"
              >
                加入 HOME_FEATURED
              </button>
              <button
                type="button"
                class="secondary-button"
                :disabled="isActing || !canAddCandidateToSelectedTopic(item)"
                @click="addCandidateToSelectedTopic(item)"
              >
                加入当前章节
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-panel">暂无可运营候选；接口未接通时页面不会生成本地候选。</div>
      </section>

      <section v-else-if="activeTab === 'curation'" class="panel">
        <div class="panel-head">
          <div>
            <h2>精选池</h2>
            <p>{{ curationPool.degraded ? '当前复用既有公开精选作为只读降级视图。' : '维护精选池条目、排序、状态和备注。' }}</p>
          </div>
          <span :class="['status-pill', curationPool.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(curationPool) }}</span>
        </div>
        <div v-if="curationPool.items.length" class="table-shell">
          <table class="data-table">
            <thead>
              <tr><th>内容</th><th>来源</th><th>状态</th><th>排序</th><th>备注</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in curationPool.items" :key="String(item.id)">
                <td><RouterLink v-if="item.href" :to="item.href">{{ item.title }}</RouterLink><span v-else>{{ item.title }}</span></td>
                <td>{{ item.sourceType }} {{ item.sourceId }}</td>
                <td><span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span></td>
                <td>{{ item.sortOrder ?? '--' }}</td>
                <td>{{ item.note || (item.fallback ? '降级只读' : '--') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-panel">暂无精选池条目；未接通后端时不提供本地维护表单。</div>
      </section>

      <section v-else-if="activeTab === 'slots'" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>运营位</h2>
              <p>P0 只支持少量社区运营入口，前台组件保留稳定尺寸、空状态和降级状态。</p>
            </div>
            <span :class="['status-pill', slots.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(slots) }}</span>
          </div>
          <div v-if="slots.items.length" class="slot-list">
            <article v-for="slot in slots.items" :key="String(slot.id)" class="row-card">
              <div class="row-main">
                <span :class="['status-pill', statusClass(slot.status)]">{{ statusLabel(slot.status) }}</span>
                <h3>{{ slot.title }}</h3>
                <p>{{ slot.description || slot.explanation || '暂无说明' }}</p>
                <small>{{ slot.slotCode }} · {{ slot.items.length }} 个条目</small>
                <ul v-if="slot.items.length" class="slot-item-list">
                  <li v-for="slotItem in slot.items" :key="String(slotItem.id)">
                    <div>
                      <strong>{{ slotItem.title }}</strong>
                      <span>{{ slotItem.contentType }} · #{{ slotItem.rank }} · {{ slotItem.reasonText || slotItem.reason || '无展示理由' }}</span>
                    </div>
                    <div class="action-row">
                      <button type="button" class="icon-button" :disabled="isActing || !canMutate('publish')" title="上移" @click="moveHomeFeaturedItem(slot, slotItem, slotItem.rank - 10)">
                        ↑
                      </button>
                      <button type="button" class="icon-button" :disabled="isActing || !canMutate('publish')" title="下移" @click="moveHomeFeaturedItem(slot, slotItem, slotItem.rank + 10)">
                        ↓
                      </button>
                      <button type="button" class="secondary-button" :disabled="isActing || !canMutate('publish')" @click="updateHomeFeaturedItemReason(slot, slotItem)">
                        改理由
                      </button>
                      <button type="button" class="secondary-button" :disabled="isActing || !canMutate('offline')" @click="removeSlotItemFromHomeFeatured(slot, slotItem)">
                        移除
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
              <div v-if="isSupportedOperationSlot(slot.slotCode)" class="action-row">
                <button type="button" class="icon-button" :disabled="isActing || !canMutate('publish')" :title="`发布 ${slot.slotCode}`" @click="publishHomeFeaturedSlot(slot)">
                  <UploadCloud class="h-4 w-4" />
                </button>
                <button type="button" class="icon-button" :disabled="isActing || !canMutate('offline')" :title="`下线 ${slot.slotCode}`" @click="offlineHomeFeaturedSlot(slot)">
                  <Archive class="h-4 w-4" />
                </button>
                <button type="button" class="icon-button" :disabled="isActing || !canMutate('rollback')" :title="`回滚 ${slot.slotCode}`" @click="rollbackHomeFeaturedSlot(slot)">
                  <RotateCcw class="h-4 w-4" />
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">运营位接口未接通或暂无配置；不会在后台伪造可发布配置。</div>
        </article>

        <aside class="panel">
          <h2>前台展示约束</h2>
          <ul class="constraint-list">
            <li>固定高度，条目数变化不会撑乱首页布局。</li>
            <li>接口失败时展示降级或空状态。</li>
            <li>只展示远端已发布条目，降级或接口失败时保持空态。</li>
            <li>不绕过治理过滤和用户反馈边界。</li>
          </ul>
        </aside>
      </section>

      <section v-else-if="activeTab === 'topics'" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>专题生命周期</h2>
              <p>支持草稿、预览、发布、下线、回滚和归档。DEGRADED 只展示为降级态，不作为专题持久状态保存。</p>
            </div>
            <span :class="['status-pill', topics.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(topics) }}</span>
          </div>
          <div v-if="topics.items.length" class="slot-list">
            <article v-for="topic in topics.items" :key="String(topic.id)" :class="['row-card', selectedTopicDraft?.id === topic.id ? 'row-card-active' : '']">
              <div class="row-main">
                <span :class="['status-pill', statusClass(topic.status)]">{{ statusLabel(topic.status) }}</span>
                <h3>{{ topic.title }}</h3>
                <p>{{ topic.summary || '暂无说明' }}</p>
                <small>{{ topic.activityType || 'TOPIC' }} · {{ topic.itemCount ?? 0 }} 条内容 · v{{ topic.currentVersion ?? 0 }}</small>
                <div v-if="isTopicReadOnly(topic)" class="inline-warning">只读：后端未接入、降级或示例数据不能保存、发布或触发反馈。</div>
              </div>
              <div class="action-row">
                <button type="button" class="secondary-button" :disabled="isActing" @click="selectTopicForEdit(topic)">
                  编辑
                </button>
                <button type="button" class="icon-button" :disabled="isActing || !canMutateTopic('preview', topic)" title="预览" @click="runTopicLifecycleAction(topic, 'preview')">
                  <Eye class="h-4 w-4" />
                </button>
                <button type="button" class="icon-button" :disabled="isActing || !canMutateTopic('publish', topic)" title="发布" @click="runTopicLifecycleAction(topic, 'publish')">
                  <UploadCloud class="h-4 w-4" />
                </button>
                <button type="button" class="icon-button" :disabled="isActing || !canMutateTopic('offline', topic)" title="下线" @click="runTopicLifecycleAction(topic, 'offline')">
                  <Archive class="h-4 w-4" />
                </button>
                <button type="button" class="icon-button" :disabled="isActing || !canMutateTopic('rollback', topic)" title="回滚" @click="runTopicLifecycleAction(topic, 'rollback')">
                  <RotateCcw class="h-4 w-4" />
                </button>
                <button type="button" class="secondary-button" :disabled="isActing || !canMutateTopic('archive', topic)" @click="runTopicLifecycleAction(topic, 'archive')">
                  归档
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">暂无专题/活动草稿；未接通后端时不提供看似可配置的假后台。</div>
        </article>

        <aside class="panel topic-editor">
          <div class="panel-head">
            <div>
              <h2>专题编辑</h2>
              <p>{{ selectedTopicDraft ? 'P0 只维护标题、摘要、章节、内容顺序和公开 reasonText。' : '选择一个专题后维护章节和候选收录。' }}</p>
            </div>
          </div>
          <div v-if="selectedTopicDraft" class="editor-stack">
            <label class="field-label">
              标题
              <input v-model="selectedTopicDraft.title" class="text-field" :disabled="selectedTopicReadOnly" />
            </label>
            <label class="field-label">
              摘要
              <textarea v-model="selectedTopicDraft.summary" class="text-field" rows="3" :disabled="selectedTopicReadOnly" />
            </label>
            <div class="editor-actions">
              <button type="button" class="secondary-button" :disabled="isActing || selectedTopicReadOnly" @click="addLocalTopicSection">新增章节</button>
              <button type="button" class="secondary-button" :disabled="isActing || selectedTopicReadOnly" @click="saveSelectedTopicDraft">保存草稿</button>
              <button type="button" class="secondary-button" :disabled="isActing || selectedTopicReadOnly" @click="runSelectedTopicPublishCheck">发布前检查</button>
            </div>
            <section v-if="topicPublishCheck" :class="['publish-check', topicPublishCheck.canPublish ? 'publish-check-ok' : 'publish-check-warn']">
              <strong>{{ topicPublishCheck.canPublish ? '检查通过，可进入发布确认' : '检查未通过，发布前需要处理' }}</strong>
              <ul>
                <li v-for="item in topicPublishCheck.items" :key="item.code">
                  <span :class="['status-pill', item.passed ? 'status-ok' : 'status-warn']">{{ item.passed ? '通过' : '阻断' }}</span>
                  {{ item.label }}：{{ item.detail }}
                </li>
              </ul>
            </section>
            <div v-if="selectedTopicReadOnly" class="inline-warning">当前专题为只读态：fallback/demo/降级数据只能查看，不能保存、发布或触发真实反馈。</div>
            <label v-if="sortedTopicSections.length" class="field-label">
              候选加入章节
              <select v-model="selectedSectionKey" class="text-field" :disabled="selectedTopicReadOnly">
                <option v-for="section in sortedTopicSections" :key="section.key" :value="section.key">{{ section.title }}</option>
              </select>
            </label>
            <div v-if="sortedTopicSections.length" class="section-list">
              <section v-for="section in sortedTopicSections" :key="section.key" class="topic-section-card">
                <div class="section-head">
                  <div>
                    <span :class="['status-pill', statusClass(section.status)]">{{ statusLabel(section.status) }}</span>
                    <h3>{{ section.title }}</h3>
                    <small>{{ section.key }} · #{{ section.sortOrder }} · {{ section.items.length }} 条内容</small>
                  </div>
                  <div class="action-row">
                    <button type="button" class="icon-button" :disabled="isActing || selectedTopicReadOnly" title="章节上移" @click="moveTopicSection(section, -10)">↑</button>
                    <button type="button" class="icon-button" :disabled="isActing || selectedTopicReadOnly" title="章节下移" @click="moveTopicSection(section, 10)">↓</button>
                  </div>
                </div>
                <ul v-if="section.items.length" class="topic-item-list">
                  <li v-for="item in sortedSectionItems(section)" :key="String(item.id)">
                    <div>
                      <strong>{{ item.title }}</strong>
                      <span>{{ item.sourceType }} {{ item.sourceId }} · #{{ item.sortOrder }} · {{ item.reasonText || '缺少公开理由' }}</span>
                    </div>
                    <div class="action-row">
                      <button type="button" class="icon-button" :disabled="isActing || selectedTopicReadOnly" title="内容上移" @click="moveTopicItem(section, item, -10)">↑</button>
                      <button type="button" class="icon-button" :disabled="isActing || selectedTopicReadOnly" title="内容下移" @click="moveTopicItem(section, item, 10)">↓</button>
                      <button type="button" class="secondary-button" :disabled="isActing || selectedTopicReadOnly" @click="updateTopicItemReason(section, item)">改 reasonText</button>
                    </div>
                  </li>
                </ul>
                <div v-else class="empty-panel">空章节可以保存草稿，但发布前会被检查或过滤。</div>
              </section>
            </div>
            <div v-else class="empty-panel">还没有章节。P0 不做复杂 CMS，可先新增章节并从候选池收录公开内容。</div>
          </div>
          <div v-else class="empty-panel">从左侧选择专题后，可以编辑章节、排序、公开理由，并进入预览/发布/下线/回滚/归档确认。</div>
        </aside>
      </section>

      <section v-else class="panel">
        <div class="panel-head">
          <div>
            <h2>审计留痕</h2>
            <p>展示运营编排最近的管理动作，便于追溯内容进入入口的来源。</p>
          </div>
          <span :class="['status-pill', auditLogs.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(auditLogs) }}</span>
        </div>
        <div v-if="auditLogs.items.length" class="table-shell">
          <table class="data-table">
            <thead>
              <tr><th>动作</th><th>资源</th><th>操作人</th><th>备注</th><th>时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in auditLogs.items" :key="String(item.id)">
                <td>{{ item.action }}</td>
                <td>{{ item.resourceType }} {{ item.resourceId || '' }}</td>
                <td>{{ item.operatorUid || '--' }}</td>
                <td>{{ item.remark || '--' }}</td>
                <td>{{ item.createTime || '--' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-panel">暂无可展示审计记录；审计接口不可用时关闭为只读空态。</div>
      </section>
    </main>

    <RiskConfirmDialog
      :state="riskConfirmState"
      @confirm="resolveRiskConfirm"
      @cancel="cancelRiskConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Archive, Eye, RefreshCw, RotateCcw, ShieldCheck, UploadCloud } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import RiskConfirmDialog from '@/components/admin/RiskConfirmDialog.vue'
import { useRiskConfirm, type RiskConfirmRequest } from '@/composables/useRiskConfirm'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import {
  HOME_FEATURED_SLOT_CODE,
  PUBLIC_OPERATION_SLOT_CODES,
  operationsApi,
  type CurationPoolItem,
  type OperationAction,
  type OperationAuditLog,
  type OperationCandidate,
  type OperationCapability,
  type OperationResourceKind,
  type OperationSlot,
  type OperationSlotItem,
  type OperationStatus,
  type OperationTopic,
  type OperationTopicItem,
  type OperationTopicPublishCheck,
  type OperationTopicSection,
} from '@/api/operations'
import { canAccessOpsOrchestrationAdmin, canMutateOpsOrchestration, type OpsOrchestrationAction, type OpsOrchestrationPermissions } from '@/utils/opsOrchestrationGuard'

const emptyCapability = <T,>(): OperationCapability<T> => ({
  available: false,
  source: 'unavailable',
  degraded: true,
  items: [],
})

const tabs = [
  { key: 'overview', label: '总览', icon: ShieldCheck },
  { key: 'candidates', label: '候选池', icon: Eye },
  { key: 'curation', label: '精选池', icon: UploadCloud },
  { key: 'slots', label: '运营位', icon: Archive },
  { key: 'topics', label: '专题活动', icon: RotateCcw },
  { key: 'audit', label: '审计', icon: ShieldCheck },
] as const

const statusFlow = [
  { status: 'DRAFT', label: '草稿', title: '编辑中', description: '只能在后台查看，不进入前台展示。' },
  { status: 'PREVIEW', label: '预览', title: '上线前检查', description: '用于运营和治理人员确认内容边界。' },
  { status: 'PUBLISHED', label: '发布', title: '前台可见', description: '只展示公开、合规、仍然可见的条目。' },
  { status: 'OFFLINE', label: '下线', title: '停止展示', description: '配置保留，前台不再读取。' },
  { status: 'ROLLBACK', label: '回滚', title: '恢复快照', description: '从已发布快照恢复到上一个稳定版本。' },
  { status: 'ARCHIVED', label: '归档', title: '公开复访', description: '保留最后公开快照，不再进入活跃运营队列。' },
  { status: 'DEGRADED', label: '降级', title: '只读展示', description: '只表达本次响应不完整，不能保存为生命周期状态。' },
]

const activeTab = ref<(typeof tabs)[number]['key']>('overview')
const isLoading = ref(false)
const isActing = ref(false)
const loadError = ref('')
const permissions = ref<MyAdminPermissions | null>(null)
const candidates = ref<OperationCapability<OperationCandidate>>(emptyCapability())
const curationPool = ref<OperationCapability<CurationPoolItem>>(emptyCapability())
const slots = ref<OperationCapability<OperationSlot>>(emptyCapability())
const topics = ref<OperationCapability<OperationTopic>>(emptyCapability())
const auditLogs = ref<OperationCapability<OperationAuditLog>>(emptyCapability())
const selectedTopicDraft = ref<OperationTopic | null>(null)
const selectedSectionKey = ref('')
const topicPublishCheck = ref<OperationTopicPublishCheck | null>(null)
const { riskConfirmState, confirmRisk, resolveRiskConfirm, cancelRiskConfirm } = useRiskConfirm()

const opsPermissions = computed(() => permissions.value as OpsOrchestrationPermissions | null)
const canEnter = computed(() => canAccessOpsOrchestrationAdmin(permissions.value))
const homeFeaturedSlot = computed(() => slots.value.items.find((slot) => slot.slotCode === HOME_FEATURED_SLOT_CODE) || null)
const isSupportedOperationSlot = (slotCode: string) => PUBLIC_OPERATION_SLOT_CODES.includes(slotCode as typeof PUBLIC_OPERATION_SLOT_CODES[number])
const sortedTopicSections = computed(() => (
  [...(selectedTopicDraft.value?.sections || [])].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
))
const selectedTopicReadOnly = computed(() => selectedTopicDraft.value ? isTopicReadOnly(selectedTopicDraft.value) : true)
const capabilityCards = computed(() => [
  { label: '候选池', available: candidates.value.available, text: sourceLabel(candidates.value) },
  { label: '精选池', available: curationPool.value.available, text: sourceLabel(curationPool.value) },
  { label: '运营位', available: slots.value.available, text: sourceLabel(slots.value) },
  { label: '专题/活动', available: topics.value.available, text: sourceLabel(topics.value) },
  { label: '审计', available: auditLogs.value.available, text: sourceLabel(auditLogs.value) },
])

function sourceLabel<T>(value: OperationCapability<T>) {
  if (value.source === 'remote') return '后端已接入'
  if (value.source === 'public-content-query') return '公开内容降级'
  if (value.source === 'legacy-featured') return '既有精选降级'
  if (value.source === 'fallback-demo') return '示例/fallback'
  return value.fallbackReason || '能力未接入'
}

function statusLabel(status?: OperationStatus) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PREVIEW: '预览',
    PUBLISHED: '已发布',
    OFFLINE: '已下线',
    ARCHIVED: '已归档',
    DEGRADED: '降级展示',
    ACTIVE: '启用',
    PAUSED: '暂停',
    HIDDEN: '隐藏',
  }
  return map[String(status || '').toUpperCase()] || status || '--'
}

function statusClass(status?: OperationStatus) {
  const value = String(status || '').toUpperCase()
  if (value === 'PUBLISHED' || value === 'ACTIVE') return 'status-ok'
  if (value === 'PREVIEW') return 'status-info'
  if (value === 'ARCHIVED') return 'status-info'
  if (value === 'OFFLINE' || value === 'PAUSED' || value === 'HIDDEN' || value === 'DEGRADED') return 'status-warn'
  return 'status-muted'
}

const refreshAll = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const [permissionRes, candidateRes, curationRes, slotRes, topicRes, auditRes] = await Promise.allSettled([
      opsApi.myPermissions({ skipAuthRedirect: true }),
      operationsApi.listOperationCandidates({ limit: 20 }),
      operationsApi.listCurationPool({ limit: 20 }),
      operationsApi.listOperationSlots(),
      operationsApi.listOperationTopics(),
      operationsApi.listOperationAudit({ limit: 20 }),
    ])
    if (permissionRes.status === 'fulfilled') permissions.value = permissionRes.value.data
    if (candidateRes.status === 'fulfilled') candidates.value = candidateRes.value.data || emptyCapability()
    if (curationRes.status === 'fulfilled') curationPool.value = curationRes.value.data || emptyCapability()
    if (slotRes.status === 'fulfilled') slots.value = slotRes.value.data || emptyCapability()
    if (topicRes.status === 'fulfilled') topics.value = topicRes.value.data || emptyCapability()
    if (auditRes.status === 'fulfilled') auditLogs.value = auditRes.value.data || emptyCapability()
    const rejected = [candidateRes, curationRes, slotRes, topicRes, auditRes].find((item) => item.status === 'rejected')
    if (rejected?.status === 'rejected') loadError.value = rejected.reason instanceof Error ? rejected.reason.message : '运营编排能力读取失败'
  } finally {
    isLoading.value = false
  }
}

const canMutate = (action: OpsOrchestrationAction) => canMutateOpsOrchestration(opsPermissions.value, action)

const permissionActionFor = (action: OperationAction): OpsOrchestrationAction => {
  if (action === 'offline' || action === 'archive') return 'offline'
  if (action === 'rollback') return 'rollback'
  return 'publish'
}

const cloneTopic = (topic: OperationTopic): OperationTopic => JSON.parse(JSON.stringify({
  ...topic,
  sections: topic.sections || [],
}))

const isTopicReadOnly = (topic: OperationTopic) => (
  !topics.value.available
  || topics.value.degraded
  || Boolean(topic.fallback || topic.degraded || topic.example)
  || (topic.source !== undefined && topic.source !== 'remote')
)

const canMutateTopic = (action: OperationAction, topic: OperationTopic | null = selectedTopicDraft.value) => {
  if (!topic || isActing.value || isTopicReadOnly(topic)) return false
  if (action === 'preview') return canEnter.value
  return canMutate(permissionActionFor(action))
}

const sortedSectionItems = (section: OperationTopicSection) => (
  [...(section.items || [])].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
)

const nextTopicSortOrder = (items: Array<{ sortOrder?: number }>) => {
  const maxOrder = Math.max(0, ...items.map((item) => Number(item.sortOrder) || 0))
  return maxOrder + 10
}

const selectTopicForEdit = async (topic: OperationTopic) => {
  selectedTopicDraft.value = cloneTopic(topic)
  selectedSectionKey.value = selectedTopicDraft.value.sections?.[0]?.key || ''
  topicPublishCheck.value = topic.publishCheck || null
  if (isTopicReadOnly(topic)) return
  isActing.value = true
  try {
    const res = await operationsApi.getOperationTopic(topic.id)
    const detail = res.data || topic
    selectedTopicDraft.value = cloneTopic(detail)
    selectedSectionKey.value = selectedTopicDraft.value.sections?.[0]?.key || ''
    topicPublishCheck.value = detail.publishCheck || null
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取专题详情失败'
  } finally {
    isActing.value = false
  }
}

const addLocalTopicSection = () => {
  if (!selectedTopicDraft.value || selectedTopicReadOnly.value) return
  const title = window.prompt('新增章节标题', '专题章节')
  if (title === null) return
  const sections = selectedTopicDraft.value.sections || []
  const sortOrder = nextTopicSortOrder(sections)
  const key = `section-${Date.now()}`
  selectedTopicDraft.value.sections = [
    ...sections,
    {
      key,
      title: title.trim() || '专题章节',
      status: 'ACTIVE',
      sortOrder,
      items: [],
    },
  ]
  selectedSectionKey.value = key
  topicPublishCheck.value = null
}

const moveTopicSection = (section: OperationTopicSection, delta: number) => {
  if (selectedTopicReadOnly.value) return
  section.sortOrder = Math.max(1, Number(section.sortOrder || 0) + delta)
  topicPublishCheck.value = null
}

const moveTopicItem = (section: OperationTopicSection, item: OperationTopicItem, delta: number) => {
  if (selectedTopicReadOnly.value) return
  item.sortOrder = Math.max(1, Number(item.sortOrder || 0) + delta)
  topicPublishCheck.value = null
}

const updateTopicItemReason = (section: OperationTopicSection, item: OperationTopicItem) => {
  if (selectedTopicReadOnly.value) return
  const reasonText = window.prompt('更新公开 reasonText', item.reasonText || '')
  if (reasonText === null) return
  item.reasonText = reasonText.trim()
  section.status = section.status || 'ACTIVE'
  topicPublishCheck.value = null
}

const saveSelectedTopicDraft = async () => {
  if (!selectedTopicDraft.value || selectedTopicReadOnly.value || isActing.value) return
  isActing.value = true
  try {
    const res = await operationsApi.saveOperationTopicDraft(selectedTopicDraft.value)
    selectedTopicDraft.value = cloneTopic(res.data || selectedTopicDraft.value)
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '保存专题草稿失败'
  } finally {
    isActing.value = false
  }
}

const runSelectedTopicPublishCheck = async () => {
  if (!selectedTopicDraft.value || selectedTopicReadOnly.value || isActing.value) return
  isActing.value = true
  try {
    const res = await operationsApi.runTopicPublishCheck(selectedTopicDraft.value.id)
    topicPublishCheck.value = res.data
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '发布前检查失败'
  } finally {
    isActing.value = false
  }
}

const nextHomeFeaturedRank = (slot: OperationSlot) => {
  const maxRank = Math.max(0, ...slot.items.map((item) => Number(item.rank) || 0))
  return maxRank + 10
}

const canAddCandidateToHomeFeatured = (item: OperationCandidate) => (
  candidates.value.available
  && !candidates.value.degraded
  && slots.value.available
  && !slots.value.degraded
  && Boolean(homeFeaturedSlot.value)
  && homeFeaturedSlot.value?.source === 'remote'
  && item.governanceState !== 'filtered'
  && canMutate('publish')
)

const canAddCandidateToSelectedTopic = (item: OperationCandidate) => (
  Boolean(selectedTopicDraft.value)
  && Boolean(selectedSectionKey.value)
  && candidates.value.available
  && !candidates.value.degraded
  && !selectedTopicReadOnly.value
  && item.sourceType === 'POST'
  && item.governanceState !== 'filtered'
  && !item.fallback
  && canMutate('publish')
)

const actionLabel = (action: OperationAction) => {
  const labels: Record<OperationAction, string> = {
    preview: '预览',
    publish: '发布',
    offline: '下线',
    rollback: '回滚',
    archive: '归档',
  }
  return labels[action]
}

const requireRiskConfirm = (request: RiskConfirmRequest) => confirmRisk(request)

const addSlotItemToHomeFeatured = async (item: OperationCandidate) => {
  const slot = homeFeaturedSlot.value
  if (!slot || !canAddCandidateToHomeFeatured(item) || isActing.value) return
  const note = window.prompt('记录加入 HOME_FEATURED 的展示理由', item.reason || '社区精选内容')
  if (note === null) return
  isActing.value = true
  try {
    await operationsApi.addSlotItemToHomeFeatured(slot.id, item.sourceType, item.sourceId, note, nextHomeFeaturedRank(slot))
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加入 HOME_FEATURED 失败'
  } finally {
    isActing.value = false
  }
}

const addCandidateToSelectedTopic = async (item: OperationCandidate) => {
  const topic = selectedTopicDraft.value
  const section = topic?.sections?.find((candidateSection) => candidateSection.key === selectedSectionKey.value)
  if (!topic || !section || !canAddCandidateToSelectedTopic(item) || isActing.value) return
  const reasonText = window.prompt('确认公开 reasonText。该理由会进入发布快照，可被前台展示。', item.reasonText || item.reason || '')
  if (reasonText === null) return
  isActing.value = true
  try {
    const res = await operationsApi.addTopicCandidateToSection(topic.id, section.key, item, reasonText.trim(), nextTopicSortOrder(section.items))
    if (res.data) {
      section.items.push(res.data)
      topicPublishCheck.value = null
      await operationsApi.saveOperationTopicDraft(topic)
    }
    await selectTopicForEdit(topic)
    activeTab.value = 'topics'
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加入专题章节失败'
  } finally {
    isActing.value = false
  }
}

const removeSlotItemFromHomeFeatured = async (slot: OperationSlot, item: OperationSlotItem) => {
  if (isActing.value || !canMutate('offline')) return
  const note = await requireRiskConfirm({
    title: `移除 ${slot.slotCode} 条目`,
    level: 'critical',
    reversible: true,
    impactCount: 1,
    objects: [`${slot.slotCode}:${item.contentId}`],
    context: ['从公开运营位移除该条目', '写入后台审计日志'],
    confirmText: '移除',
    requireNote: true,
    notePlaceholder: '记录移除原因',
    confirmationPhrase: 'CONFIRM',
  })
  if (note === null) return
  isActing.value = true
  try {
    await operationsApi.removeSlotItemFromHomeFeatured(item.id, note)
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : `移除 ${slot.slotCode} 条目失败`
  } finally {
    isActing.value = false
  }
}

const updateHomeFeaturedItemReason = async (slot: OperationSlot, item: OperationSlotItem) => {
  if (isActing.value || !isSupportedOperationSlot(slot.slotCode) || !canMutate('publish')) return
  const reasonText = window.prompt(`更新 ${slot.slotCode} 展示理由`, item.reasonText || item.reason || '')
  if (reasonText === null) return
  isActing.value = true
  try {
    await operationsApi.updateHomeFeaturedItemReason(slot.id, item, reasonText)
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : `更新 ${slot.slotCode} 展示理由失败`
  } finally {
    isActing.value = false
  }
}

const moveHomeFeaturedItem = async (slot: OperationSlot, item: OperationSlotItem, rank: number) => {
  if (isActing.value || !isSupportedOperationSlot(slot.slotCode) || !canMutate('publish')) return
  isActing.value = true
  try {
    await operationsApi.moveHomeFeaturedItem(slot.id, item, Math.max(1, rank))
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : `调整 ${slot.slotCode} 排序失败`
  } finally {
    isActing.value = false
  }
}

const runHomeFeaturedSlotLifecycle = async (slot: OperationSlot, action: OpsOrchestrationAction) => {
  if (isActing.value || !isSupportedOperationSlot(slot.slotCode) || !canMutate(action)) return
  const note = await requireRiskConfirm({
    title: `${actionLabel(action)} ${slot.slotCode}`,
    level: 'critical',
    reversible: action !== 'publish',
    impactCount: slot.items.length,
    objects: [`${slot.slotCode}:${slot.id}`],
    context: ['改变公开运营位的展示状态', '写入后台审计日志'],
    confirmText: actionLabel(action),
    requireNote: true,
    notePlaceholder: `记录本次 ${slot.slotCode} 操作原因`,
    confirmationPhrase: 'CONFIRM',
  })
  if (note === null) return
  isActing.value = true
  try {
    if (action === 'publish') await operationsApi.publishHomeFeaturedSlot(slot.id, note, opsPermissions.value)
    if (action === 'offline') await operationsApi.offlineHomeFeaturedSlot(slot.id, note, opsPermissions.value)
    if (action === 'rollback') await operationsApi.rollbackHomeFeaturedSlot(slot.id, note, opsPermissions.value)
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : `${actionLabel(action)} ${slot.slotCode} 失败`
  } finally {
    isActing.value = false
  }
}

const publishHomeFeaturedSlot = (slot: OperationSlot) => runHomeFeaturedSlotLifecycle(slot, 'publish')
const offlineHomeFeaturedSlot = (slot: OperationSlot) => runHomeFeaturedSlotLifecycle(slot, 'offline')
const rollbackHomeFeaturedSlot = (slot: OperationSlot) => runHomeFeaturedSlotLifecycle(slot, 'rollback')

const runLifecycleAction = async (resourceKind: OperationResourceKind, resourceId: string | number, action: OperationAction) => {
  if (isActing.value) return
  const permissionAction = permissionActionFor(action)
  if (action !== 'preview' && !canMutateOpsOrchestration(opsPermissions.value, permissionAction)) {
    loadError.value = '当前账号缺少运营编排变更权限'
    return
  }
  const note = await requireRiskConfirm({
    title: `${actionLabel(action)}专题/活动`,
    level: action === 'preview' ? 'medium' : 'critical',
    reversible: action !== 'publish' && action !== 'archive',
    impactCount: 1,
    objects: [`${resourceKind}:${resourceId}`],
    context: [
      action === 'publish' ? '发布前以后端公开可见性和治理过滤为准' : '改变专题/活动在前台的展示状态',
      action === 'archive' ? '归档会保留最后公开快照，但不做 ARCHIVED -> restore 完整恢复链路' : '写入后台审计日志',
    ],
    confirmText: actionLabel(action),
    requireNote: action !== 'preview',
    notePlaceholder: '记录本次运营编排操作原因',
    confirmationPhrase: action === 'preview' ? undefined : 'CONFIRM',
  })
  if (note === null) return
  isActing.value = true
  try {
    await operationsApi.runLifecycleAction(resourceKind, resourceId, action, note, opsPermissions.value)
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '生命周期操作失败'
  } finally {
    isActing.value = false
  }
}

const runTopicLifecycleAction = async (topic: OperationTopic, action: OperationAction) => {
  if (!canMutateTopic(action, topic)) return
  if (action === 'publish' && selectedTopicDraft.value?.id === topic.id && topicPublishCheck.value && !topicPublishCheck.value.canPublish) {
    loadError.value = '发布前检查未通过，请先处理阻断项'
    return
  }
  await runLifecycleAction('topic', topic.id, action)
  if (selectedTopicDraft.value?.id === topic.id) await selectTopicForEdit(topic)
}

onMounted(refreshAll)
</script>

<style scoped>
.operations-page {
  background: rgb(248 250 252);
}

.metric-card,
.panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 14px 32px rgb(15 23 42 / 0.04);
}

.metric-card {
  padding: 1rem;
}

.metric-card span,
.metric-card small {
  display: block;
  color: rgb(100 116 139);
}

.metric-card strong {
  display: block;
  margin: 0.3rem 0;
  font-size: 1.8rem;
  color: rgb(15 23 42);
}

.panel {
  padding: 1rem;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel h2,
.row-card h3,
.content-card h3 {
  font-weight: 900;
  color: rgb(15 23 42);
}

.panel p,
.row-card p,
.content-card p,
.constraint-list {
  color: rgb(71 85 105);
  line-height: 1.6;
}

.notice {
  display: flex;
  gap: 0.75rem;
  border: 1px solid rgb(187 247 208);
  border-radius: 0.75rem;
  background: rgb(240 253 244);
  padding: 1rem;
  color: rgb(22 101 52);
}

.notice-warn {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
  color: rgb(146 64 14);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tab-button,
.secondary-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.625rem;
  background: white;
  color: rgb(15 23 42);
  font-weight: 800;
}

.tab-button,
.secondary-button {
  padding: 0.55rem 0.8rem;
}

.tab-active {
  border-color: rgb(14 165 233);
  background: rgb(240 249 255);
  color: rgb(3 105 161);
}

.icon-button {
  width: 2.2rem;
  height: 2.2rem;
}

.icon-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.status-flow,
.capability-list,
.slot-list,
.editor-stack,
.section-list {
  display: grid;
  gap: 0.75rem;
}

.status-flow {
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.status-flow-item,
.capability-row,
.row-card,
.content-card,
.empty-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.9rem;
}

.capability-row,
.row-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.row-card-active {
  border-color: rgb(14 165 233);
  background: rgb(240 249 255);
}

.row-main {
  min-width: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.75rem;
}

.card-footer,
.action-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.card-footer {
  justify-content: space-between;
}

.meta-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 900;
}

.meta-chip,
.status-muted {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.status-info {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-dot {
  margin-top: 0.35rem;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: rgb(245 158 11);
}

.status-dot-ok {
  background: rgb(16 185 129);
}

.status-dot-warn {
  background: rgb(245 158 11);
}

.table-shell {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 46rem;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid rgb(226 232 240);
  padding: 0.65rem;
  text-align: left;
  vertical-align: top;
}

.data-table th {
  color: rgb(71 85 105);
  font-size: 0.8rem;
}

.constraint-list {
  padding-left: 1rem;
}

.topic-editor {
  align-self: start;
}

.field-label {
  display: grid;
  gap: 0.35rem;
  color: rgb(51 65 85);
  font-size: 0.85rem;
  font-weight: 900;
}

.text-field {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.6rem 0.7rem;
  color: rgb(15 23 42);
  font-weight: 700;
}

.text-field:disabled {
  background: rgb(241 245 249);
  color: rgb(100 116 139);
}

.editor-actions,
.section-head,
.topic-item-list li {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.topic-section-card,
.publish-check {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.topic-section-card h3 {
  margin-top: 0.35rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.topic-item-list {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.75rem;
}

.topic-item-list li {
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.65rem;
}

.topic-item-list span,
.inline-warning {
  display: block;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  line-height: 1.5;
}

.inline-warning {
  margin-top: 0.5rem;
  color: rgb(146 64 14);
}

.publish-check ul {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.6rem;
}

.publish-check-ok {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}

.publish-check-warn {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
}

@media (max-width: 760px) {
  .capability-row,
  .row-card,
  .panel-head,
  .editor-actions,
  .section-head,
  .topic-item-list li {
    flex-direction: column;
  }
}
</style>
