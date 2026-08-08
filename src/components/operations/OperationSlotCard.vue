<template>
  <section class="operation-slot-card" :class="{ 'operation-slot-card--degraded': isUnavailable }">
    <div class="operation-slot-head">
      <div class="min-w-0">
        <span class="operation-slot-label">{{ labelText }}</span>
        <h2>{{ slot?.title || title }}</h2>
      </div>
      <Sparkles class="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
    </div>

    <p class="operation-slot-explain">{{ explanationText }}</p>
    <p v-if="slotUpdatedAt" class="operation-slot-meta">运营整理，不等同于自然排序 · 更新于 {{ slotUpdatedAt }}</p>

    <div v-if="isLoading" class="operation-slot-state">
      <RefreshCw class="h-4 w-4 animate-spin" />
      <span>正在读取运营整理入口</span>
    </div>

    <div v-else-if="isRenderableSlot && visibleItems.length" class="operation-slot-grid">
      <RouterLink
        v-for="item in visibleItems"
        :key="String(item.id)"
        :to="item.href || '/explore'"
        class="operation-slot-item"
      >
        <span>
          {{ item.contentType === 'OPERATION_TOPIC' || item.sourceType === 'OPERATION_TOPIC' || item.sourceType === 'TOPIC' ? '专题入口' : '内容入口' }}
          <em v-if="item.topicScope === 'CROSS_DOMAIN'" class="operation-slot-scope">跨频道</em>
        </span>
        <strong>{{ item.title }}</strong>
        <small>{{ item.summary || item.reasonText || item.reason || '来自公开可见内容的运营整理' }}</small>
      </RouterLink>
    </div>

    <div v-else class="operation-slot-state">
      <Archive class="h-4 w-4" />
      <span>{{ emptyText }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Archive, RefreshCw, Sparkles } from 'lucide-vue-next'
import { HOME_FEATURED_SLOT_CODE, operationsApi, type OperationSlot } from '@/api/operations'
import { isOpsOrchestrationCopyAllowed } from '@/utils/opsOrchestrationGuard'

const props = withDefaults(defineProps<{
  slotCode?: string
  title?: string
}>(), {
  slotCode: HOME_FEATURED_SLOT_CODE,
  title: '社区运营整理',
})

const slot = ref<OperationSlot | null>(null)
const isLoading = ref(false)
const loadError = ref('')

const isRenderableSlot = computed(() => (
  props.slotCode === HOME_FEATURED_SLOT_CODE
  && slot.value?.slotCode === HOME_FEATURED_SLOT_CODE
  && slot.value?.source === 'remote'
  && slot.value?.status === 'PUBLISHED'
  && !slot.value?.degraded
))
const visibleItems = computed(() => (slot.value?.items || [])
  .filter((item) => !item.blocked && item.source === 'remote')
  .filter((item) => isOpsOrchestrationCopyAllowed(`${item.title} ${item.summary || ''} ${item.reasonText || item.reason || ''}`))
  .slice(0, 4))
const isUnavailable = computed(() => Boolean(slot.value?.degraded || loadError.value))
const labelText = computed(() => isUnavailable.value ? '暂不可用' : (slot.value?.displayLabel || '运营整理'))
const explanationText = computed(() => {
  if (loadError.value) return '运营位接口暂不可用，前台不会伪装成自然推荐；当前保留稳定空状态。'
  if (isUnavailable.value) return slot.value?.explanation || '后端运营位未接通时展示稳定空状态，不代表正式发布配置。'
  return slot.value?.explanation || '由社区运营从公开可见内容中整理，展示原因和自然推荐分开说明。'
})
const slotUpdatedAt = computed(() => {
  const value = slot.value?.updatedAt
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})
const emptyText = computed(() => (
  loadError.value
    ? '运营位暂不可用，已降级为空状态'
    : '当前没有可展示的运营整理入口'
))

