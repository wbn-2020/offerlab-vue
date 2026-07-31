import { computed, onMounted, onUnmounted, ref } from 'vue'
import { domainApi, localDomainConfigs, type PublicDomainConfig } from '@/api/domains'

const domainCatalog = ref<PublicDomainConfig[]>([...localDomainConfigs])
const catalogLoading = ref(false)
let catalogLoaded = false
let catalogNeedsRetry = false
let catalogRequest: Promise<PublicDomainConfig[]> | null = null
let catalogRetryTimer: ReturnType<typeof setTimeout> | null = null
let activeConsumers = 0
const CATALOG_RETRY_MS = 30_000

const clearCatalogRetry = () => {
  if (!catalogRetryTimer) return
  clearTimeout(catalogRetryTimer)
  catalogRetryTimer = null
}

const scheduleCatalogRetry = () => {
  if (catalogRetryTimer || activeConsumers === 0 || typeof window === 'undefined') return
  catalogRetryTimer = setTimeout(() => {
    catalogRetryTimer = null
    if (activeConsumers === 0) return
    void loadDomainCatalog(true)
  }, CATALOG_RETRY_MS)
}

const loadDomainCatalog = (force = false): Promise<PublicDomainConfig[]> => {
  if (catalogRequest) return catalogRequest
  if (catalogLoaded && !force) return Promise.resolve(domainCatalog.value)

  catalogLoading.value = true
  catalogRequest = domainApi.listPublic()
    .then((result) => {
      domainCatalog.value = result.data.length ? result.data : [...localDomainConfigs]
      catalogLoaded = result.source === 'remote'
      catalogNeedsRetry = !catalogLoaded
      if (catalogLoaded) {
        clearCatalogRetry()
      } else {
        scheduleCatalogRetry()
      }
      return domainCatalog.value
    })
    .finally(() => {
      catalogLoading.value = false
      catalogRequest = null
    })

  return catalogRequest
}

export const useDomainCatalog = () => {
  let consumerMounted = false

  onMounted(() => {
    consumerMounted = true
    activeConsumers += 1
    if (catalogNeedsRetry) scheduleCatalogRetry()
  })

  onUnmounted(() => {
    if (!consumerMounted) return
    consumerMounted = false
    activeConsumers = Math.max(0, activeConsumers - 1)
    if (activeConsumers === 0) clearCatalogRetry()
  })

  return {
    domains: computed(() => domainCatalog.value),
    loading: computed(() => catalogLoading.value),
    loadDomains: loadDomainCatalog,
    refreshDomains: () => loadDomainCatalog(true),
  }
}
