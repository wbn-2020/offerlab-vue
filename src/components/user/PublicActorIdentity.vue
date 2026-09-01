<template>
  <span class="public-actor-identity" :class="{ 'public-actor-identity--compact': compact }">
    <UserAvatar
      :src="actor?.avatarUrl"
      :name="displayName"
      :alt="`${displayName}的头像`"
      class="public-actor-identity__avatar"
    />
    <span class="public-actor-identity__copy">
      <span v-if="roleLabel" class="public-actor-identity__role">{{ roleLabel }}</span>
      <strong>{{ displayName }}</strong>
      <span
        v-for="badge in badges"
        :key="badge"
        class="public-actor-identity__badge"
      >{{ badge }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PublicActor } from '@/api/collaboration'
import UserAvatar from '@/components/user/UserAvatar.vue'

const props = withDefaults(defineProps<{
  actor?: PublicActor | null
  roleLabel?: string
  compact?: boolean
}>(), {
  actor: null,
  roleLabel: '',
  compact: false,
})

const displayName = computed(() => props.actor?.displayName?.trim() || '社区成员')
const badges = computed(() => (
  Array.isArray(props.actor?.badges)
    ? props.actor.badges.filter((badge) => typeof badge === 'string' && badge.trim()).map((badge) => badge.trim())
    : []
))
</script>

<style scoped>
.public-actor-identity {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  vertical-align: middle;
}

.public-actor-identity__avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  font-size: 0.68rem;
}

.public-actor-identity__copy {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.public-actor-identity__role {
  color: var(--text-muted);
}

.public-actor-identity strong {
  overflow-wrap: anywhere;
  color: inherit;
  font-size: inherit;
  font-weight: 800;
}

.public-actor-identity__badge {
  border-radius: 999px;
  background: rgb(232 243 237);
  padding: 0.1rem 0.35rem;
  color: rgb(18 99 74);
  font-size: 0.66rem;
  font-weight: 800;
}

.public-actor-identity--compact .public-actor-identity__avatar {
  width: 1.35rem;
  height: 1.35rem;
  font-size: 0.58rem;
}

.dark .public-actor-identity__role {
  color: var(--text-muted);
}

.dark .public-actor-identity__badge {
  background: rgb(10 52 39);
  color: rgb(205 232 220);
}
</style>
