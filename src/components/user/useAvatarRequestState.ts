import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

export const normalizeAvatarSource = (value: string | null | undefined) => (
  String(value ?? '').trim()
)

export const resolveAvatarFallback = (
  name: string | null | undefined,
  fallback = '?',
) => (
  Array.from(String(name ?? '').trim())[0]
  || Array.from(String(fallback || '').trim())[0]
  || '?'
)

export const resolveAvatarAccessibleLabel = (
  alt: string | null | undefined,
  name: string | null | undefined,
) => {
  if (alt !== undefined && alt !== null) return String(alt).trim()
  const displayName = String(name ?? '').trim()
  return displayName ? `${displayName}的头像` : '用户头像'
}

export const useAvatarRequestState = (
  source: MaybeRefOrGetter<string | null | undefined>,
) => {
  const requestGeneration = ref(0)
  const loadedRequest = ref('')
  const failedRequest = ref('')
  const normalizedSrc = computed(() => normalizeAvatarSource(toValue(source)))
  const requestKey = computed(() => (
    normalizedSrc.value ? `${requestGeneration.value}:${normalizedSrc.value}` : ''
  ))
  const shouldLoadImage = computed(() => (
    Boolean(requestKey.value) && failedRequest.value !== requestKey.value
  ))
  const imageLoaded = computed(() => (
    shouldLoadImage.value && loadedRequest.value === requestKey.value
  ))
  const avatarState = computed(() => {
    if (!normalizedSrc.value) return 'empty'
    if (failedRequest.value === requestKey.value) return 'error'
    return imageLoaded.value ? 'loaded' : 'loading'
  })

  const acceptLoad = (attempt: string) => {
    if (!attempt || attempt !== requestKey.value) return false
    loadedRequest.value = attempt
    return true
  }

  const acceptError = (attempt: string) => {
    if (!attempt || attempt !== requestKey.value) return false
    loadedRequest.value = ''
    failedRequest.value = attempt
    return true
  }

  watch(normalizedSrc, () => {
    requestGeneration.value += 1
    loadedRequest.value = ''
    failedRequest.value = ''
  }, { flush: 'sync' })

  return {
    normalizedSrc,
    requestKey,
    shouldLoadImage,
    imageLoaded,
    avatarState,
    acceptLoad,
    acceptError,
  }
}
