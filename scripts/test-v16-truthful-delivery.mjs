import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const about = readFileSync(new URL('../src/views/AboutView.vue', import.meta.url), 'utf8')

assert.doesNotMatch(about, /WebSocket|Netty|Vue 3|Spring Boot|MySQL|Redis|Elasticsearch|定时轮询/, 'About view must not foreground implementation or runtime details')
assert.match(about, /社区边界/, 'About view must explain the community boundary')
assert.match(about, /参与入口/, 'About view must expose concrete participation paths')
assert.match(about, /不代表平台的事实结论、专业意见或任何形式的承诺/, 'About view must state the content trust boundary honestly')

console.log('V16 truthful delivery guard passed')
