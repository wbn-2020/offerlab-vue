import { computed, unref, type MaybeRef } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { feedApi } from '@/api/feed'

export type FeedType = 'following' | 'recommend' | 'latest' | 'hot' | 'featured'

export function useInfiniteFeed(feedType: MaybeRef<FeedType> = 'latest', domain?: MaybeRef<number | undefined>) {
  const pageSize = 20
  const maxPages = 6
  const currentFeed = computed(() => unref(feedType))
  const currentDomain = computed(() => unref(domain))

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
    queryKey: computed(() => ['feed', currentFeed.value, currentDomain.value]),
    queryFn: ({ pageParam }) => {
      const apiMap = {
        following: feedApi.getFollowing,
        recommend: feedApi.getRecommend,
        latest: feedApi.getLatest,
        hot: feedApi.getHot,
        featured: feedApi.getFeatured,
      }
      return apiMap[currentFeed.value](pageParam, pageSize, currentDomain.value)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (
      lastPage.data?.hasMore && lastPage.data?.nextCursor
        ? lastPage.data.nextCursor
        : undefined
    ),
    maxPages,
  })

  const posts = computed(() => {
    const items = data.value?.pages.slice(-maxPages).flatMap(page => page.data?.items || []) || []
    return Array.from(new Map(items.map((post) => {
      const postId = typeof post === 'object' && post !== null && 'postId' in post
        ? post.postId
        : post
      return [String(postId), post]
    })).values())
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
