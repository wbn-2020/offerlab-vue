import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/AdminGovernanceView.vue', import.meta.url), 'utf8')

for (const field of [
  'nickname?: string',
  'avatarUrl?: string',
  'recentViolationKeyword?: string',
  'recentViolationAction?: string',
  'recentViolationSummary?: string',
  'recentViolationTime?: string',
]) {
  assert.match(opsApi, new RegExp(field.replace(/[?]/g, '\\?')), `UserModerationState must expose ${field}`)
}

assert.match(opsApi, /clearModerationMute/, 'ops API must expose clear mute action')
assert.match(opsApi, /clearModerationBan/, 'ops API must expose clear ban action')
assert.match(opsApi, /\/api\/v1\/ops\/moderation\/users\/\$\{uid\}\/clear-mute/, 'clear mute action must call backend endpoint')
assert.match(opsApi, /\/api\/v1\/ops\/moderation\/users\/\$\{uid\}\/clear-ban/, 'clear ban action must call backend endpoint')

assert.match(view, /item\.nickname \|\| `用户 \$\{item\.uid\}`/, 'Governance view must show nickname fallback')
assert.match(view, /item\.avatarUrl/, 'Governance view must show avatar when present')
assert.match(view, /最近违规/, 'Governance view must show recent violation section')
assert.match(view, /item\.recentViolationKeyword/, 'Governance view must show latest violation keyword')
assert.match(view, /item\.recentViolationSummary/, 'Governance view must show latest violation summary')
assert.match(view, /formatTime\(item\.recentViolationTime\)/, 'Governance view must show latest violation time')
assert.match(view, /解除禁言/, 'Governance view must expose clear mute button')
assert.match(view, /解除封禁/, 'Governance view must expose clear ban button')
assert.match(view, /moderationActionKey = ref\(''\)/, 'Governance view must track per-action loading')
assert.match(view, /opsApi\.clearModerationMute\(item\.uid\)/, 'clear mute button must call API')
assert.match(view, /opsApi\.clearModerationBan\(item\.uid\)/, 'clear ban button must call API')
assert.match(view, /isMuted\(item\)/, 'clear mute button must be disabled when no active mute exists')
assert.match(view, /isBanned\(item\)/, 'clear ban button must be disabled when no active ban exists')

console.log('user moderation governance guard passed')
