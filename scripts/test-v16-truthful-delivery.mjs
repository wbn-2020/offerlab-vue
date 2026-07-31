import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const about = readFileSync(new URL('../src/views/AboutView.vue', import.meta.url), 'utf8')

assert.doesNotMatch(about, /WebSocket|Netty/, 'About view must not promise an unavailable realtime transport')
assert.match(about, /定时轮询/, 'About view must describe the active notification transport')
assert.match(about, /近实时/, 'About view must describe the notification freshness honestly')

console.log('V16 truthful delivery guard passed')
