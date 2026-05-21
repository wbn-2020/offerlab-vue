import { ref, watch } from 'vue'

export function useDebounce<T>(value: T, delay = 300) {
  const debouncedValue = ref(value)

  const timer = ref<ReturnType<typeof setTimeout> | null>(null)

  watch(
    () => value,
    (newValue) => {
      if (timer.value) clearTimeout(timer.value)
      timer.value = setTimeout(() => {
        debouncedValue.value = newValue
      }, delay)
    },
  )

  return debouncedValue
}
