import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..', 'offerlab-java');
const api = fs.readFileSync(path.join(root, 'community-domain-analytics', 'src', 'main', 'java', 'com', 'offerlab', 'community', 'analytics', 'api', 'ChannelQualityGovernanceAutomationCommandFacade.java'), 'utf8');
const impl = fs.readFileSync(path.join(root, 'community-domain-analytics', 'src', 'main', 'java', 'com', 'offerlab', 'community', 'analytics', 'application', 'ChannelQualityGovernanceAutomationCommandFacadeImpl.java'), 'utf8');

for (const token of [
  'V42_GOVERNANCE_AUTOMATION_COMMAND_V1',
  'queueReminderIfEligible',
  'escalateTodoIfEligible',
  'targetIdempotencyKey'
]) {
  if (!api.includes(token) && !impl.includes(token)) throw new Error(`missing V42 facade token: ${token}`);
}
if (!impl.includes('advanceTodoEscalation') || !impl.includes('selectReminderByDedupKey')) {
  throw new Error('V42 facade must use V42-owned typed mapper operations');
}
for (const forbidden of [
  'ContentMaintenanceTaskCommandFacade',
  'closeCaseWithSnapshot',
  'ChannelQualityGovernancePlaybook',
  'RuleAst'
]) {
  if (impl.includes(forbidden)) throw new Error(`V42 facade illegally depends on ${forbidden}`);
}
console.log('V42 automation facade boundary: PASS');
