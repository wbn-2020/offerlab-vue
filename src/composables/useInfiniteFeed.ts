import { computed, unref, type MaybeRef } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { feedApi } from '@/api/feed'
import { useAuthStore } from '@/stores/auth'

export type FeedType = 'following' | 'recommend' | 'latest' | 'hot' | 'featured'

export function useInfiniteFeed(feedType: MaybeRef<FeedType> = 'latest', domain?: MaybeRef<number | undefined>) {
  const authStore = useAuthStore()
  const pageSize = 20
  // 保留足够多的分页，避免滚动一段距离后再往回翻时前面的内容被丢弃（旧值 6 页 ≈ 120 条就会掉）。
  const maxPages = 25
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
    queryKey: computed(() => ['feed', currentFeed.value, currentDomain.value, authStore.sessionQueryScope]),
    enabled: computed(() => authStore.ready),
    // 会话代际在首屏 hydrate 完成时变化；enabled 门禁保证首次请求就带最终代际，
    // 不会出现"匿名代际请求 + 登录代际重发"的首屏双请求。
    staleTime: 30_000,
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
