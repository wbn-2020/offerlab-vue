<template>
  <Teleport to="body">
    <Transition name="first-visit-guide">
      <div
        v-if="visible"
        class="first-visit-guide-backdrop"
        data-onboarding-guide
        @click.self="dismiss"
      >
        <section
          ref="dialogRef"
          class="first-visit-guide"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          @keydown.esc.prevent="dismiss"
        >
          <header class="first-visit-guide__head">
            <p class="first-visit-guide__kicker">新手引导</p>
            <h2 class="first-visit-guide__title">{{ title }}</h2>
            <p v-if="description" class="first-visit-guide__description">{{ description }}</p>
          </header>
          <ol class="first-visit-guide__steps">
            <li v-for="(step, index) in steps" :key="step.title" class="first-visit-guide__step">
              <span class="first-visit-guide__step-index" aria-hidden="true">{{ index + 1 }}</span>
              <div class="first-visit-guide__step-copy">
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>
            </li>
          </ol>
          <footer class="first-visit-guide__actions">
            <button type="button" class="first-visit-guide__skip" @click="dismiss">跳过，不再显示</button>
            <button type="button" class="first-visit-guide__confirm" @click="dismiss">{{ confirmLabel }}</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { safeStorage } from '@/utils/safeStorage'

export interface FirstVisitGuideStep {
  title: string
  description: string
}

const props = defineProps<{
  /** Stable id used for the persisted dismissal flag, e.g. 'knowledge-base'. */
  guideId: string
  title: string
  description?: string
  steps: FirstVisitGuideStep[]
  confirmLabel?: string
}>()

const STORAGE_KEY_PREFIX = 'offerlab:onboarding:'
const CONFIRM_LABEL_DEFAULT = '开始探索'

const visible = ref(false)
const dialogRef = ref<HTMLElement | null>(null)

const storageKey = computed(() => `${STORAGE_KEY_PREFIX}${props.guideId}`)
const confirmLabel = computed(() => props.confirmLabel ?? CONFIRM_LABEL_DEFAULT)

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') dismiss()
}

const dismiss = () => {
  // Persisting is best-effort: when storage is unavailable the guide simply
  // shows again on the next visit instead of blocking anyone.
  safeStorage.set(storageKey.value, '1')
  visible.value = false
}

watch(visible, (open) => {
  if (open) {
    nextTick(() => dialogRef.value?.focus())
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onMounted(() => {
  if (safeStorage.get(storageKey.value) !== '1') {
    visible.value = true
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.first-visit-guide-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(9, 24, 19, 0.5);
  backdrop-filter: blur(4px);
}

.first-visit-guide {
  width: min(27rem, 100%);
  max-height: min(84vh, 40rem);
  overflow: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  padding: 1.5rem;
  color: var(--text-strong);
  outline: none;
}

.first-visit-guide__kicker {
  margin: 0;
  color: var(--brand);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.first-visit-guide__title {
  margin: 0.35rem 0 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-strong);
}

.first-visit-guide__description {
  margin: 0.5rem 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.6;
}

.first-visit-guide__steps {
  list-style: none;
  margin: 1.15rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.first-visit-guide__step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.8rem;
  background: var(--surface-2);
}

.first-visit-guide__step-index {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-ink);
  font-size: 0.82rem;
  font-weight: 800;
}

.first-visit-guide__step-copy h3 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-strong);
}

.first-visit-guide__step-copy p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.first-visit-guide__actions {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.first-visit-guide__skip {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0.55rem 0.5rem;
  border-radius: var(--radius-control);
  transition: color 0.2s ease;
}

.first-visit-guide__skip:hover {
  color: var(--text-strong);
}

.first-visit-guide__confirm {
  border: none;
  border-radius: var(--radius-control);
  background: var(--brand);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.6rem 1.15rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.first-visit-guide__confirm:hover {
  background: var(--brand-strong);
}

.first-visit-guide-enter-active,
.first-visit-guide-leave-active {
  transition: opacity 0.22s ease;
}

.first-visit-guide-enter-active .first-visit-guide,
.first-visit-guide-leave-active .first-visit-guide {
  transition: transform 0.22s ease;
}

.first-visit-guide-enter-from,
.first-visit-guide-leave-to {
  opacity: 0;
}

.first-visit-guide-enter-from .first-visit-guide,
.first-visit-guide-leave-to .first-visit-guide {
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 480px) {
  .first-visit-guide {
    padding: 1.15rem;
  }

  .first-visit-guide__confirm,
  .first-visit-guide__skip {
    min-height: 44px;
  }
}
</style>
