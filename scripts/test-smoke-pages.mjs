import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const routeSource = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')

const criticalRoutes = [
  { path: '/', view: 'HomeView.vue' },
  { path: '/search', view: 'SearchView.vue' },
  { path: '/post/:id', view: 'PostDetailView.vue' },
  { path: '/editor', view: 'EditorView.vue' },
  { path: '/me/settings', view: 'SettingsView.vue' },
  { path: '/mock-interview', view: 'MockInterviewView.vue' },
  { path: '/admin/ops', view: 'OpsView.vue' },
  { path: '/admin/questions', view: 'AdminQuestionsView.vue' },
  { path: '/403', view: 'ForbiddenView.vue' },
]

for (const route of criticalRoutes) {
  assert.match(routeSource, new RegExp(`path:\\s*'${route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `missing route ${route.path}`)
  assert.match(routeSource, new RegExp(route.view.replace('.', '\\.')), `route ${route.path} must import ${route.view}`)
  assert.equal(existsSync(new URL(`../src/views/${route.view}`, import.meta.url)), true, `missing view file ${route.view}`)
}

const requiredApiFiles = ['client.ts', 'auth.ts', 'feed.ts', 'interaction.ts', 'notification.ts', 'ops.ts', 'post.ts', 'question.ts', 'search.ts', 'user.ts']
for (const file of requiredApiFiles) {
  assert.equal(existsSync(new URL(`../src/api/${file}`, import.meta.url)), true, `missing API file ${file}`)
}

console.log('smoke page guard passed')