const loadSlot = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await operationsApi.getPublicOperationSlot(props.slotCode)
    slot.value = res.data
  } catch (error) {
    slot.value = null
    loadError.value = error instanceof Error ? error.message : 'operation slot unavailable'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadSlot)
watch(() => props.slotCode, loadSlot)
</script>

<style scoped>
.operation-slot-card {
  min-height: 12.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(203 213 225 / 0.9);
  background: linear-gradient(135deg, rgb(240 249 255), rgb(240 253 250));
  padding: 1rem;
}

.operation-slot-card--degraded {
  background: rgb(248 250 252);
}

.operation-slot-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.operation-slot-label {
  display: inline-flex;
  border-radius: 999px;
  background: rgb(8 145 178 / 0.12);
  padding: 0.25rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: rgb(14 116 144);
}

.operation-slot-head h2 {
  margin-top: 0.45rem;
  overflow-wrap: anywhere;
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.35;
  color: rgb(15 23 42);
}

.operation-slot-explain {
  margin-top: 0.65rem;
  min-height: 2.4rem;
  font-size: 0.8rem;
  line-height: 1.55;
  color: rgb(71 85 105);
}

.operation-slot-meta {
  margin-top: 0.35rem;
  color: rgb(100 116 139);
  font-size: 0.7rem;
  line-height: 1.45;
}

.operation-slot-grid {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.operation-slot-item,
.operation-slot-state {
  min-height: 5.75rem;
  border-radius: 0.625rem;
  border: 1px solid rgb(203 213 225 / 0.8);
  background: rgb(255 255 255 / 0.82);
}

.operation-slot-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.operation-slot-item:hover {
  border-color: rgb(14 165 233 / 0.8);
  background: white;
}

.operation-slot-item span {
  font-size: 0.68rem;
  font-weight: 900;
  color: rgb(8 145 178);
}

/* 跨频道专题的中性标注：不用任何单频道配色，避免入口卡冒充频道归属。 */
.operation-slot-item .operation-slot-scope {
  margin-left: 0.35rem;
  border: 1px dashed rgb(148 163 184);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 800;
  color: rgb(71 85 105);
}

.operation-slot-item strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.86rem;
  line-height: 1.35;
  color: rgb(15 23 42);
}

.operation-slot-item small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  margin-top: auto;
  font-size: 0.74rem;
  line-height: 1.45;
  color: rgb(100 116 139);
}

.operation-slot-state {
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: rgb(71 85 105);
}

@media (max-width: 640px) {
  .operation-slot-card {
    min-height: 15rem;
  }

  .operation-slot-grid {
    grid-template-columns: 1fr;
  }
}

.dark .operation-slot-card {
  border-color: rgb(51 65 85 / 0.86);
  background: linear-gradient(135deg, rgb(8 47 73 / 0.55), rgb(20 83 45 / 0.28));
}

.dark .operation-slot-card--degraded {
  background: rgb(15 23 42 / 0.78);
}

.dark .operation-slot-label {
  background: rgb(14 116 144 / 0.32);
  color: rgb(165 243 252);
}

.dark .operation-slot-head h2 {
  color: rgb(248 250 252);
}

.dark .operation-slot-explain,
.dark .operation-slot-meta,
.dark .operation-slot-state {
  color: rgb(203 213 225);
}

.dark .operation-slot-item,
.dark .operation-slot-state {
  border-color: rgb(51 65 85 / 0.86);
  background: rgb(15 23 42 / 0.78);
}

.dark .operation-slot-item:hover {
  border-color: rgb(34 211 238 / 0.65);
  background: rgb(30 41 59 / 0.82);
}

.dark .operation-slot-item span {
  color: rgb(103 232 249);
}

.dark .operation-slot-item .operation-slot-scope {
  border-color: rgb(71 85 105);
  color: rgb(148 163 184);
}

.dark .operation-slot-item strong {
  color: rgb(248 250 252);
}

.dark .operation-slot-item small {
  color: rgb(148 163 184);
}
</style>
