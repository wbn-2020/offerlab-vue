<template>
  <section
    v-if="isLoading || hasThread || error"
    class="surface-card p-5"
    aria-labelledby="reading-thread-heading"
    :aria-busy="isLoading"
  >
    <h2 id="reading-thread-heading" class="font-black">阅读脉络</h2>
    <p class="mt-1 text-sm text-slate-500">
      由社区成员提案、经审核确认的内容顺序，只是一条参考路线，不是官方规定的必读顺序。
    </p>
    <p v-if="isLoading" class="mt-3 text-sm text-slate-500" role="status" aria-live="polite">
      正在读取阅读脉络...
    </p>
    <p v-else-if="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
    <template v-else>
      <div v-if="upstream.length" class="thread-group">
        <h3 class="thread-group-title">先读</h3>
        <ol class="thread-list">
          <li v-for="node in upstream" :key="`up-${node.postId}`" class="thread-node">
            <RouterLink :to="`/post/${node.postId}`" class="thread-link">{{ node.title || '未命名内容' }}</RouterLink>
            <span class="thread-meta">
              <span v-if="isKnownDomain(node.domain)" class="thread-badge">
                {{ getDomainIcon(node.domain!) }} {{ getDomainLabel(node.domain!) }}
              </span>
              <span class="thread-relation">{{ relationLabel(node.relationType, 'upstream') }}</span>
            </span>
          </li>
        </ol>
      </div>

      <p class="thread-anchor">本篇</p>

      <div v-if="downstream.length" class="thread-group">
        <h3 class="thread-group-title">接着读</h3>
        <ol class="thread-list">
          <li v-for="node in downstream" :key="`down-${node.postId}`" class="thread-node">
            <RouterLink :to="`/post/${node.postId}`" class="thread-link">{{ node.title || '未命名内容' }}</RouterLink>
            <span class="thread-meta">
              <span v-if="isKnownDomain(node.domain)" class="thread-badge">
                {{ getDomainIcon(node.domain!) }} {{ getDomainLabel(node.domain!) }}
              </span>
              <span class="thread-relation">{{ relationLabel(node.relationType, 'downstream') }}</span>
            </span>
          </li>
        </ol>
      </div>

      <p v-if="truncated" class="thread-truncated" role="note">
        这条脉络还没走完，这里只显示邻近的一段。
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import { knowledgeRelationApi, type ReadingThread, type ReadingThreadNode } from '@/api/knowledgeRelations'
import { getDomainIcon, getDomainLabel, isKnownDomain } from '@/utils/domains'

const props = defineProps<{ postId: string }>()

const thread = ref<ReadingThread | null>(null)
const error = ref('')
const isLoading = ref(false)
let requestId = 0
let disposed = false

const upstream = computed(() => thread.value?.upstream ?? [])
const downstream = computed(() => thread.value?.downstream ?? [])
const truncated = computed(() => thread.value?.truncated === true)
const hasThread = computed(() => upstream.value.length > 0 || downstream.value.length > 0)

const relationLabel = (
  value: ReadingThreadNode['relationType'],
  direction: 'upstream' | 'downstream',
) => {
  if (value === 'PREREQUISITE_OF') return direction === 'upstream' ? '阅读前置' : '以本篇为前置'
  if (value === 'CONTINUES') return direction === 'upstream' ? '本篇所延续' : '延续本篇'
  if (value === 'SUPERSEDES') return direction === 'upstream' ? '被本篇替代' : '替代本篇'
  return ''
}

const load = async (postId: string) => {
  const targetPostId = String(postId || '')
  const targetRequestId = ++requestId
  thread.value = null
  error.value = ''
  if (!targetPostId) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  const isCurrentRequest = () => (
    !disposed
    && targetRequestId === requestId
    && String(props.postId || '') === targetPostId
  )
  try {
    const response = await knowledgeRelationApi.thread(targetPostId)
    if (!isCurrentRequest()) return
    thread.value = response.data
  } catch (cause) {
    if (!isCurrentRequest()) return
    error.value = getErrorMessage(cause, '阅读脉络暂时读不出来，稍后再看。')
  } finally {
    if (isCurrentRequest()) {
      isLoading.value = false
    }
  }
}

watch(
  () => props.postId,
  (postId) => {
    void load(postId)
  },
  { immediate: true, flush: 'sync' },
)

onBeforeUnmount(() => {
  disposed = true
  requestId += 1
})
</script>

<style scoped>
.thread-group {
  margin-top: 1rem;
}

.thread-group-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-muted);
}

.thread-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.thread-node {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.thread-link {
  font-weight: 600;
  color: rgb(26 127 90);
}

.thread-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.thread-badge,
.thread-relation {
  border-radius: 999px;
  background: var(--surface-soft);
  padding: 0.125rem 0.5rem;
}

.thread-anchor {
  margin-top: 1rem;
  font-size: 0.8125rem;
  font-weight: 700;
}

.thread-truncated {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.dark .thread-group-title,
.dark .thread-meta,
.dark .thread-truncated {
  color: var(--text-muted);
}

.dark .thread-link {
  color: rgb(124 195 165);
}

.dark .thread-anchor {
  color: var(--text-strong);
}

.dark .thread-badge,
.dark .thread-relation {
  background: var(--surface-1);
  color: var(--text-muted);
}
</style>
