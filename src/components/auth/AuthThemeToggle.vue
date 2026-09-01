<template>
  <button
    type="button"
    class="auth-theme-toggle"
    data-theme-toggle
    :title="isEffectiveDark ? '切换为亮色模式' : '切换为深色模式'"
    :aria-label="isEffectiveDark ? '切换为亮色模式' : '切换为深色模式'"
    @click="themeStore.toggleExplicitMode()"
  >
    <Sun v-if="isEffectiveDark" class="h-5 w-5" />
    <Moon v-else class="h-5 w-5" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const isEffectiveDark = computed(() => themeStore.isDark())
</script>

<style scoped>
.auth-theme-toggle {
  display: inline-flex;
  min-height: 44px;
  min-width: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: var(--text-primary);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.auth-theme-toggle:hover,
.auth-theme-toggle:focus-visible {
  background: var(--surface-soft);
  color: var(--text-strong);
  outline: none;
}

.dark .auth-theme-toggle {
  color: var(--text-muted);
}

.dark .auth-theme-toggle:hover,
.dark .auth-theme-toggle:focus-visible {
  background: var(--surface-1);
  color: var(--text-strong);
}
</style>
