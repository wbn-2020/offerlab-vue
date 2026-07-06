import { computed, onMounted, ref } from 'vue'
import { discoveryApi, type DiscoveryMap } from '@/api/discovery'
import { getErrorMessage } from '@/api/client'

export const useDiscoveryMap = () => {
  const data = ref<DiscoveryMap | null>(null)
  const loading = ref(false)
  const error = ref('')

  const load = async () => {
    loading.value = true
    error.value = ''
    try {
      const res = await discoveryApi.getDiscoveryMap()
      data.value = res.data
    } catch (err) {
      error.value = getErrorMessage(err, '发现页暂时不可用')
      data.value = null
    } finally {
      loading.value = false
    }
  }

  const hasItems = computed(() => {
    const map = data.value
    return Boolean(map && [
      map.featuredTopics,
      map.channels,
      map.activeTopics,
      map.searchEntrypoints,
    ].some((items) => items.length > 0))
  })

  const degraded = computed(() => Boolean(data.value?.degraded || error.value))

  onMounted(load)

  return {
    data,
    loading,
    error,
    degraded,
    hasItems,
    reload: load,
  }
}
