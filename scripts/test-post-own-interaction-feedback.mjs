import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const postDetail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')

assert.match(postDetail, /interactionFeedback\s*=\s*ref\(''\)/, 'PostDetailView must keep visible interaction feedback')
assert.match(postDetail, /role="status"[\s\S]*aria-live="polite"[\s\S]*\{\{ interactionFeedback \}\}/, 'PostDetailView must expose interaction feedback to assistive tech')
assert.match(postDetail, /已点赞自己的帖子，计数已更新/, 'own-post like success must explain that the counter updated')
assert.match(postDetail, /已收藏自己的帖子，已加入回看/, 'own-post favorite success must explain the saved state')
assert.match(postDetail, /toast\.success\(message\)/, 'PostDetailView must toast successful like/favorite changes')
assert.match(postDetail, /post\.value\.counter\.like = Math\.max\(0, post\.value\.counter\.like \+ \(liked \? -1 : 1\)\)/, 'like counter must be updated optimistically after success')
assert.match(postDetail, /post\.value\.counter\.favorite = Math\.max\(0, post\.value\.counter\.favorite \+ \(favorited \? -1 : 1\)\)/, 'favorite counter must be updated optimistically after success')

console.log('post own interaction feedback guard passed')
