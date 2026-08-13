import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const meProfile = read('src/views/MeProfileView.vue')
const userProfile = read('src/views/UserProfileView.vue')
const collectionDetail = read('src/views/CollectionDetailView.vue')
const contentSeriesApi = read('src/api/contentSeries.ts')

has(meProfile, /内容资产/, 'my profile must expose a content asset area, not only activity tabs.')
has(meProfile, /私密合集/, 'owner view must show private content-series/list assets.')
has(meProfile, /未整理收藏/, 'owner view must expose unorganized favorites/read-later as a first-class entry.')
has(meProfile, /稍后读/, 'owner view must preserve read-later language for default saved content.')
has(meProfile, /const privateCollectionCount[\s\S]*ownerCollections[\s\S]*visibility === 'private'/, 'owner private collection count must come from owner-visible private content series.')
has(meProfile, /ownerCollections\.value = res\.data \|\| \[\]/, 'owner collections must not be filtered through public-only governance before owner-only display.')
has(meProfile, /myCollections\.value = filterVisibleCollections\(res\.data \|\| \[\]\)/, 'public creator collection signals must derive from governance-filtered collections.')
has(meProfile, /profileNextAction/, 'owner profile must expose one computed next action.')
has(meProfile, /近期资产/, 'owner profile must surface recent assets near the first viewport.')
has(meProfile, /v-if="hasAnyAssets"/, 'owner profile must not render an all-zero asset module.')
has(meProfile, /<details class="profile-workspace-group">/, 'owner profile must collapse low-frequency workspaces.')
has(meProfile, /账号与治理[\s\S]*维护与账号管理/, 'owner profile must group maintenance, governance, and account tools.')

has(userProfile, /公开内容资产/, 'visitor profile must present public content assets as a long-term entry.')
has(userProfile, /仅展示公开且通过治理过滤的内容/, 'visitor profile must explicitly state the public governance boundary.')
has(userProfile, /filterVisiblePosts\(posts\.value\)/, 'visitor representative assets must be based on filtered public posts.')
has(userProfile, /filterVisibleCollections\(res\.data \|\| \[\]\)/, 'visitor public collections must be filtered before display.')

has(collectionDetail, /公开内容资产/, 'public collection detail should be framed as a public content asset.')
has(collectionDetail, /只展示公开且通过治理过滤的内容/, 'public collection detail must disclose that hidden/restricted/reviewing items are not listed.')
has(collectionDetail, /filterVisiblePosts\(page\?\.items \|\| \[\]\)/, 'collection detail must locally filter visible posts before rendering.')
has(contentSeriesApi, /export const isPublicContentSeriesPostVisible[\s\S]*isPublicPostVisible/, 'content-series public posts must expose a shared governance guard.')
has(contentSeriesApi, /listPublicPosts[\s\S]*filter\(isPublicContentSeriesPostVisible\)/, 'content-series public posts API must filter posts before returning to pages.')

for (const [name, source] of [
  ['MeProfileView.vue', meProfile],
  ['UserProfileView.vue', userProfile],
  ['CollectionDetailView.vue', collectionDetail],
]) {
  missing(source, /付费|会员|订阅|课程|广告|收益|专业认证|权威资料库|专业背书|CodeCoachAI/, `${name} must not drift into monetization, course, certification, or private-training wording.`)
}

console.log('Phase 13 profile asset guards passed.')
