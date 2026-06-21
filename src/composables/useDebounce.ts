import { onUnmounted, ref, watch } from 'vue'

export function useDebounce<T>(value: T, delay = 300) {
  const debouncedValue = ref(value)

  const timer = ref<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = () => {
    if (timer.value !== null) {
      clearTimeout(timer.value)
      timer.value = null
    }
  }

  watch(
    () => value,
    (newValue) => {
      clearTimer()
      timer.value = setTimeout(() => {
        debouncedValue.value = newValue
        timer.value = null
      }, delay)
    },
  )

  onUnmounted(clearTimer)

  return debouncedValue
}
