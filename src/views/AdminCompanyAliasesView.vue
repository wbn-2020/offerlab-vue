<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Question Ops</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">公司别名维护</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            维护公司简称、品牌名和历史名称，让题库搜索、公司备战包和推荐目标指向同一个标准公司名。
          </p>
        </div>
        <RouterLink to="/admin/questions" class="secondary-button">
          <ListChecks class="h-4 w-4" />
          题目审核
        </RouterLink>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1fr_420px]">
        <article class="panel">
          <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <form class="flex flex-1 gap-2" @submit.prevent="loadAliases">
              <input v-model.trim="keyword" class="field-input" placeholder="搜索标准公司名或别名" />
              <button type="submit" class="secondary-button" :disabled="isLoading">
                <Search class="h-4 w-4" />
                搜索
              </button>
            </form>
            <button type="button" class="secondary-button" :disabled="isLoading" @click="loadAliases">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
              刷新
            </button>
          </div>

          <div v-if="isLoading" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载别名...
          </div>
          <EmptyState v-else-if="aliases.length === 0" title="暂无公司别名" description="新增别名后，公司备战页会自动按标准公司名聚合。" />
          <div v-else class="alias-list">
            <button
              v-for="item in aliases"
              :key="item.id"
              type="button"
              :class="['alias-row', selectedAlias?.id === item.id ? 'alias-row-active' : '']"
              @click="selectAlias(item)"
            >
              <div class="min-w-0 text-left">
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['status-pill', item.status === 1 ? 'status-ok' : 'status-muted']">
                    {{ item.status === 1 ? '启用' : '停用' }}
                  </span>
                  <span class="canonical">{{ item.canonicalCompany }}</span>
                </div>
                <p class="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
                  别名：{{ item.alias }} · 更新 {{ formatTime(item.updateTime) }}
                </p>
              </div>
            </button>
          </div>
        </article>

        <aside class="panel h-fit">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">
              {{ selectedAlias ? '编辑别名' : '新增别名' }}
            </h2>
            <button v-if="selectedAlias" type="button" class="text-button" @click="resetForm">新增</button>
          </div>

          <form class="space-y-4" @submit.prevent="saveAlias">
            <label class="field-label">
              标准公司名
              <input v-model.trim="form.canonicalCompany" class="field-input" placeholder="例如 字节跳动" />
            </label>
            <label class="field-label">
              别名
              <input v-model.trim="form.alias" class="field-input" placeholder="例如 ByteDance / 字节" />
            </label>
            <label class="field-label">
              状态
              <select v-model.number="form.status" class="field-input">
                <option :value="1">启用</option>
                <option :value="0">停用</option>
              </select>
            </label>

            <div class="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="submit"
                class="primary-button"
                :disabled="isSaving || form.canonicalCompany.length < 2 || form.alias.length < 2"
              >
                <Save class="h-4 w-4" />
                保存
              </button>
              <button
                v-if="selectedAlias"
                type="button"
                class="secondary-button"
                :disabled="isSaving"
                @click="toggleStatus"
              >
                <Power class="h-4 w-4" />
                {{ selectedAlias.status === 1 ? '停用' : '启用' }}
              </button>
            </div>
          </form>
        </aside>

        <article class="panel lg:col-span-2">
          <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">候选推荐</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">从面经和题库公司字段聚合相似名称，确认后写入别名表。</p>
            </div>
            <button type="button" class="secondary-button" :disabled="isCandidateLoading" @click="loadCandidates">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isCandidateLoading }" />
              刷新候选
            </button>
          </div>
          <div v-if="isCandidateLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">正在分析候选...</div>
          <EmptyState v-else-if="candidates.length === 0" title="暂无候选" description="当面经或题库中出现疑似同义公司名时，这里会推荐给运营确认。" />
          <div v-else class="candidate-grid">
            <article v-for="item in candidates" :key="`${item.canonicalCompany}-${item.alias}`" class="candidate-card">
              <div class="flex flex-wrap items-center gap-2">
                <span class="status-pill status-ok">{{ item.canonicalCompany }}</span>
                <ArrowRight class="h-4 w-4 text-slate-400" />
                <strong>{{ item.alias }}</strong>
              </div>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ item.reason || '疑似同一家公司名称' }}</p>
              <div class="mt-3 grid gap-2 sm:grid-cols-4">
                <div class="candidate-stat"><span>题库</span><strong>{{ item.questionSampleCount || 0 }}</strong></div>
                <div class="candidate-stat"><span>面经</span><strong>{{ item.postSampleCount || 0 }}</strong></div>
                <div class="candidate-stat"><span>标准名样本</span><strong>{{ item.canonicalSampleCount || 0 }}</strong></div>
                <div class="candidate-stat"><span>别名样本</span><strong>{{ item.aliasSampleCount || 0 }}</strong></div>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <button type="button" class="primary-button" :disabled="isSaving" @click="acceptCandidate(item)">
                  <Save class="h-4 w-4" />
                  一键加入
                </button>
                <button type="button" class="secondary-button" :disabled="isSaving" @click="fillCandidate(item)">
                  填入表单
                </button>
              </div>
            </article>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, ListChecks, Power, RefreshCw, Save, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { getErrorMessage } from '@/api/client'
