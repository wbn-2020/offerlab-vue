import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
const adapters = readFileSync(new URL('../src/api/adapters.ts', import.meta.url), 'utf8')
const postApi = readFileSync(new URL('../src/api/post.ts', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')

assert.match(types, /interface PostVersionHistory/, 'frontend must type post version history rows')
for (const field of [
  'postId',
  'authorId',
  'editorUid',
  'baseVersion',
  'contentSummary',
  'tags',
  'changeSummary',
  'createdAt',
]) {
  assert.match(types, new RegExp(field), `PostVersionHistory must expose ${field}`)
}

assert.match(adapters, /adaptPostVersionHistory/, 'version history responses must be adapted')
assert.match(adapters, /createdAt:\s*adaptTime\(raw\?\.createdAt \?\? raw\?\.createTime\)/, 'adapter must normalize backend createTime into createdAt')
assert.match(adapters, /tags: Array\.isArray\(raw\?\.tags\) \? raw\.tags\.map\(adaptTag\) : \[\]/, 'adapter must normalize version tag snapshots')
assert.match(postApi, /listVersions/, 'post API must expose listVersions')
assert.match(postApi, /\/api\/v1\/posts\/\$\{postId\}\/versions/, 'post API must call the stable versions endpoint')
assert.match(postApi, /res\.data\.map\(adaptPostVersionHistory\)/, 'post API must adapt version history rows')

assert.match(detail, /canViewVersionHistory/, 'post detail must compute version history visibility')
assert.match(detail, /isOwnPost\.value \|\| isContentModerator\.value/, 'history button must be author or content moderator only')
assert.match(detail, /openVersionHistory/, 'post detail must open the history dialog')
assert.match(detail, /postApi\.listVersions\(post\.value\.postId, 12\)/, 'post detail must load recent history rows')
assert.match(detail, /v-if="isVersionDialogOpen"/, 'post detail must render a version history dialog')
assert.match(detail, /role="dialog"/, 'version history dialog must expose dialog semantics')
assert.match(detail, /v-for="item in versionHistories"/, 'dialog must render history rows')
assert.match(detail, /changeSummaryText\(item\.changeSummary\)/, 'dialog must explain changed fields')
assert.match(detail, /versionHistories\.value = \[\]/, 'route changes must clear stale history rows')
assert.match(detail, /versionLoadAttempted\.value = false/, 'route changes must reset history loaded state')
assert.doesNotMatch(detail, /Legacy misplaced version-history block/, 'legacy misplaced dialog block must not remain in the report form')
assert.doesNotMatch(detail, /Disabled duplicate textarea attributes/, 'duplicate textarea fragments must not remain in the report form')

console.log('post version history guard passed')
