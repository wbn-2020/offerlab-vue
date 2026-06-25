import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { interactionApi } from '@/api/interaction'
import type { ApiId, Post } from '@/api/types'
import { useLoginRedirect } from '@/composables/useLoginRedirect'

type PostUpdater = (postId: ApiId, updater: (post: Post) => void) => void

export function usePostInteraction(updatePost: PostUpdater) {
  const pendingActions = ref(new Set<string>())
  const { requireLogin } = useLoginRedirect()

  const actionKey = (kind: 'like' | 'favorite', postId: ApiId) => `${kind}:${postId}`
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
    if (!requireLogin()) return false
    if (!startAction(key)) return false
    const liked = Boolean(post.myInteraction?.liked)
    updatePost(post.postId, (item) => {
      item.myInteraction = { ...(item.myInteraction ?? { favorited: false }), liked: !liked }
      item.counter.like = Math.max(0, item.counter.like + (liked ? -1 : 1))
    })
    try {
      liked ? await interactionApi.unlike(post.postId) : await interactionApi.like(post.postId)
      return true
    } catch (error: any) {
      updatePost(post.postId, (item) => {
        item.myInteraction = { ...(item.myInteraction ?? { favorited: false }), liked }
        item.counter.like = Math.max(0, item.counter.like + (liked ? 1 : -1))
      })
      toast.error(getErrorMessage(error, '点赞操作失败'))
      return false
    } finally {
      finishAction(key)
    }
  }

  const toggleFavorite = async (post: Post) => {
    const key = actionKey('favorite', post.postId)
    if (!requireLogin()) return false
    if (!startAction(key)) return false
    const favorited = Boolean(post.myInteraction?.favorited)
    updatePost(post.postId, (item) => {
      item.myInteraction = { ...(item.myInteraction ?? { liked: false }), favorited: !favorited }
      item.counter.favorite = Math.max(0, item.counter.favorite + (favorited ? -1 : 1))
    })
    try {
      favorited ? await interactionApi.unfavorite(post.postId) : await interactionApi.favorite(post.postId)
      return true
    } catch (error: any) {
      updatePost(post.postId, (item) => {
        item.myInteraction = { ...(item.myInteraction ?? { liked: false }), favorited }
        item.counter.favorite = Math.max(0, item.counter.favorite + (favorited ? 1 : -1))
      })
      toast.error(getErrorMessage(error, '收藏操作失败'))
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
