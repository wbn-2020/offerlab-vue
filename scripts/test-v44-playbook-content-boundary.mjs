import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..', '..');
const java = path.join(repo, 'offerlab-java');
const codec = fs.readFileSync(path.join(java, 'community-domain-analytics', 'src', 'main', 'java', 'com', 'offerlab', 'community', 'analytics', 'application', 'ChannelQualityPlaybookContentCodec.java'), 'utf8');
const migration = fs.readFileSync(path.join(java, 'db', 'migration', '20260807_channel_quality_governance_playbook.sql'), 'utf8');
for (const token of ['V44_PLAYBOOK_CONTENT_V1', 'canonicalJson', 'contentHash', 'MessageDigest', 'suggestedActions', 'requiredChecks']) {
  if (!codec.includes(token)) throw new Error(`missing codec invariant: ${token}`);
}
for (const token of ['t_channel_quality_governance_playbook_version', 'canonical_content_json', 'content_hash', 'DRAFT', 'PUBLISHED', 'RETIRED', 't_channel_quality_review_risk_case_playbook_check']) {
  if (!migration.includes(token)) throw new Error(`missing V44 schema invariant: ${token}`);
}
for (const forbidden of ['V45', 'ContentMaintenanceTaskCommandFacade', 'closeCaseWithSnapshot']) {
  if (codec.includes(forbidden) || migration.includes(forbidden)) throw new Error(`V44 codec/migration depends on ${forbidden}`);
}
console.log('V44 playbook content boundary: PASS');
