import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..', '..');
const java = path.join(repo, 'offerlab-java');
const v45 = path.join(java, 'community-domain-analytics', 'src', 'main', 'java', 'com', 'offerlab', 'community', 'analytics', 'v45');
const guard = fs.readFileSync(path.join(v45, 'V45ActionGuard.java'), 'utf8');
const decision = fs.readFileSync(path.join(v45, 'V45GuardDecision.java'), 'utf8');
const actionType = fs.readFileSync(path.join(v45, 'V45ActionType.java'), 'utf8');
const astCodec = fs.readFileSync(path.join(v45, 'V45RuleAstCodec.java'), 'utf8');
const migration = fs.readFileSync(path.join(java, 'db', 'migration', '20260807_channel_quality_governance_v45_action_safety.sql'), 'utf8');

for (const action of [
  'RECOMMEND_PLAYBOOK',
  'QUEUE_GOVERNANCE_REMINDER',
  'ESCALATE_GOVERNANCE_ATTENTION',
  'OPEN_BATCH_COORDINATION'
]) {
  if (!actionType.includes(action)) throw new Error(`missing V45 action: ${action}`);
}
for (const token of ['DOWNSTREAM_ACTIONS_ENABLED = false']) {
  if (!guard.includes(token)) throw new Error(`missing V45 safety gate: ${token}`);
}
for (const token of ['DRY_RUN_NO_SIDE_EFFECT', 'DOWNSTREAM_ACTIONS_DISABLED']) {
  if (!decision.includes(token)) throw new Error(`missing V45 safety decision: ${token}`);
}
for (const token of ['unknown field', 'not allow-listed', 'malformed', 'canonical']) {
  if (!astCodec.includes(token)) throw new Error(`missing V45 AST fail-closed guard: ${token}`);
}
if (!guard.includes('RULE_AST_FAIL_CLOSED')) {
  throw new Error('missing V45 AST runtime fail-closed result');
}
for (const token of [
  't_channel_quality_v45_rule_definition',
  't_channel_quality_v45_approval',
  't_channel_quality_v45_action_ledger',
  't_channel_quality_v45_outbox',
  't_channel_quality_v45_kill_switch',
  't_channel_quality_v45_idempotency'
]) {
  if (!migration.includes(token)) throw new Error(`missing V45 table: ${token}`);
}
for (const forbidden of ['AUTO_CLOSE', 'PUBLISH_CONTENT', 'MAINTENANCE_TASK', 'V39']) {
  if (!guard.includes(forbidden)) throw new Error(`V45 guard must reject ${forbidden}`);
}
console.log('V45 action safety boundary: PASS');
