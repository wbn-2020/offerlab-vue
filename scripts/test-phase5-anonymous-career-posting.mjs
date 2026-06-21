import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const readSource = (path) => readFileSync(new URL(path, root), 'utf8')

const editor = readSource('src/views/EditorView.vue')
const postApi = readSource('src/api/post.ts')
const types = readSource('src/api/types.ts')
const adapters = readSource('src/api/adapters.ts')
const postCard = readSource('src/components/post/PostCard.vue')
const detail = readSource('src/views/PostDetailView.vue')

assert.match(types, /anonymous\?:\s*boolean/, 'Post type must expose anonymous?: boolean.')
assert.match(postApi, /anonymous\?:\s*boolean/, 'Post create/update request types must support anonymous?: boolean.')
assert.match(adapters, /const anonymous\s*=\s*Boolean\(/, 'adaptPost must map anonymous from backend response or extension.')

assert.match(editor, /anonymousCareerPost/, 'EditorView must keep explicit anonymousCareerPost state.')
assert.match(editor, /selectedDomain\s*===\s*DOMAIN\.CAREER/, 'Anonymous toggle must be gated to the CAREER domain.')
assert.match(editor, /anonymous:\s*selectedDomain\.value\s*===\s*DOMAIN\.CAREER\s*\?\s*anonymousCareerPost\.value\s*:\s*false/, 'Editor requests must only send anonymous=true for CAREER posts.')

assert.match(postCard, /post\.anonymous|author\.nickname/, 'PostCard must be able to display the backend-masked anonymous author.')
assert.match(detail, /post\.anonymous|author\.nickname/, 'PostDetailView must be able to display the backend-masked anonymous author.')
assert.match(postCard, /isAnonymousMaskedAuthor/, 'PostCard must explicitly detect backend-masked anonymous authors.')
assert.match(postCard, /canFollowAuthor/, 'PostCard follow button must be guarded by author-interaction permission.')
assert.match(postCard, /v-if="canFollowAuthor"/, 'PostCard must hide follow button for masked anonymous authors.')
assert.match(postCard, /if\s*\(\s*!canFollowAuthor\.value\s*\)\s*return/, 'PostCard follow handler must not call follow APIs for masked anonymous authors.')

assert.match(detail, /isAnonymousMaskedAuthor/, 'PostDetailView must explicitly detect backend-masked anonymous authors.')
assert.match(detail, /canOpenAuthorProfile/, 'PostDetailView must gate author profile links for masked anonymous authors.')
assert.match(detail, /canFollowAuthor/, 'PostDetailView follow button must be guarded by author-interaction permission.')
assert.match(detail, /v-if="canOpenAuthorProfile"/, 'PostDetailView must render author RouterLink only when profile navigation is allowed.')
assert.match(detail, /v-if="canFollowAuthor"/, 'PostDetailView must hide follow button for masked anonymous authors.')
assert.match(detail, /if\s*\(\s*!canFollowAuthor\.value\s*\)\s*return/, 'PostDetailView follow handler must not call follow APIs for masked anonymous authors.')
assert.doesNotMatch(detail, /`\/u\/\$\{post\.author\.uid\}`/, 'PostDetailView must not build unconditional /u/{uid} links for anonymous authors.')

console.log('Phase 5 anonymous career posting frontend guard passed.')
