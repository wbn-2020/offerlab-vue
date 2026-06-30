import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const header = read('../src/components/layout/AppHeader.vue')
const home = read('../src/views/HomeView.vue')
const explore = read('../src/views/ExploreView.vue')
const editor = read('../src/views/EditorView.vue')
const search = read('../src/views/SearchView.vue')
const userProfile = read('../src/views/UserProfileView.vue')
const meProfile = read('../src/views/MeProfileView.vue')
const domains = read('../src/utils/domains.ts')
const contentTypes = read('../src/utils/contentTypes.ts')
const packageJson = read('../package.json')

const firstRegion = (source, marker, closeMarker = '</section>') => {
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `marker not found: ${marker}`)
  const end = source.indexOf(closeMarker, start)
  assert.notEqual(end, -1, `section end not found after: ${marker}`)
  return source.slice(start, end)
}

const scriptRegion = (source, marker) => {
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `script marker not found: ${marker}`)
  return source.slice(start, Math.min(source.length, start + 2400))
}

const headerCore = firstRegion(header, '<header', '</header>')
const homeHero = firstRegion(home, '<section class="mb-6 grid')
const exploreHero = firstRegion(explore, '<div class="mb-8', '</div>')
const editorToolbar = firstRegion(editor, '<div class="bg-white', '</div>')
const editorTemplates = scriptRegion(editor, 'const PUBLISH_TEMPLATES')
const searchShell = firstRegion(search, '<section class="search-shell')
const userProfileMain = firstRegion(userProfile, '<section v-if="isLoading"')
const meProfileMain = firstRegion(meProfile, '<section class="profile-panel"')

const mojibakeMarkers = /�|Ã|Â|鏃|鏂|鐭|绀|鍙|鍦|閫|闂|棣|鎼|鍏|缂|鑱|鎶|闈|鍛|妗|涓|撳|玨|\?{3,}/
const oldPositioning = /靠近 Offer|备考行动|求职训练|技术经验社区|技术社区|发布复盘|技术文章模板|技术标签|阶段\s*[234]?|试点|FEAT-/

for (const [name, source] of [
  ['header core', headerCore],
  ['home hero', homeHero],
  ['explore hero', exploreHero],
  ['editor toolbar', editorToolbar],
  ['editor templates', editorTemplates],
  ['search shell', searchShell],
  ['user profile main', userProfileMain],
  ['me profile main', meProfileMain],
  ['domains config', domains],
  ['content types config', contentTypes],
]) {
  assert.doesNotMatch(source, mojibakeMarkers, `${name} must not contain user-visible mojibake`)
}

for (const [name, source] of [
  ['header core', headerCore],
  ['home hero', homeHero],
  ['explore hero', exploreHero],
  ['editor toolbar', editorToolbar],
  ['editor templates', editorTemplates],
  ['search shell', searchShell],
  ['user profile main', userProfileMain],
  ['me profile main', meProfileMain],
]) {
  assert.doesNotMatch(source, oldPositioning, `${name} must not foreground old job-prep or tech-only positioning`)
}

assert.match(headerCore, /真实经验与有用内容社区/, 'header brand subtitle must describe a general content community')
assert.match(header, /label:\s*'首页'[\s\S]*label:\s*'发现'[\s\S]*label:\s*'问答'[\s\S]*label:\s*'发布'/, 'primary navigation must expose Home, Explore, Q&A, and Publish')
assert.doesNotMatch(headerCore, /成长档案|成长周报月报|模拟面试|题库/, 'header core must not expose old tools as top-level actions')
assert.match(headerCore, /搜索经验、攻略、资源、话题或作者/, 'header search placeholder must support general community search')

assert.match(homeHero, /综合频道[\s\S]*推荐内容[\s\S]*热门话题/, 'home hero must surface community channels, recommendations, and topics')
assert.match(homeHero, /发现真实经验，分享有用内容/, 'home hero headline must express general community positioning')
assert.match(homeHero, /发布内容/, 'home hero must include a general publish CTA')

assert.match(exploreHero, /频道广场|话题广场/, 'explore hero must introduce channel and topic discovery')
assert.match(exploreHero, /真实经验/, 'explore hero must keep experience-sharing positioning')

assert.match(editorToolbar, /发布内容|编辑内容/, 'editor toolbar must use general content publishing language')
assert.match(editorTemplates, /经验分享|问题求助|攻略清单|资源推荐|观点讨论|复盘记录|图文笔记/, 'editor templates must expose general community content types')

assert.match(searchShell, /搜索内容、话题、作者、标签或有用经验/, 'search page must support content, topics, authors, and tags')
assert.match(userProfileMain, /作者主页|作者数据|发布内容/, 'public profile must use author-homepage language')
assert.match(meProfileMain, /我的作者主页|我的内容|收藏/, 'me profile must use author-homepage language')

assert.match(domains, /COMMUNITY_CHANNELS/, 'domain config must expose first-stage community channels')
for (const channel of ['科技数码', '学习成长', '职场经验', '生活方式', '资源推荐', '问答讨论']) {
  assert.match(domains, new RegExp(channel), `community channel missing: ${channel}`)
}
assert.match(contentTypes, /DEFAULT_POST_TYPE = POST_TYPE\.NOTE/, 'default post type must be the general note/experience type')
for (const type of ['经验分享', '问题求助', '攻略清单', '资源推荐', '观点讨论', '复盘记录', '图文笔记']) {
  assert.match(contentTypes, new RegExp(type), `community content type missing: ${type}`)
}

assert.match(packageJson, /"test:community-positioning"/, 'package scripts must expose the community positioning guard')
assert.match(packageJson, /npm run test:community-positioning/, 'test:guards must include the community positioning guard')

console.log('community positioning guard passed')
