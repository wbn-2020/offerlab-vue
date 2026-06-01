import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const composable = readFileSync(new URL('../src/composables/usePostInteraction.ts', import.meta.url), 'utf8')
const postCard = readFileSync(new URL('../src/components/post/PostCard.vue', import.meta.url), 'utf8')
const interactionBar = readFileSync(new URL('../src/components/post/InteractionBar.vue', import.meta.url), 'utf8')
const commentTree = readFileSync(new URL('../src/components/post/CommentTree.vue', import.meta.url), 'utf8')
const postDetail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')
const home = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const search = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const tagDetail = readFileSync(new URL('../src/views/TagDetailView.vue', import.meta.url), 'utf8')
const meProfile = readFileSync(new URL('../src/views/MeProfileView.vue', import.meta.url), 'utf8')

assert.match(composable, /pendingActions\s*=\s*ref\(new Set<string>\(\)\)/, 'post interaction composable must keep per-action pending state')
assert.match(composable, /if \(!startAction\(key\)\) return false/, 'post interaction composable must block duplicate actions')
assert.match(composable, /isActionPending/, 'post interaction composable must expose pending status to views')

assert.match(postCard, /likePending\?: boolean/, 'PostCard must accept a like pending prop')
assert.match(postCard, /favoritePending\?: boolean/, 'PostCard must accept a favorite pending prop')
assert.match(postCard, /:disabled="likePending"/, 'PostCard like button must be disabled while pending')
assert.match(postCard, /:disabled="favoritePending"/, 'PostCard favorite button must be disabled while pending')
assert.match(postCard, /:aria-busy="likePending"/, 'PostCard like button must expose busy state')
assert.match(postCard, /:aria-busy="favoritePending"/, 'PostCard favorite button must expose busy state')
assert.match(postCard, /action-label">浏览/, 'PostCard metrics must keep visible labels on compact screens')
assert.match(postCard, /action-label">点赞/, 'PostCard like action must keep visible labels on compact screens')
assert.match(postCard, /action-label">评论/, 'PostCard comments metric must keep visible labels on compact screens')
assert.match(postCard, /action-label">收藏/, 'PostCard favorite action must keep visible labels on compact screens')
assert.match(postCard, /white-space:\s*nowrap/, 'PostCard interaction buttons must avoid icon/number wrapping')

assert.match(interactionBar, /likePending\?: boolean/, 'InteractionBar must accept a like pending prop')
assert.match(interactionBar, /favoritePending\?: boolean/, 'InteractionBar must accept a favorite pending prop')
assert.match(interactionBar, /:disabled="likePending"/, 'Post detail like button must be disabled while pending')
assert.match(interactionBar, /:disabled="favoritePending"/, 'Post detail favorite button must be disabled while pending')
assert.match(interactionBar, /action-label">浏览/, 'Post detail metrics must keep visible labels on compact screens')
assert.match(interactionBar, /action-label">点赞/, 'Post detail like action must keep visible labels on compact screens')
assert.match(interactionBar, /action-label">评论/, 'Post detail comments metric must keep visible labels on compact screens')
assert.match(interactionBar, /action-label">收藏/, 'Post detail favorite action must keep visible labels on compact screens')
assert.match(interactionBar, /white-space:\s*nowrap/, 'Post detail interaction actions must avoid icon/number wrapping')

assert.match(postDetail, /:like-pending="isTogglingLike"/, 'PostDetailView must pass like pending state into InteractionBar')
assert.match(postDetail, /:favorite-pending="isTogglingFavorite"/, 'PostDetailView must pass favorite pending state into InteractionBar')
assert.match(postDetail, /ref="commentTreeRef"/, 'PostDetailView must keep a ref to clear comment like pending state')
assert.match(postDetail, /:can-like-comments="authStore\.isLoggedIn"/, 'Comment likes should use the login-gated interaction path')
assert.match(postDetail, /markCommentLikeSettled\(commentId\)/, 'PostDetailView must clear comment like pending state after request completion')

assert.match(commentTree, /pendingCommentLikes\s*=\s*ref\(new Set<string>\(\)\)/, 'CommentTree must keep per-comment pending state')
assert.match(commentTree, /if \(!startCommentLike\(comment\.commentId\)\) return/, 'CommentTree must block duplicate root comment like clicks')
assert.match(commentTree, /:disabled="isCommentLikePending\(comment\.commentId\)"/, 'Root comment like button must be disabled while pending')
assert.match(commentTree, /:disabled="isCommentLikePending\(reply\.commentId\)"/, 'Reply like button must be disabled while pending')
assert.match(commentTree, /defineExpose\(\{ markCommentLikeSettled \}\)/, 'CommentTree must expose a way for the parent to clear pending state')

for (const [name, source] of [['HomeView', home], ['SearchView', search], ['TagDetailView', tagDetail]]) {
  assert.match(source, /isActionPending/, `${name} must read pending state from usePostInteraction`)
  assert.match(source, /:like-pending="isActionPending\('like', post\.postId\)"/, `${name} must pass like pending state to PostCard`)
  assert.match(source, /:favorite-pending="isActionPending\('favorite', post\.postId\)"/, `${name} must pass favorite pending state to PostCard`)
}

assert.match(meProfile, /isActionPending/, 'MeProfileView must read pending state from usePostInteraction')
assert.match(meProfile, /likePending: isActionPending\('like', post\.postId\)/, 'MeProfileView render function must pass like pending state to PostCard')
assert.match(meProfile, /favoritePending: isActionPending\('favorite', post\.postId\)/, 'MeProfileView render function must pass favorite pending state to PostCard')

console.log('post interaction pending guard passed')
