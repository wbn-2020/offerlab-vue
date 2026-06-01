import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const view = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')

assert.match(view, /error:\s*postError/, 'PostDetailView must keep post load errors')
assert.match(view, /retry:\s*false/, 'PostDetailView must not retry 403 or 404 detail responses into a long loading state')
assert.match(view, /postUnavailableTitle/, 'PostDetailView must derive a post unavailable title')
assert.match(view, /无权访问/, 'PostDetailView must render a forbidden state')
assert.match(view, /内容不可见/, 'PostDetailView must render an unavailable content state')
assert.match(view, /commentsErrorMessage = ref\(''\)/, 'PostDetailView must keep a comment load error state')
assert.match(view, /v-else-if="commentsErrorMessage"/, 'PostDetailView must render comment errors instead of an empty tree')
assert.match(view, /无权访问评论，内容不可见。/, 'PostDetailView must show a clear forbidden comment message')
assert.match(view, /comments\.value = \[\]/, 'PostDetailView must clear comments when reset loading fails')
assert.match(view, /hasMoreComments\.value = false/, 'PostDetailView must stop pagination after comment visibility failures')

console.log('post detail visibility guard passed')
