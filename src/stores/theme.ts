import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { safeStorage } from '@/utils/safeStorage'

export type ThemeMode = 'light' | 'dark' | 'auto'

const isThemeMode = (value: string | null): value is ThemeMode => value === 'light' || value === 'dark' || value === 'auto'

export const useThemeStore = defineStore('theme', () => {
  const prefersDark = usePreferredDark()
  const storedMode = safeStorage.get('theme') as ThemeMode | null
  const mode = ref<ThemeMode>(isThemeMode(storedMode) ? storedMode : 'auto')

  const isDark = () => {
    if (mode.value === 'auto') {
      return prefersDark.value
    }
    return mode.value === 'dark'
  }

  const updateDOM = () => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', isDark())
  }

  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode
    safeStorage.set('theme', newMode)
    updateDOM()
  }

  const toggleExplicitMode = () => {
    setMode(isDark() ? 'light' : 'dark')
  }

  const initialize = () => updateDOM()

  watch([mode, prefersDark], updateDOM, { immediate: true })

  return {
    mode,
    isDark,
    setMode,
    toggleExplicitMode,
    initialize,
  }
})
