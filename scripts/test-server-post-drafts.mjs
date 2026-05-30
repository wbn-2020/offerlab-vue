import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const postApi = readFileSync(new URL('../src/api/post.ts', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')

assert.match(postApi, /interface PostDraft/, 'post API must type server drafts')
for (const field of [
  'sourcePostId',
  'postType',
  'title',
  'content',
  'tagIds',
  'tagNames',
  'updateTime',
]) {
  assert.match(postApi, new RegExp(field), `PostDraft must expose ${field}`)
}
assert.match(postApi, /draftId\?: ApiId/, 'post create/update requests must carry draftId')
assert.match(postApi, /listDrafts/, 'post API must list server drafts')
assert.match(postApi, /getDraft/, 'post API must load a server draft')
assert.match(postApi, /getLatestDraftBySourcePost/, 'post API must load edit drafts by source post')
assert.match(postApi, /saveDraft/, 'post API must save server drafts')
assert.match(postApi, /deleteDraft/, 'post API must delete server drafts')
assert.match(postApi, /\/api\/v1\/post-drafts/, 'server draft endpoint path must stay stable')
assert.match(postApi, /adaptPostDraft/, 'server draft response must be adapted')
assert.match(editor, /type PostDraft/, 'editor must import PostDraft type')
assert.match(editor, /serverDrafts = ref<PostDraft\[\]>\(\[\]\)/, 'editor must keep server draft list state')
assert.match(editor, /serverDraftId = ref\(''\)/, 'editor must track current server draft id')
assert.match(editor, /selectedDraftId = ref\(''\)/, 'editor must track selected draft id')
assert.match(editor, /服务端草稿/, 'editor must expose server draft selector')
assert.match(editor, /currentDraftReq/, 'editor must build a stable draft payload')
assert.match(editor, /applyDraft/, 'editor must apply server drafts into the form')
assert.match(editor, /loadServerDrafts/, 'editor must load server drafts for new posts')
assert.match(editor, /loadSelectedDraft/, 'editor must restore selected server drafts')
assert.match(editor, /loadLatestSourceDraft/, 'editor must restore edit drafts by source post')
assert.match(editor, /restoreLocalDraft/, 'editor must keep local fallback restore')
assert.match(editor, /postApi\.saveDraft\(currentDraftReq\(\)\)/, 'save button must sync to the server')
assert.match(editor, /draftId: serverDraftId\.value \|\| undefined/, 'publish/update request must include draftId')
assert.match(editor, /safeStorage\.remove\(localDraftKey\(\)\)/, 'publish/update success must clear local fallback draft')

console.log('server post drafts guard passed')
