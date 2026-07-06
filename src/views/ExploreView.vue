<template>
  <main class="explore-page">
    <section class="explore-band explore-band-hero">
      <div class="explore-shell hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">OfferLab Discovery Map</p>
          <h1>发现页专题广场</h1>
          <p class="hero-summary">
            从运营精选专题、频道入口和活跃话题进入公开社区内容。
          </p>
          <form class="hero-search" @submit.prevent="submitSearch">
            <Search class="h-5 w-5" aria-hidden="true" />
            <input v-model.trim="keyword" type="search" placeholder="搜索公开经验、话题或资源" />
            <button type="submit" aria-label="搜索">
              <ArrowRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </div>
        <aside class="status-panel" aria-live="polite">
          <div class="status-row">
            <span>专题</span>
            <strong>{{ discoveryMap?.featuredTopics.length || 0 }}</strong>
          </div>
          <div class="status-row">
            <span>频道</span>
            <strong>{{ discoveryMap?.channels.length || 0 }}</strong>
          </div>
          <div class="status-row">
            <span>话题</span>
            <strong>{{ discoveryMap?.activeTopics.length || 0 }}</strong>
          </div>
          <p v-if="loading" class="status-note">正在读取公共内容地图...</p>
          <p v-else-if="degraded" class="status-note">部分模块暂时不可用，页面已保留可访问入口。</p>
          <p v-else class="status-note">公共内容地图已就绪。</p>
        </aside>
      </div>
    </section>

    <section v-if="error" class="explore-band">
      <div class="explore-shell">
        <div class="state-banner state-banner-error">
          <AlertCircle class="h-5 w-5" aria-hidden="true" />
          <span>{{ error }}</span>
          <button type="button" @click="reload">
            <RefreshCw class="h-4 w-4" aria-hidden="true" />
            重试
          </button>
        </div>
      </div>
    </section>

    <section v-if="!loading && !error && !hasItems" class="explore-band">
      <div class="explore-shell">
        <div class="empty-panel">
          <Inbox class="h-8 w-8" aria-hidden="true" />
          <h2>发现页暂时没有可展示内容</h2>
          <p>可以先进入公开搜索浏览热门内容。</p>
          <RouterLink class="primary-link" to="/search?sort=hot">查看热门内容</RouterLink>
        </div>
      </div>
    </section>

    <section class="explore-band">
      <div class="explore-shell section-layout">
        <SectionHeader title="精选专题" :module="moduleOf('featuredTopics')" />
        <div v-if="loading" class="topic-grid">
          <SkeletonCard v-for="index in 3" :key="index" />
        </div>
        <div v-else-if="featuredTopics.length" class="topic-grid">
          <RouterLink v-for="item in featuredTopics" :key="item.id" class="feature-card" :to="item.href">
            <span class="card-kicker">运营精选</span>
            <h2>{{ item.title }}</h2>
            <p>{{ item.summary || item.reasonText || item.reason || '进入专题继续浏览公开内容。' }}</p>
            <span class="card-link">
              进入
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </span>
          </RouterLink>
        </div>
        <ModuleEmpty v-else :module="moduleOf('featuredTopics')" />
      </div>
    </section>

    <section class="explore-band explore-band-muted">
      <div class="explore-shell section-layout">
        <SectionHeader title="频道入口" :module="moduleOf('channels')" />
        <div v-if="channels.length" class="channel-grid">
          <RouterLink v-for="item in channels" :key="item.id" class="channel-card" :to="item.href">
            <span class="channel-icon">{{ item.icon || 'C' }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.summary }}</p>
          </RouterLink>
        </div>
        <ModuleEmpty v-else :module="moduleOf('channels')" />
      </div>
    </section>

    <section class="explore-band">
      <div class="explore-shell two-column-layout">
        <div class="section-layout">
          <SectionHeader title="活跃话题" :module="moduleOf('activeTopics')" />
          <div v-if="activeTopics.length" class="compact-list">
            <RouterLink v-for="item in activeTopics" :key="item.id" class="compact-row" :to="item.href">
              <Hash class="h-4 w-4" aria-hidden="true" />
              <span>{{ item.title }}</span>
              <small v-if="item.reasonText || item.reason">{{ item.reasonText || item.reason }}</small>
            </RouterLink>
          </div>
          <ModuleEmpty v-else :module="moduleOf('activeTopics')" />
        </div>

        <div class="section-layout">
          <SectionHeader title="搜索延展" :module="moduleOf('searchEntrypoints')" />
          <div v-if="searchEntrypoints.length" class="search-entry-grid">
            <RouterLink v-for="item in searchEntrypoints" :key="item.id" class="search-entry" :to="item.href">
              <Search class="h-4 w-4" aria-hidden="true" />
              <span>{{ item.title }}</span>
            </RouterLink>
          </div>
          <ModuleEmpty v-else :module="moduleOf('searchEntrypoints')" />
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { AlertCircle, ArrowRight, Hash, Inbox, RefreshCw, Search } from 'lucide-vue-next'
import { useDiscoveryMap } from '@/composables/useDiscoveryMap'
import type { DiscoveryModuleState } from '@/api/discovery'

const router = useRouter()
const keyword = ref('')
const { data: discoveryMap, loading, error, degraded, hasItems, reload } = useDiscoveryMap()

const featuredTopics = computed(() => discoveryMap.value?.featuredTopics || [])
const channels = computed(() => discoveryMap.value?.channels || [])
const activeTopics = computed(() => discoveryMap.value?.activeTopics || [])
const searchEntrypoints = computed(() => discoveryMap.value?.searchEntrypoints || [])