import { opsApi, type CompanyAlias, type CompanyAliasCandidate } from '@/api/ops'

const aliases = ref<CompanyAlias[]>([])
const candidates = ref<CompanyAliasCandidate[]>([])
const selectedAlias = ref<CompanyAlias | null>(null)
const keyword = ref('')
const isLoading = ref(false)
const isCandidateLoading = ref(false)
const isSaving = ref(false)
const form = reactive({
  canonicalCompany: '',
  alias: '',
  status: 1,
})

const loadAliases = async () => {
  isLoading.value = true
  try {
    const res = await opsApi.listCompanyAliases({ keyword: keyword.value || undefined, limit: 80 })
    aliases.value = res.data || []
    if (selectedAlias.value) {
      const refreshed = aliases.value.find((item) => item.id === selectedAlias.value?.id)
      refreshed ? selectAlias(refreshed) : resetForm()
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '公司别名加载失败'))
    aliases.value = []
  } finally {
    isLoading.value = false
  }
}

const loadCandidates = async () => {
  isCandidateLoading.value = true
  try {
    const res = await opsApi.listCompanyAliasCandidates({ limit: 20 })
    candidates.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '公司别名候选加载失败'))
    candidates.value = []
  } finally {
    isCandidateLoading.value = false
  }
}

const selectAlias = (item: CompanyAlias) => {
  selectedAlias.value = item
  form.canonicalCompany = item.canonicalCompany
  form.alias = item.alias
  form.status = item.status
}

const resetForm = () => {
  selectedAlias.value = null
  form.canonicalCompany = ''
  form.alias = ''
  form.status = 1
}

const fillCandidate = (item: CompanyAliasCandidate) => {
  selectedAlias.value = null
  form.canonicalCompany = item.canonicalCompany
  form.alias = item.alias
  form.status = 1
}

const saveAlias = async () => {
  isSaving.value = true
  try {
    const payload = { ...form }
    const res = selectedAlias.value
      ? await opsApi.updateCompanyAlias(selectedAlias.value.id, payload)
      : await opsApi.createCompanyAlias(payload)
    toast.success('公司别名已保存')
    if (res.data) selectAlias(res.data)
    await loadAliases()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '公司别名保存失败，可能已存在相同别名'))
  } finally {
    isSaving.value = false
  }
}

const toggleStatus = async () => {
  if (!selectedAlias.value) return
  isSaving.value = true
  try {
    const nextStatus = selectedAlias.value.status === 1 ? 0 : 1
    await opsApi.updateCompanyAliasStatus(selectedAlias.value.id, nextStatus)
    toast.success(nextStatus === 1 ? '别名已启用' : '别名已停用')
    await loadAliases()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '状态更新失败'))
  } finally {
    isSaving.value = false
  }
}

const acceptCandidate = async (item: CompanyAliasCandidate) => {
  isSaving.value = true
  try {
    const res = await opsApi.createCompanyAlias({
      canonicalCompany: item.canonicalCompany,
      alias: item.alias,
      status: 1,
    })
    toast.success('候选别名已加入')
    if (res.data) selectAlias(res.data)
    await Promise.all([loadAliases(), loadCandidates()])
  } catch (error: any) {
    toast.error(getErrorMessage(error, '候选别名保存失败，可能已存在相同别名'))
  } finally {
    isSaving.value = false
  }
}

const formatTime = (value?: string) => {
  if (!value) return '--'
  return new Date(value).toLocaleString()
}

onMounted(() => {
  loadAliases()
  loadCandidates()
})
</script>

<style scoped>
.primary-button,
.secondary-button {
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

.secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
}

.alias-list {
  display: grid;
  gap: 0.75rem;
}

.candidate-grid {
  display: grid;
  gap: 0.75rem;
}

.candidate-card {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
}

.candidate-card strong {
  color: rgb(15 23 42);
}

.candidate-stat {
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.65rem 0.75rem;
}

.candidate-stat span {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.candidate-stat strong {
  margin-top: 0.2rem;
  display: block;
  font-size: 1.05rem;
  font-weight: 800;
}

@media (min-width: 1024px) {
  .candidate-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.alias-row {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.alias-row:hover,
.alias-row-active {
  border-color: rgb(129 140 248);
  background: rgb(238 242 255);
}

.canonical {
  font-weight: 800;
  color: rgb(15 23 42);
}

.status-pill {
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

.status-muted {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

.field-label {
  display: grid;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(71 85 105);
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

.field-input:focus {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.7);
}

.text-button {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(37 99 235);
}

:global(.dark) .panel,
:global(.dark) .secondary-button,
:global(.dark) .field-input {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .alias-row {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .alias-row:hover,
:global(.dark) .alias-row-active {
  border-color: rgb(99 102 241);
  background: rgb(30 27 75);
}

:global(.dark) .candidate-card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .candidate-card strong {
  color: rgb(248 250 252);
}

:global(.dark) .candidate-stat {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .canonical {
  color: rgb(248 250 252);
}
</style>
