import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const postDetail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')
const commentTree = readFileSync(new URL('../src/components/post/CommentTree.vue', import.meta.url), 'utf8')
const interactionBar = readFileSync(new URL('../src/components/post/InteractionBar.vue', import.meta.url), 'utf8')
const topicDetail = readFileSync(new URL('../src/views/TopicDetailView.vue', import.meta.url), 'utf8')

assert.match(postDetail, /discussion-follow-panel/, 'Post detail must expose a discussion follow/reminder panel')
assert.match(postDetail, /关注讨论/, 'Post detail must use the explicit discussion-follow language')
assert.match(postDetail, /收藏只保存内容，不会默认开启新回复提醒。/, 'Post detail must distinguish favorites from reply notifications')
assert.match(postDetail, /通知偏好/, 'Discussion reminder copy must point at notification preferences')
assert.match(postDetail, /getDiscussionFollowStatus/, 'Post detail must load persisted discussion-follow state')
assert.match(postDetail, /followDiscussion\(post\.value\.postId\)/, 'Post detail must persist discussion follow')
assert.match(postDetail, /unfollowDiscussion\(post\.value\.postId\)/, 'Post detail must persist discussion unfollow')
assert.match(postDetail, /已关注讨论/, 'Post detail must expose the persisted discussion-follow state')

assert.match(commentTree, /featuredComments/, 'Comment tree must surface featured comments from existing signals')
assert.match(commentTree, /canMatchAuthorUid/, 'Comment tree must guard author-response matching for anonymous or masked authors')
assert.match(commentTree, /热门评论/, 'Comment tree must label hot comments')
assert.match(commentTree, /作者回应/, 'Comment tree must label author responses')
assert.match(commentTree, /回复 \{\{ branchReplyCount/, 'Comment tree must show existing reply counts')
assert.match(commentTree, /v-if="canMarkHelpfulComments"/, 'Helpful actions must be permission-gated')
assert.match(commentTree, /v-if="canManageQualitySignals"/, 'Pinned and featured actions must be permission-gated')
assert.match(commentTree, /emit\('helpful-comment'/, 'Helpful actions must use the persisted parent request path')
assert.match(commentTree, /emit\('pin-comment'/, 'Pinned actions must use the persisted parent request path')
assert.match(commentTree, /emit\('feature-comment'/, 'Featured actions must use the persisted parent request path')

assert.match(interactionBar, /收藏内容/, 'Interaction bar must define favorite as saved content')
assert.match(interactionBar, /不默认提醒新回复/, 'Interaction bar must not imply favorites subscribe to reply notifications')

assert.match(topicDetail, /关注主题/, 'Topic detail must define topic follow as theme follow')
assert.match(topicDetail, /不会自动关注某个帖子的后续回复/, 'Topic follow copy must not imply discussion follow')

console.log('phase8 post detail discussion loop guard passed')
