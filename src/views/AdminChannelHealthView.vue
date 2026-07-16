<template>
  <div class="health-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <header class="page-header">
        <div>
          <p>社区健康</p>
          <h1>频道维护概览</h1>
          <span>查看公开内容的维护积压和可信覆盖。指标仅用于排查与协调，不参与排名或自动处罚。</span>
        </div>
        <button type="button" class="icon-button" title="刷新频道健康度" :disabled="loading" @click="load">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </header>

      <div v-if="errorText" class="state state-error">{{ errorText }}</div>
      <div v-else-if="loading" class="state">正在读取频道健康数据</div>
      <section v-else class="health-grid">
        <article v-for="item in items" :key="item.domain" class="health-row">
          <div class="row-title">
            <div>
              <div class="title-line">
                <h2>{{ item.domainName }}</h2>
                <span :class="['status', item.healthStatus === 'STABLE' ? 'status-stable' : 'status-attention']">
                  {{ item.healthStatus === 'STABLE' ? '稳定' : '需要关注' }}
                </span>
              </div>
              <p>{{ item.publicPostCount }} 篇公开内容 · {{ item.trustProfileCount }} 篇已补充经验背景</p>
            </div>
            <strong>{{ item.trustProfileCoveragePercent }}%</strong>
          </div>
          <div class="metric-grid">
            <div><span>经验背景覆盖</span><strong>{{ item.trustProfileCoveragePercent }}%</strong></div>
            <div><span>待确认时效</span><strong>{{ item.freshnessAwaitingConfirmation }}</strong></div>
            <div><span>待处理建议</span><strong>{{ item.pendingSuggestions }}</strong></div>
            <div><span>未闭环问题</span><strong>{{ item.unresolvedQuestions }}</strong></div>
            <div><span>开放内容需求</span><strong>{{ item.openContentNeeds }}</strong></div>
          </div>
          <p v-if="item.attentionReasons.length" class="reason">{{ item.attentionReasons.join('；') }}</p>
          <p v-else class="reason reason-stable">当前未发现需要集中协调的维护积压。</p>
          <div v-if="item.healthStatus !== 'STABLE'" class="row-actions">
            <RouterLink :to="maintenanceLink(item)" class="create-task-link">
              创建维护任务
            </RouterLink>
          </div>
        </article>
        <div v-if="items.length === 0" class="state">当前治理范围没有可展示的频道数据。</div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import { channelHealthApi, type ChannelHealth } from '@/api/channelHealth'

const items = ref<ChannelHealth[]>([])
const loading = ref(false)
const errorText = ref('')

const maintenanceLink = (item: ChannelHealth) => ({
  path: '/admin/content-maintenance',
  query: {
    domain: String(item.domain),
    sourceType: 'CHANNEL_HEALTH',
    title: `${item.domainName}频道维护`,
    detail: item.attentionReasons.join('；'),
  },
})

const load = async () => {
  loading.value = true
  errorText.value = ''
  try {
    const res = await channelHealthApi.list()
    items.value = res.data || []
  } catch (error) {
    errorText.value = getErrorMessage(error, '频道健康数据暂时无法读取')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.health-page { background: rgb(248 250 252); }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.page-header p { margin: 0; color: rgb(8 145 178); font-size: .75rem; font-weight: 800; }
.page-header h1 { margin: .25rem 0; color: rgb(15 23 42); font-size: 1.5rem; font-weight: 900; }
.page-header span { display: block; max-width: 58rem; color: rgb(100 116 139); font-size: .875rem; line-height: 1.6; }
.icon-button { display: inline-flex; height: 2.5rem; width: 2.5rem; flex: none; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; color: rgb(51 65 85); }
.health-grid { display: grid; gap: 1rem; }
.health-row { border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1.15rem; }
.row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.title-line { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.title-line h2 { margin: 0; color: rgb(15 23 42); font-size: 1rem; font-weight: 900; }
.row-title p, .reason { margin: .35rem 0 0; color: rgb(100 116 139); font-size: .78rem; line-height: 1.55; }
.row-title > strong { color: rgb(8 145 178); font-size: 1.5rem; font-weight: 900; }
.status { border-radius: 999px; padding: .2rem .55rem; font-size: .68rem; font-weight: 900; }
.status-stable { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-attention { background: rgb(254 243 199); color: rgb(146 64 14); }
.metric-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .65rem; margin-top: 1rem; }
.metric-grid div { min-width: 0; border: 1px solid rgb(226 232 240); border-radius: .5rem; background: rgb(248 250 252); padding: .7rem; }
.metric-grid span { display: block; color: rgb(100 116 139); font-size: .7rem; font-weight: 700; }
.metric-grid strong { display: block; margin-top: .3rem; color: rgb(15 23 42); font-size: 1.2rem; font-weight: 900; }
.reason { border-top: 1px solid rgb(241 245 249); padding-top: .75rem; }
.reason-stable { color: rgb(21 128 61); }
.row-actions { display: flex; justify-content: flex-end; margin-top: .75rem; }
.create-task-link { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; border: 1px solid rgb(8 145 178); border-radius: .5rem; padding: .45rem .7rem; color: rgb(8 145 178); font-size: .75rem; font-weight: 900; }
.state { border: 1px dashed rgb(203 213 225); border-radius: .625rem; background: white; padding: 2rem; color: rgb(100 116 139); text-align: center; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
@media (max-width: 800px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
:global(.dark) .health-page { background: rgb(2 6 23); }
:global(.dark) .page-header h1, :global(.dark) .title-line h2, :global(.dark) .metric-grid strong { color: rgb(248 250 252); }
:global(.dark) .page-header span, :global(.dark) .row-title p, :global(.dark) .reason, :global(.dark) .metric-grid span { color: rgb(148 163 184); }
:global(.dark) .icon-button, :global(.dark) .health-row, :global(.dark) .state { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }
:global(.dark) .metric-grid div { border-color: rgb(51 65 85); background: rgb(2 6 23 / .6); }
:global(.dark) .reason { border-color: rgb(30 41 59); }
</style>
