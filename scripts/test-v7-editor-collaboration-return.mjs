import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const types = read('../src/api/types.ts')
const context = read('../src/utils/editorAssistContext.ts')
const editor = read('../src/views/EditorView.vue')

assert.match(types, /'collaboration_need'/, 'editor context types must include collaboration_need.')
assert.match(types, /needId\?: string/, 'editor context must carry the need id.')
assert.match(types, /'fulfill'/, 'editor actions must include fulfill.')
assert.match(types, /\| 'need'/, 'editor context types must include need.')

assert.match(context, /'collaboration_need'/, 'editor parser must allow collaboration_need.')
assert.match(context, /'fulfill'/, 'editor parser must allow the fulfill action.')
assert.match(context, /ids\.needId && action === 'fulfill'/, 'need context must infer from needId and fulfill.')
assert.match(context, /contextType === 'need'[\s\S]*!context\.needId/, 'need context must require a valid need id.')
assert.match(context, /needId: ids\.needId \|\| undefined/, 'parsed context must retain needId.')

assert.match(editor, /collaborationDeliveryReturnPath/, 'editor must compute a collaboration return destination.')
assert.match(editor, /deliveryPendingReview/, 'review-required content must not be presented as a public delivery.')
assert.match(editor, /deliveryType.*POST[\s\S]*deliveryId/, 'published content must be returned as a delivery candidate.')
assert.match(editor, /postPublishDestination\(postId, reviewRequired\)/, 'post update must use the guarded destination.')
assert.match(editor, /postPublishDestination\(createdPostId, reviewRequired\)/, 'new post publish must use the guarded destination.')
assert.doesNotMatch(editor, /collaborationApi\.needs\.(submit|fulfill)\(/, 'editor publish must not auto-submit a collaboration delivery.')

console.log('v7 editor collaboration return guard passed')
