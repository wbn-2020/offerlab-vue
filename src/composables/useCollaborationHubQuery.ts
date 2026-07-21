import { reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildCollaborationHubQuery,
  parseCollaborationHubQuery,
  type CollaborationHubQueryState,
} from '@/utils/collaborationRoutes'

export const useCollaborationHubQuery = () => {
  const route = useRoute()
  const router = useRouter()
  const queryState = reactive<CollaborationHubQueryState>(
    parseCollaborationHubQuery(route.query),
  )

  const syncFromRoute = () => {
    Object.assign(queryState, parseCollaborationHubQuery(route.query))
  }

  const replaceQuery = async (
    patch: Partial<CollaborationHubQueryState>,
  ) => {
    const nextState: CollaborationHubQueryState = {
      ...queryState,
      ...patch,
    }
    await router.replace({
      path: '/collaboration',
      query: {
        keyword: route.query.keyword,
        contentFormat: route.query.contentFormat,
        sourceType: route.query.sourceType,
        ...buildCollaborationHubQuery(nextState),
      },
    })
  }

  watch(() => route.query, syncFromRoute, { deep: true })

  return {
    queryState,
    replaceQuery,
    syncFromRoute,
  }
}
