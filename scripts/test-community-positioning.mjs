import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const router = read('../src/router/index.ts')
const guards = read('../src/router/guards.ts')
const seo = read('../src/utils/seo.ts')
const indexHtml = read('../index.html')
const header = read('../src/components/layout/AppHeader.vue')
const home = read('../src/views/HomeView.vue')
const explore = read('../src/views/ExploreView.vue')
const about = read('../src/views/AboutView.vue')
const editor = read('../src/views/EditorView.vue')
const postDetail = read('../src/views/PostDetailView.vue')
const packageJson = read('../package.json')
const mojibakeMarkers = /鎴愰暱|鐭ヨ瘑|涓撳|鍛ㄦ姤|妗ｆ|鍏崇郴|璇曠偣/

const routeBlock = (path) => {
  const marker = `path: '${path}'`
  const start = router.indexOf(marker)
  assert.notEqual(start, -1, `route not found: ${path}`)
  const next = router.indexOf('\n  {\n    path:', start + marker.length)
  return router.slice(start, next === -1 ? router.indexOf('\n]', start) : next)
}

for (const label of ['首页', '发现', '趋势', '搜索']) {
  assert.match(header, new RegExp(`label:\\s*'${label}'`), `primary navigation must keep community-first item: ${label}`)
}

assert.match(header, /OfferLab 综合社区首页/, 'header brand aria label must reflect the comprehensive community positioning')
assert.match(header, /多领域实践社区/, 'header brand subtitle must reflect the multi-domain positioning')
assert.match(header, /搜索技术、职场、阅读或生活实践/, 'header search placeholder must reflect the multi-domain browsing scope')
assert.match(header, /沉淀你的实践经验和成长记录/, 'header user signature fallback must move away from tech-only positioning')
assert.doesNotMatch(header, mojibakeMarkers, 'header copy must not contain mojibake markers')

assert.match(home, /开始沉淀你的实践经验/, 'home login CTA must reflect practice sharing instead of tech-only positioning')
assert.match(home, /登录后可以发布技术、职场、阅读或生活实践/, 'home logged-out guidance must mention the supported stage-1 domains')
assert.doesNotMatch(home, mojibakeMarkers, 'home copy must not contain mojibake markers')

assert.match(explore, /从技术、职场、阅读与生活实践里发现值得收藏的真实经验/, 'explore intro must reflect the comprehensive community scope')
assert.match(explore, /活跃作者和实践者会展示在这里/, 'explore recommended users fallback must avoid tech-only positioning')
assert.match(explore, /多领域实践内容/, 'explore latest section must describe public practice content instead of tech-only content')
assert.doesNotMatch(explore, mojibakeMarkers, 'explore copy must not contain mojibake markers')

assert.match(about, /关于 OfferLab 综合社区/, 'about title must reflect the comprehensive community positioning')
assert.match(about, /多领域实践社区/, 'about page must describe OfferLab as a multi-domain practice community')
assert.match(about, /成长型社区/, 'about page must explain the growth-oriented positioning')
assert.match(about, /技术、职场、阅读、生活与投资理财/, 'about page must list the stage-1 domains explicitly')
assert.doesNotMatch(about, /关于 OfferLab 技术社区/, 'about page must not keep the old site-wide technology-community title')
assert.doesNotMatch(about, mojibakeMarkers, 'about copy must not contain mojibake markers')

assert.match(editor, /发布社区内容|编辑社区内容/, 'editor heading must reflect community-wide publishing')
assert.match(editor, /const showStageTwoPublishingAssist = false/, 'editor must keep stage-2 publishing assist hidden during stage 1')
assert.match(editor, /v-if="showStageTwoPublishingAssist"/, 'editor stage-2 assist panel must be gated off during stage 1')
assert.doesNotMatch(editor, /这些检查会影响内容可读性、搜索质量和后续 AI 知识沉淀/, 'editor quality copy must avoid foregrounding later-stage AI knowledge flows')

assert.match(postDetail, /const showStageTwoDetailPanels = false/, 'post detail must keep stage-2 detail panels hidden during stage 1')
assert.match(postDetail, /showStageTwoDetailPanels &&/, 'post detail knowledge and material panels must be gated off during stage 1')
assert.match(postDetail, /applyPageSeo/, 'post detail must own minimal SEO metadata updates')

assert.match(seo, /SITE_NAME = 'OfferLab 综合社区'/, 'SEO helper must expose the comprehensive community site name')
assert.match(seo, /DEFAULT_DESCRIPTION/, 'SEO helper must provide a default description for phase-1 public pages')
assert.match(guards, /applyPageSeo/, 'router guards must delegate title/meta updates to the SEO helper')
assert.doesNotMatch(guards, /OfferLab 技术社区/, 'router guards must stop using the old technology-community suffix')
assert.match(indexHtml, /<title>OfferLab 综合社区<\/title>/, 'HTML fallback title must reflect the comprehensive community positioning')
assert.match(indexHtml, /name="description"/, 'HTML fallback must provide a description for crawler and no-JS cases')

assert.match(routeBlock('/editor'), /title:\s*'发布社区内容'/, '/editor title must reflect the comprehensive community publishing scope')
assert.match(routeBlock('/editor/:id'), /title:\s*'编辑社区内容'/, '/editor/:id title must reflect the comprehensive community publishing scope')

assert.match(packageJson, /"test:community-positioning"/, 'package scripts must expose the community positioning guard')
assert.match(packageJson, /npm run test:community-positioning/, 'test:guards must include the community positioning guard')

console.log('community positioning guard passed')
