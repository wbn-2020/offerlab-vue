<template>
  <span
    class="user-avatar"
    :data-avatar-state="avatarState"
    :role="accessibleLabel ? 'img' : undefined"
    :aria-label="accessibleLabel || undefined"
  >
    <span
      class="user-avatar__fallback"
      :style="fallbackStyle"
      aria-hidden="true"
    >{{ fallbackText }}</span>
    <img
      v-if="shouldLoadImage"
      :key="requestKey"
      class="user-avatar__image"
      :class="{ 'user-avatar__image--loaded': imageLoaded }"
      :src="normalizedSrc"
      :data-avatar-request="requestKey"
      alt=""
      decoding="async"
      referrerpolicy="no-referrer"
      @load="handleImageLoad"
      @error="handleImageError"
    >
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolveAvatarAccessibleLabel,
  resolveAvatarFallback,
  resolveAvatarTone,
  useAvatarRequestState,
} from './useAvatarRequestState'

interface Props {
  src?: string | null
  name?: string | null
  alt?: string | null
  fallback?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  name: '',
  fallback: '?',
})

const {
  normalizedSrc,
  requestKey,
  shouldLoadImage,
  imageLoaded,
  avatarState,
  acceptLoad,
  acceptError,
} = useAvatarRequestState(computed(() => props.src))
const fallbackText = computed(() => resolveAvatarFallback(props.name, props.fallback))
const fallbackStyle = computed(() => resolveAvatarTone(props.name))
const accessibleLabel = computed(() => resolveAvatarAccessibleLabel(props.alt, props.name))

const attemptedRequest = (event: Event) => (
  (event.currentTarget as HTMLImageElement | null)?.dataset.avatarRequest?.trim() || ''
)

const handleImageLoad = (event: Event) => {
  acceptLoad(attemptedRequest(event))
}

const handleImageError = (event: Event) => {
  acceptError(attemptedRequest(event))
}
</script>

<style scoped>
.user-avatar {
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  line-height: 1;
}

.user-avatar__fallback,
.user-avatar__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.user-avatar__fallback {
  display: grid;
  place-items: center;
  background: var(--user-avatar-fallback-background, var(--primary-600));
  color: var(--user-avatar-fallback-color, white);
  font-weight: 700;
  letter-spacing: 0;
}

.user-avatar__image {
  display: block;
  object-fit: cover;
  opacity: 0;
}

.user-avatar__image--loaded {
  opacity: 1;
}
</style>
