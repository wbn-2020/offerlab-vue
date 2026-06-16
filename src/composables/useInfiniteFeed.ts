import { computed, unref, type MaybeRef } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { feedApi } from '@/api/feed'

export type FeedType = 'following' | 'recommend' | 'latest' | 'hot' | 'featured'

export function useInfiniteFeed(feedType: MaybeRef<FeedType> = 'latest') {
  const pageSize = 20
  const currentFeed = computed(() => unref(feedType))

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: computed(() => ['feed', currentFeed.value]),
    queryFn: ({ pageParam }) => {
      const apiMap = {
        following: feedApi.getFollowing,
        recommend: feedApi.getRecommend,
        latest: feedApi.getLatest,
        hot: feedApi.getHot,
        featured: feedApi.getFeatured,
      }
      return apiMap[currentFeed.value](pageParam, pageSize)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data?.nextCursor,
  })

  const posts = computed(() => {
    return data.value?.pages.flatMap(page => page.data?.items || []) || []
  })

  return {
    posts,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isLoading,
    refetch,
  }
}
