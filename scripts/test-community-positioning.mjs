import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const router = read('../src/router/index.ts')
const indexHtml = read('../index.html')
const header = read('../src/components/layout/AppHeader.vue')
const questions = read('../src/views/QuestionsView.vue')
const about = read('../src/views/AboutView.vue')
const search = read('../src/views/SearchView.vue')
const meProfile = read('../src/views/MeProfileView.vue')
const textQuality = read('../src/utils/textQuality.ts')
const globals = read('../src/styles/globals.css')
const mockStart = read('../src/components/mock-interview/MockInterviewStartForm.vue')
const mockWorkspace = read('../src/components/mock-interview/MockInterviewWorkspace.vue')
const packageJson = read('../package.json')
const readme = read('../README.md')

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

for (const label of ['资源库', '题库', '模拟面试', '求职', '找工作']) {
  assert.doesNotMatch(header, new RegExp(`label:\\s*'${label}'`), `primary navigation must not return to job-seeking-first label: ${label}`)
}

assert.match(header, /to="\/editor"[\s\S]*发布经验/, 'header publishing CTA must stay community/content oriented')
assert.match(about, /技术社区/, 'about page must describe OfferLab as a technology community')
assert.match(about, /经验沉淀社区/, 'about page must describe the community knowledge positioning')
assert.match(questions, /知识库/, 'questions route must be framed as a technical knowledge library')
assert.match(questions, /发布技术内容|浏览社区内容/, 'question empty state must guide users back to community content')
assert.match(search, /技术经验主页，暂未填写技术简介/, 'search user fallback must stay technical-community oriented')
assert.match(search, /sanitizePublicVisibleText/, 'search must clean low-quality public user text before rendering')
assert.doesNotMatch(search, /公开用户资料/, 'search must not use generic public-profile filler copy')
assert.match(meProfile, /safePublicVisibleText/, 'me profile must hide synthetic/demo account text in public-facing fields')
assert.match(meProfile, /filterPublicContent/, 'me profile post lists must hide generated or low-quality public content')
assert.match(meProfile, /html\.dark \.community-growth-panel/, 'me profile community growth panel must stay dark in dark mode')
assert.match(globals, /html\.dark :is\([\s\S]*\.community-growth-panel[\s\S]*\.growth-stat/, 'global dark surfaces must cover me profile growth cards')
assert.match(textQuality, /safePublicVisibleText/, 'text quality module must provide a reusable public-safe fallback helper')
assert.match(mockStart, /历史练习入口/, 'legacy practice entry must be clearly downgraded from primary navigation')
assert.match(mockStart, /个人知识卡/, 'legacy practice copy must connect to private knowledge-card retention')
assert.match(mockStart, /开始知识复盘/, 'legacy practice CTA must be reframed as knowledge review')
assert.match(mockWorkspace, /旧题目回答沉淀为私有知识卡/, 'legacy practice workspace must frame output as private knowledge cards')
assert.doesNotMatch(mockStart, /开始模拟面试|面试准备台/, 'legacy practice entry must not reinforce interview-prep positioning')
assert.match(readme, /面向技术人的经验沉淀社区/, 'README must keep the technology community positioning')
assert.match(readme, /AI 知识社区底座/, 'README must keep the AI knowledge community positioning')
assert.doesNotMatch(readme, /面向求职者的面经/, 'README must not describe OfferLab as an interview-experience product')
assert.doesNotMatch(readme, /求职备战社区/, 'README must not return to job-prep community positioning')
assert.match(indexHtml, /<title>OfferLab 技术社区<\/title>/, 'HTML fallback title must be community oriented before the router hydrates')
assert.doesNotMatch(indexHtml, /面试圈|面经社区/, 'HTML fallback title must not expose old interview-community positioning')

assert.match(routeBlock('/questions'), /title:\s*'知识库'/, '/questions title must be community knowledge oriented')
assert.match(routeBlock('/questions/:id'), /title:\s*'知识卡详情'/, '/questions/:id title must be knowledge-card oriented')
assert.match(routeBlock('/companies/:company/prep'), /title:\s*'主题学习包'/, '/companies/:company/prep title must be topic-learning-package oriented')
assert.match(routeBlock('/me/prep'), /title:\s*'个人学习空间'/, '/me/prep title must be personal-learning oriented')
assert.match(routeBlock('/mock-interview'), /title:\s*'个人练习归档'/, '/mock-interview title must be retained as a personal tool, not primary positioning')

assert.match(packageJson, /"test:community-positioning"/, 'package scripts must expose the community positioning guard')
assert.match(packageJson, /npm run test:community-positioning/, 'test:guards must include the community positioning guard')

console.log('community positioning guard passed')
