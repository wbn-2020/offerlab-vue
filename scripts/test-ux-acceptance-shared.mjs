import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const header = read('src/components/layout/AppHeader.vue')
const router = read('src/router/index.ts')
const migrationView = read('src/views/LegacyTrainingUnavailableView.vue')
const globals = read('src/styles/globals.css')
const interactionBar = read('src/components/post/InteractionBar.vue')
const postCard = read('src/components/post/PostCard.vue')

assert.match(header, /\{ to: '\/questions', label: '知识库'/, 'desktop navigation must expose the knowledge library')
assert.match(header, /to="\/questions"[\s\S]*<span>知识库<\/span>/, 'mobile navigation must expose the knowledge library')
assert.match(header, /v-if="!authStore\.isLoggedIn"[\s\S]*to="\/login"[\s\S]*to="\/register"/, 'logged-out users must see direct login and registration actions')
assert.match(header, /const handleDocumentKeydown[\s\S]*event\.key !== 'Escape'/, 'header menus must close with Escape')
assert.match(header, /aria-haspopup="menu"/, 'header menu triggers must expose menu semantics')
assert.match(header, /\.community-header__search input::placeholder\s*\{\s*color:\s*#667085;/, 'header search placeholder must use readable contrast')
assert.match(globals, /input::placeholder,[\s\S]*color:\s*var\(--text-muted\)/, 'global input placeholders must use the readable muted token')

for (const path of ['/companies/:company/prep', '/me/prep', '/mock-interview']) {
  const start = router.indexOf(`path: '${path}'`)
  assert.notEqual(start, -1, `missing legacy route ${path}`)
  const end = router.indexOf('\n  {\n    path:', start + 1)
  const block = router.slice(start, end === -1 ? undefined : end)
  assert.match(block, /LegacyTrainingUnavailableView\.vue/, `${path} must render the migration explanation when disabled`)
  assert.doesNotMatch(block, /redirect:/, `${path} must not silently redirect`)
}

assert.match(migrationView, /打开这个页面不会修改或删除原学习记录/, 'migration view must explain the effect on existing data')
assert.match(migrationView, /现在可以这样继续/, 'migration view must offer replacement actions')
for (const [name, source] of [['InteractionBar', interactionBar], ['PostCard', postCard]]) {
  assert.match(source, /aria-pressed="Boolean\(post\.myInteraction\?\.(liked|favorited)\)"/, `${name} must expose selected state to assistive technology`)
  assert.match(source, /post\.myInteraction\?\.(liked|favorited) \? '取消(点赞|收藏)'/, `${name} must expose a state-aware action label`)
}

console.log('shared UX acceptance guard passed')
