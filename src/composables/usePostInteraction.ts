import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { interactionApi } from '@/api/interaction'
import type { ApiId, Post } from '@/api/types'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { useAuthStore } from '@/stores/auth'
import { rememberPendingInteraction } from '@/utils/pendingInteraction'

type PostUpdater = (postId: ApiId, updater: (post: Post) => void) => void
type InteractionRequestOwner = {
  uid: string
  sessionGeneration: number
}

export function usePostInteraction(updatePost: PostUpdater) {
  const pendingActions = ref(new Set<string>())
  const { requireLogin } = useLoginRedirect()
  const authStore = useAuthStore()

  const actionKey = (kind: 'like' | 'favorite', postId: ApiId) => `${kind}:${postId}`
  const interactionRedirect = (postId: ApiId) => `/post/${encodeURIComponent(String(postId))}`
  const captureRequestOwner = (): InteractionRequestOwner => ({
    uid: String(authStore.user?.uid ?? ''),
    sessionGeneration: authStore.getSessionGeneration(),
  })
  const requestOwnerIsCurrent = (owner: InteractionRequestOwner) => (
    authStore.isLoggedIn
    && owner.uid === String(authStore.user?.uid ?? '')
    && owner.sessionGeneration === authStore.getSessionGeneration()
  )
  const startAction = (key: string) => {
    if (pendingActions.value.has(key)) return false
    pendingActions.value = new Set([...pendingActions.value, key])
    return true
  }
  const finishAction = (key: string) => {
    const next = new Set(pendingActions.value)
    next.delete(key)
    pendingActions.value = next
  }
  const isActionPending = (kind: 'like' | 'favorite', postId: ApiId) => pendingActions.value.has(actionKey(kind, postId))

  const toggleLike = async (post: Post) => {
    const key = actionKey('like', post.postId)
    // 未登录且尚未点赞时先记录「想点赞」意图，登录回到该帖后补点一次（仅记录正向操作，取消赞不重放）。
    if (!authStore.isLoggedIn && !post.myInteraction?.liked) rememberPendingInteraction(post.postId, 'like')
    if (!requireLogin(interactionRedirect(post.postId))) return false
    if (!startAction(key)) return false
    const owner = captureRequestOwner()
    const liked = Boolean(post.myInteraction?.liked)
    updatePost(post.postId, (item) => {
      item.myInteraction = { ...(item.myInteraction ?? { favorited: false }), liked: !liked }
      item.counter.like = Math.max(0, item.counter.like + (liked ? -1 : 1))
    })
    try {
      if (liked) {
        await interactionApi.unlike(post.postId)
      } else {
        await interactionApi.like(post.postId)
      }
      return requestOwnerIsCurrent(owner)
    } catch (error: any) {
      if (requestOwnerIsCurrent(owner)) {
        updatePost(post.postId, (item) => {
          item.myInteraction = { ...(item.myInteraction ?? { favorited: false }), liked }
          item.counter.like = Math.max(0, item.counter.like + (liked ? 1 : -1))
        })
        toast.error(getErrorMessage(error, '点赞操作失败'))
      }
      return false
    } finally {
      finishAction(key)
    }
  }

  const toggleFavorite = async (post: Post) => {
    const key = actionKey('favorite', post.postId)
    // 未登录时记录「想收藏」意图，登录回到该帖后补点一次（仅记录正向操作，取消收藏不重放）。
    if (!authStore.isLoggedIn && !post.myInteraction?.favorited) {
      rememberPendingInteraction(post.postId, 'favorite')
    }
    if (!requireLogin(interactionRedirect(post.postId))) return false
    if (!startAction(key)) return false
    const owner = captureRequestOwner()
    const favorited = Boolean(post.myInteraction?.favorited)
    updatePost(post.postId, (item) => {
      item.myInteraction = { ...(item.myInteraction ?? { liked: false }), favorited: !favorited }
      item.counter.favorite = Math.max(0, item.counter.favorite + (favorited ? -1 : 1))
    })
    try {
      if (favorited) {
        await interactionApi.unfavorite(post.postId)
      } else {
        await interactionApi.favorite(post.postId)
      }
      return requestOwnerIsCurrent(owner)
    } catch (error: any) {
      if (requestOwnerIsCurrent(owner)) {
        updatePost(post.postId, (item) => {
          item.myInteraction = { ...(item.myInteraction ?? { liked: false }), favorited }
          item.counter.favorite = Math.max(0, item.counter.favorite + (favorited ? 1 : -1))
        })
        toast.error(getErrorMessage(error, '收藏操作失败'))
      }
      return false
    } finally {
      finishAction(key)
    }
  }

  return {
    pendingActions,
    isActionPending,
    toggleLike,
    toggleFavorite,
  }
}
