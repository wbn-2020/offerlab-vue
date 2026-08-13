<template>
  <span class="public-actor">
    <UserRound class="h-4 w-4" aria-hidden="true" />
    <span>{{ roleLabel }}</span>
    <RouterLink v-if="actorName && actorHref" :to="actorHref">{{ actorName }}</RouterLink>
    <span v-else>{{ actorName || '社区成员' }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { UserRound } from 'lucide-vue-next'
import { userApi } from '@/api/user'
import type { ApiId } from '@/api/types'

const props = withDefaults(defineProps<{
  uid?: ApiId | null
  roleLabel?: string
}>(), {
  uid: null,
  roleLabel: '发起者',
})

const actorName = ref('')
let generation = 0
const actorHref = computed(() => props.uid == null ? '' : `/u/${encodeURIComponent(String(props.uid))}`)

const loadActor = async () => {
  const target = ++generation
  actorName.value = ''
  if (props.uid == null) return
  try {
    const res = await userApi.getProfile(props.uid)
    if (target !== generation) return
    actorName.value = res.data?.nickname?.trim() || '社区成员'
  } catch {
    if (target === generation) actorName.value = '社区成员'
  }
}

watch(() => props.uid, loadActor, { immediate: true })
onUnmounted(() => {
  generation += 1
})
</script>

<style scoped>
.public-actor {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
}

.public-actor a {
  color: var(--primary-700);
  font-weight: 750;
}

.public-actor a:hover {
  text-decoration: underline;
}
</style>
