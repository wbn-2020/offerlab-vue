import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const postApi = readFileSync(new URL('../src/api/post.ts', import.meta.url), 'utf8')
const interactionApi = readFileSync(new URL('../src/api/interaction.ts', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const postDetail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')

assert.match(postApi, /interface PostCreateResult/, 'post API must type the create/update response')
assert.match(postApi, /reviewRequired\?: boolean/, 'post API response must expose reviewRequired')
assert.match(postApi, /create: \(req: PostCreateReq\): Promise<Result<PostCreateResult>>/, 'create post must return reviewRequired state')
assert.match(postApi, /update: \(postId: ApiId, req: PostUpdateReq\): Promise<Result<PostCreateResult>>/, 'update post must return reviewRequired state')

assert.match(interactionApi, /interface CommentCreateResult/, 'comment API must type the comment response')
assert.match(interactionApi, /commentId: ApiId/, 'comment response must keep commentId')
assert.match(interactionApi, /reviewRequired\?: boolean/, 'comment response must expose reviewRequired')
assert.match(interactionApi, /Promise<Result<CommentCreateResult>>/, 'comment API must return typed moderation result')

assert.match(editor, /const reviewRequired = Boolean\(res\.data\?\.reviewRequired\)/, 'editor must read reviewRequired from post response')
assert.match(editor, /已提交审核，通过后对外展示/, 'editor must tell users when a post enters review')
assert.match(editor, /router\.push\(reviewRequired \? '\/me'/, 'editor must avoid opening a public detail page for reviewing posts')

assert.match(postDetail, /const res = await interactionApi\.comment\(postId\.value, commentText\.value\)/, 'root comments must inspect the create response')
assert.match(postDetail, /res\.data\?\.reviewRequired[\s\S]*评论已提交审核/, 'root comments must show review feedback')
assert.match(postDetail, /res\.data\?\.reviewRequired[\s\S]*回复已提交审核/, 'replies must show review feedback')
assert.match(postDetail, /else \{[\s\S]*post\.value\.counter\.comment \+= 1[\s\S]*await loadComments/, 'visible comments should still update count and reload')

console.log('moderation review flow guard passed')
