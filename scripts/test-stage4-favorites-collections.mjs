import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const contentSeriesApi = readFileSync(new URL('../src/api/contentSeries.ts', import.meta.url), 'utf8')
const workbench = readFileSync(new URL('../src/views/SeriesWorkbenchView.vue', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const meProfile = readFileSync(new URL('../src/views/MeProfileView.vue', import.meta.url), 'utf8')
const userProfile = readFileSync(new URL('../src/views/UserProfileView.vue', import.meta.url), 'utf8')
const postDetail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')
const collectionDetail = readFileSync(new URL('../src/views/CollectionDetailView.vue', import.meta.url), 'utf8')

assert.match(router, /path:\s*'\/series\/workbench'/, 'legacy /series/workbench route must remain reachable')
assert.match(router, /path:\s*'\/collections\/:id'/, 'public collection detail route must remain reachable')
assert.doesNotMatch(
  router.match(/path:\s*'\/collections\/:id'[\s\S]*?(?=\n\s*\{\n\s*path:|$)/)?.[0] || '',
  /requiresAuth:\s*true/,
  'public collection detail route must not require login',
)
assert.match(router, /title:\s*'合集工作台'/, 'series workbench route must use collection wording in visible meta')
assert.match(contentSeriesApi, /visibility:\s*'public'\s*\|\s*'private'/, 'content series contract must expose public/private collection visibility')
assert.match(contentSeriesApi, /getPublicDetail:\s*async/, 'content series API must expose public collection detail')
assert.match(contentSeriesApi, /listPublicByUser:\s*async/, 'content series API must expose public collections by author')
assert.match(contentSeriesApi, /listPublicPosts:\s*async/, 'content series API must expose public collection posts')

for (const [name, source] of [
  ['SeriesWorkbenchView', workbench],
  ['EditorView', editor],
]) {
  assert.match(source, /合集/, `${name} must expose collection wording`)
  assert.doesNotMatch(source, /系列工作台|创建系列|编辑系列|保存系列|我的系列|系列标题|系列简介|系列归属|系列列表/, `${name} must not expose legacy series product wording`)
}

assert.match(workbench, /公开合集|私密合集|可见性/, 'collection workbench must let users understand public/private visibility')
assert.match(editor, /合集归属|暂不归入合集|合集工作台/, 'editor must support assigning content to a collection')
assert.match(meProfile, /收藏回看|全部收藏|默认收藏夹|整理合集/, 'me profile must expose a real favorites revisit flow')
assert.match(meProfile, /route\.query\.tab/, 'me profile must support deep-linking to the favorites tab')
assert.match(userProfile, /公开合集|contentSeriesApi\.listPublicByUser/, 'public profile must load and render public collections')
assert.doesNotMatch(userProfile, /contentSeriesApi\.listMine/, 'public profile must not use private/local collection fallback as public author assets')
assert.match(userProfile, /`\/collections\/\$\{collection\.id\}`/, 'public profile collection cards must link to the public collection detail route')
assert.match(postDetail, /查看我的收藏|to="\/me\?tab=favorites"/, 'post detail must link successful favorites to the revisit entry')
assert.match(collectionDetail, /contentSeriesApi\.getPublicDetail/, 'collection detail must load public collection metadata')
assert.match(collectionDetail, /contentSeriesApi\.listPublicPosts/, 'collection detail must load public collection posts')
assert.match(collectionDetail, /公开合集|合集内容/, 'collection detail must expose collection wording')

console.log('stage4 favorites and collections guard passed')
