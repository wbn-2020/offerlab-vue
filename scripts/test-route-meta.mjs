import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')

function routeBlock(path) {
  const marker = `path: '${path}'`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `route not found: ${path}`)
  const nextRoute = source.indexOf('\n  {\n    path:', start + marker.length)
  return source.slice(start, nextRoute === -1 ? source.indexOf('\n]', start) : nextRoute)
}

for (const path of ['/admin/ops', '/admin/questions', '/admin/company-aliases', '/admin/governance']) {
  const block = routeBlock(path)
  assert.match(block, /requiresAuth:\s*true/, `${path} must require login`)
  assert.match(block, /adminPermission:/, `${path} must declare adminPermission`)
}

for (const path of ['/editor', '/editor/:id', '/me', '/me/prep', '/me/notifications', '/me/settings', '/403']) {
  const block = routeBlock(path)
  assert.match(block, /requiresAuth:\s*true/, `${path} must require login`)
}

for (const path of ['/login', '/register']) {
  const block = routeBlock(path)
  assert.doesNotMatch(block, /requiresAuth:\s*true/, `${path} must stay public`)
  assert.doesNotMatch(block, /adminPermission:/, `${path} must not require admin permissions`)
}

console.log('route meta guard passed')
