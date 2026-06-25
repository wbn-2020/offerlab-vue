<template>
  <button
    type="button"
    class="auth-theme-toggle"
    data-theme-toggle
    :title="isEffectiveDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-label="isEffectiveDark ? 'Switch to light mode' : 'Switch to dark mode'"
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
  color: rgb(71 85 105);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.auth-theme-toggle:hover,
.auth-theme-toggle:focus-visible {
  background: rgb(241 245 249);
  color: rgb(15 23 42);
  outline: none;
}

.dark .auth-theme-toggle {
  color: rgb(203 213 225);
}

.dark .auth-theme-toggle:hover,
.dark .auth-theme-toggle:focus-visible {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}
</style>
