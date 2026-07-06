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
assert.match(postDetail, /当前版本先展示关注讨论入口，等帖子级关注接口承接后再保存关注状态。/, 'P0 must not claim discussion-follow persistence before backend support')
assert.doesNotMatch(postDetail, /已关注讨论/, 'Post detail must not fake a persisted discussion-follow state')

assert.match(commentTree, /featuredComments/, 'Comment tree must surface featured comments from existing signals')
assert.match(commentTree, /canMatchAuthorUid/, 'Comment tree must guard author-response matching for anonymous or masked authors')
assert.match(commentTree, /热门评论/, 'Comment tree must label hot comments')
assert.match(commentTree, /作者回应/, 'Comment tree must label author responses')
assert.match(commentTree, /回复 \{\{ branchReplyCount/, 'Comment tree must show existing reply counts')
assert.doesNotMatch(commentTree, /有帮助|作者置顶|置顶成功|保存成功/, 'P0 comment tree must not expose helpful/pinned fake loops')

assert.match(interactionBar, /收藏内容/, 'Interaction bar must define favorite as saved content')
assert.match(interactionBar, /不默认提醒新回复/, 'Interaction bar must not imply favorites subscribe to reply notifications')

assert.match(topicDetail, /关注主题/, 'Topic detail must define topic follow as theme follow')
assert.match(topicDetail, /不会自动关注某个帖子的后续回复/, 'Topic follow copy must not imply discussion follow')

console.log('phase8 post detail discussion loop guard passed')
