import { ref, computed } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { feedApi } from '@/api/feed'
import type { Post } from '@/api/types'

export function useInfiniteFeed(feedType: 'following' | 'recommend' | 'latest' | 'hot' = 'latest') {
  const pageSize = 20

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['feed', feedType],
    queryFn: ({ pageParam }) => {
      const apiMap = {
        following: feedApi.getFollowing,
        recommend: feedApi.getRecommend,
        latest: feedApi.getLatest,
        hot: feedApi.getHot,
      }
      return apiMap[feedType](pageParam, pageSize)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data?.nextCursor,
  })

  const posts = computed(() => {
    return data.value?.pages.flatMap(page => page.data?.items || []) || []
  })

  return {
    posts,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
  }
}
