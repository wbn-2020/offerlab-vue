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
assert.match(view, /max-w-7xl min-w-0/, 'Governance view must keep the main container shrinkable on mobile')
assert.match(view, /\.panel \.overflow-x-auto/, 'Governance tables must keep horizontal scrolling inside panels')
assert.match(view, /\.status-row \{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/, 'Governance status rows must reserve a stable OK/Missing column')
assert.match(view, /\.status-row span[\s\S]*overflow-wrap:\s*anywhere/, 'Governance status rows must wrap long table/index names on mobile')
assert.match(view, /\.status-row strong[\s\S]*white-space:\s*nowrap/, 'Governance status labels must not split on mobile')
assert.match(view, /\.text-button \{[\s\S]*min-height:\s*40px;[\s\S]*min-width:\s*44px/, 'Governance audit text buttons must keep a touchable target')
assert.match(view, /@media \(max-width: 640px\)[\s\S]*\.primary-button,[\s\S]*\.secondary-button,[\s\S]*\.tab-button,[\s\S]*\.text-button[\s\S]*min-height:\s*44px/, 'Governance buttons must grow to 44px on narrow screens')
assert.match(view, /item\.avatarUrl/, 'Governance view must show avatar when present')
assert.match(view, /最近违规/, 'Governance view must show recent violation section')
assert.match(view, /item\.recentViolationKeyword/, 'Governance view must show latest violation keyword')
assert.match(view, /item\.recentViolationSummary/, 'Governance view must show latest violation summary')
assert.match(view, /formatTime\(item\.recentViolationTime\)/, 'Governance view must show latest violation time')
assert.match(view, /解除禁言/, 'Governance view must expose clear mute button')
assert.match(view, /解除封禁/, 'Governance view must expose clear ban button')
assert.match(view, /moderationActionKey = ref\(''\)/, 'Governance view must track per-action loading')
assert.match(view, /opsApi\.clearModerationMute\(item\.uid, note\)/, 'clear mute button must call API with the risk note')
assert.match(view, /opsApi\.clearModerationBan\(item\.uid, note\)/, 'clear ban button must call API with the risk note')
assert.match(view, /isMuted\(item\)/, 'clear mute button must be disabled when no active mute exists')
assert.match(view, /isBanned\(item\)/, 'clear ban button must be disabled when no active ban exists')
assert.match(view, /muteHours <= 0 && banHours <= 0[\s\S]*toast\.error\('保存用户限制需至少设置一个大于 0 的时长；清除限制请使用解除禁言\/解除封禁按钮'\)[\s\S]*return/, '0/0 duration must be blocked before ordinary save')
assert.match(view, /level: banHours > 0 \? 'critical' : 'high'/, 'ordinary save must only use critical for ban or high for mute')
assert.doesNotMatch(view, /level: banHours > 0 \? 'critical' : muteHours > 0 \? 'high' : 'medium'/, 'ordinary save must not downgrade 0/0 to medium')
assert.match(view, /const clearUserMute[\s\S]*requireRiskConfirm\(\{[\s\S]*level: 'high'[\s\S]*confirmText: '确认解除禁言'/, 'clear mute confirmation must remain high risk')
assert.match(view, /const clearUserBan[\s\S]*requireRiskConfirm\(\{[\s\S]*level: 'critical'[\s\S]*confirmText: '确认解除封禁'/, 'clear ban confirmation must remain critical risk')

console.log('user moderation governance guard passed')
