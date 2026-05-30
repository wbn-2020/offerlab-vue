import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { safeStorage } from '@/utils/safeStorage'

export type ThemeMode = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore('theme', () => {
  const prefersDark = usePreferredDark()
  const storedMode = safeStorage.get('theme') as ThemeMode | null
  const mode = ref<ThemeMode>(storedMode === 'light' || storedMode === 'dark' || storedMode === 'auto' ? storedMode : 'auto')

  const isDark = () => {
    if (mode.value === 'auto') {
      return prefersDark.value
    }
    return mode.value === 'dark'
  }

  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode
    safeStorage.set('theme', newMode)
    updateDOM()
  }

  const updateDOM = () => {
    if (isDark()) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  watch(mode, updateDOM)
  watch(prefersDark, updateDOM)

  return {
    mode,
    isDark,
    setMode,
  }
})
