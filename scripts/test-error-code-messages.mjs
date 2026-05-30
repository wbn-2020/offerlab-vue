import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const client = readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8')

assert.match(client, /const errorMessageMap: Record<number, string>/, 'client must keep a centralized error code message map')
for (const code of [10001, 10002, 10401, 10403, 10404, 10429, 20000, 20004, 20500, 30001, 30002, 30103, 30202]) {
  assert.match(client, new RegExp(`${code}:`), `client must map error code ${code}`)
}

assert.match(client, /errorMessageMap\[error\.code\] \|\| error\.message \|\| fallback/, 'BizException messages must prefer mapped copy')
assert.match(client, /error\.response\?\.status === 400\) return errorMessageMap\[10001\]/, 'HTTP 400 must map to PARAM_ERROR copy')
assert.match(client, /error\.response\?\.status === 401\) return errorMessageMap\[10401\]/, 'HTTP 401 must map to login copy')
assert.match(client, /error\.response\?\.status === 409\) return errorMessageMap\[30002\]/, 'HTTP 409 must map to invalid status copy')
assert.match(client, /error\.response\?\.status === 429\) return errorMessageMap\[10429\]/, 'HTTP 429 must map to rate limit copy')
assert.match(client, /error\.response\?\.status && error\.response\.status >= 500/, 'HTTP 5xx must map to service unavailable copy')
assert.doesNotMatch(client, /error\.code === 10403[\s\S]*\?/, 'client must not use nested code-specific ternaries')

console.log('error code message guard passed')