const moduleOf = (key: string): DiscoveryModuleState | undefined => discoveryMap.value?.modules?.[key]

const submitSearch = () => {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { q, sort: 'hot' } : { sort: 'hot' } })
}

const SectionHeader = defineComponent({
  props: {
    title: { type: String, required: true },
    module: { type: Object as () => DiscoveryModuleState | undefined, required: false },
  },
  setup(props) {
    return () => h('header', { class: 'section-header' }, [
      h('div', [
        h('p', { class: 'eyebrow' }, 'Public discovery'),
        h('h2', props.title),
      ]),
      props.module
        ? h('span', { class: ['module-status', props.module.degraded ? 'module-status-degraded' : ''] }, props.module.degraded ? '暂不可用' : `${props.module.itemCount} 项`)
        : null,
    ])
  },
})

const ModuleEmpty = defineComponent({
  props: {
    module: { type: Object as () => DiscoveryModuleState | undefined, required: false },
  },
  setup(props) {
    return () => h('div', { class: 'module-empty' }, [
      h(Inbox, { class: 'h-5 w-5', 'aria-hidden': 'true' }),
      h('span', props.module?.fallbackReason ? '这个模块暂时没有可展示内容。' : '暂无可展示内容。'),
    ])
  },
})

const SkeletonCard = defineComponent({
  setup() {
    return () => h('div', { class: 'skeleton-card', 'aria-hidden': 'true' }, [
      h('span'),
      h('strong'),
      h('p'),
    ])
  },
})
</script>

<style scoped>
.explore-page {
  min-height: 100vh;
  background: #f7faf9;
  color: #111827;
}

.explore-band {
  width: 100%;
  padding: 28px 20px;
}

.explore-band-hero {
  padding-top: 44px;
  background: linear-gradient(135deg, #0f172a 0%, #164e63 48%, #365314 100%);
  color: white;
}

.explore-band-muted {
  background: #eef7f3;
}

.explore-shell {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
  gap: 24px;
  align-items: end;
}

.hero-copy h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1.12;
  letter-spacing: 0;
}

.hero-summary {
  margin: 14px 0 22px;
  max-width: 620px;
  color: #dbeafe;
  font-size: 16px;
  line-height: 1.7;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0891b2;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.explore-band-hero .eyebrow {
  color: #a7f3d0;
}

.hero-search {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 44px;
  align-items: center;
  width: min(620px, 100%);
  min-height: 52px;
  gap: 10px;
  padding: 6px 6px 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  color: #334155;
}

.hero-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font-size: 15px;
}

.hero-search button,
.state-banner button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  background: #0f766e;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.hero-search button {
  width: 40px;
  height: 40px;
}

.status-panel {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  color: #dbeafe;
}

.status-row strong {
  font-size: 24px;
  color: white;
}

.status-note {
  margin: 6px 0 0;
  color: #ccfbf1;
  line-height: 1.6;
}

.state-banner,
.empty-panel,
.module-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  padding: 14px 16px;
  color: #475569;
}

.state-banner-error {
  border-color: #fecaca;
  color: #991b1b;
}

.state-banner button {
  min-height: 36px;
  padding: 0 12px;
  margin-left: auto;
}

.empty-panel {
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
}

.empty-panel h2 {
  margin: 0;
  font-size: 22px;
}

.empty-panel p {
  margin: 0;
}

.primary-link,
.card-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f766e;
  font-weight: 800;
  text-decoration: none;
}

.section-layout {
  display: grid;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: 0;
}

.module-status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
}

.module-status-degraded {
  background: #fef3c7;
  color: #92400e;
}

.topic-grid,
.channel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.feature-card,
.channel-card,
.search-entry {
  border: 1px solid #dbe3ea;
  border-radius: 8px;
  background: white;
  color: inherit;
  text-decoration: none;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.feature-card {
  display: grid;
  align-content: space-between;
  min-height: 210px;
  padding: 18px;
}

.feature-card:hover,
.channel-card:hover,
.search-entry:hover {
  transform: translateY(-2px);
  border-color: #0f766e;
  box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.45);
}

.card-kicker {
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.feature-card h2 {
  margin: 10px 0;
  font-size: 20px;
  line-height: 1.35;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.feature-card p,
.channel-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.channel-card {
  display: grid;
  gap: 8px;
  min-height: 156px;
  padding: 16px;
}

.channel-icon {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #e0f2fe;
  color: #075985;
  font-weight: 900;
}

.two-column-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
  gap: 22px;
}

.compact-list,
.search-entry-grid {
  display: grid;
  gap: 10px;
}

.compact-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-bottom: 1px solid #e2e8f0;
  color: #1f2937;
  text-decoration: none;
}

.compact-row span {
  overflow-wrap: anywhere;
  font-weight: 700;
}

.compact-row small {
  color: #64748b;
}

.search-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  font-weight: 800;
}

.skeleton-card {
  min-height: 210px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9);
}

.skeleton-card span,
.skeleton-card strong,
.skeleton-card p {
  display: block;
}

@media (max-width: 900px) {
  .hero-grid,
  .two-column-layout {
    grid-template-columns: 1fr;
  }

  .topic-grid,
  .channel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .explore-band {
    padding: 22px 14px;
  }

  .hero-copy h1 {
    font-size: 32px;
  }

  .topic-grid,
  .channel-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .compact-row {
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .compact-row small {
    grid-column: 2;
  }
}
</style>
