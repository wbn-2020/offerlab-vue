import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const relationshipApi = read('src/api/relationships.ts')
const relationshipComposable = read('src/composables/useRelationshipWorkspace.ts')
const relationshipView = read('src/views/RelationshipWorkspaceView.vue')
const digestApi = read('src/api/updateDigest.ts')
const digestPanel = read('src/components/retention/UpdateDigestPanel.vue')
const topicView = read('src/views/TopicDetailView.vue')
const packageJson = JSON.parse(read('package.json'))

assert.equal(
  packageJson.scripts?.['test:v25-trusted-subscription-delivery'],
  'node scripts/test-v25-trusted-subscription-delivery.mjs',
  'package.json must expose the V25 trusted subscription delivery guard',
)
assert.match(
  packageJson.scripts?.['pretest:guards'] || '',
  /npm run test:v25-trusted-subscription-delivery/,
  'the standard guard chain must include the V25 guard',
)

assert.match(
  relationshipApi,
  /DELIVERY_PREFERENCE_SUPPORTED_SOURCE_TYPES[\s\S]*'TOPIC'[\s\S]*'DISCUSSION'[\s\S]*'NEED'/,
  'only V25 topic, discussion, and need sources may expose delivery preference controls',
)
assert.match(
  relationshipApi,
  /deliveryPreferenceSupported/,
  'relationship API must adapt the backend delivery preference capability',
)
assert.match(
  relationshipApi,
  /deliveryPreferenceUnsupportedReason/,
  'relationship API must adapt the backend unsupported reason',
)
assert.match(
  relationshipApi,
  /isDeliveryPreferenceSupported/,
  'relationship API must gate delivery settings on the backend capability contract',
)

const updatePreferenceSource = relationshipApi.slice(
  relationshipApi.indexOf('updatePreference:'),
  relationshipApi.indexOf('deletePreference:'),
)
assert.ok(
  updatePreferenceSource.indexOf('assertDeliveryPreferenceSupported') >= 0
    && updatePreferenceSource.indexOf('assertDeliveryPreferenceSupported')
      < updatePreferenceSource.indexOf('client.put'),
  'unsupported relationships must be rejected before the preference PUT is created',
)

assert.match(
  relationshipComposable,
  /if \(!item\.deliveryPreferenceSupported\)[\s\S]*return false/,
  'relationship workspace must stop unsupported saves before reaching the API',
)
assert.match(
  relationshipComposable,
  /if \(!item\.deliveryPreferenceSupported\)[\s\S]*selectedPreference\.value = preferenceFromItem\(item\)/,
  'relationship workspace must not fetch a preference that cannot be configured',
)
assert.match(
  relationshipComposable,
  /偏好已更新，仅对后续更新生效。/,
  'preference saves must disclose their forward-only effect',
)

assert.match(
  relationshipView,
  /selected\.deliveryPreferenceSupported/,
  'relationship view must render settings from backend capability',
)
assert.match(
  relationshipView,
  /data-relationship-preference-state="unsupported"/,
  'relationship view must expose the unsupported state',
)
assert.match(
  relationshipView,
  /type="radio"[\s\S]*name="delivery-mode"/,
  'V25 relationship settings must use an explicit three-choice radio group',
)
assert.match(
  relationshipView,
  /preferenceMode === 'MUTED'[\s\S]*preference-expires-at/,
  'the mute expiry input must only be visible for MUTED',
)
assert.match(
  relationshipView,
  /不影响直接回复、@ 提及及与你提交事项相关的结果通知。/,
  'relationship settings must preserve direct notification boundaries',
)
assert.doesNotMatch(
  relationshipView,
  /<select id="delivery-mode"/,
  'relationship settings must not retain the misleading legacy select control',
)

assert.match(
  digestApi,
  /subscriptionSourceType[\s\S]*subscriptionSourceId[\s\S]*resourceType[\s\S]*resourceId/,
  'V25 digest API must model separate subscription and resource fields',
)
assert.match(
  digestApi,
  /subscriptionSourceType: params\.subscriptionSourceType/,
  'V25 digest API must submit the new subscription source type filter',
)
assert.match(
  digestApi,
  /subscriptionSourceId: queryIdentifier\(params\.subscriptionSourceId\)/,
  'V25 digest API must submit the new subscription source id filter',
)
assert.match(
  digestApi,
  /resourceType: params\.resourceType/,
  'V25 digest API must submit the new resource type filter',
)
assert.match(
  digestApi,
  /const resourceId = queryIdentifier\(params\.resourceId\)[\s\S]*resourceId,/,
  'V25 digest API must submit the new resource id filter',
)
assert.match(
  digestApi,
  /hasExplicitResourceFilter[\s\S]*sourceType: hasExplicitResourceFilter \? undefined : params\.sourceType[\s\S]*sourceId: hasExplicitResourceFilter \? undefined : queryIdentifier\(params\.sourceId\)/,
  'V25 digest API must retain old source fields only when an explicit resource filter is absent',
)
assert.doesNotMatch(
  digestApi,
  /normalizeSubscriptionSourceType\(source\.sourceType\)/,
  'legacy resource aliases must not be inferred as subscription causes',
)
assert.match(
  digestApi,
  /subscriptionSourceType = normalizeSubscriptionSourceType\(source\.subscriptionSourceType\)/,
  'subscription causes must come from the explicit V25 response fields',
)
assert.doesNotMatch(
  digestApi,
  /notificationUnread|notificationIds|unreadOnly/,
  'V25 digest API must not carry normal notification unread state',
)

assert.match(
  digestPanel,
  /subscriptionSourceTypeOptions[\s\S]*'TOPIC'[\s\S]*'DISCUSSION'[\s\S]*'NEED'/,
  'V25 digest filters must expose topic, discussion, and need subscription sources',
)
assert.match(
  digestPanel,
  /effectiveSubscriptionSourceType[\s\S]*effectiveSubscriptionSourceId[\s\S]*effectiveResourceType[\s\S]*effectiveResourceId/,
  'V25 digest panel must maintain independent subscription and resource filters',
)
assert.match(
  digestPanel,
  /effectiveResourceType[\s\S]*props\.sourceType[\s\S]*routeLegacySourceType[\s\S]*effectiveResourceId[\s\S]*props\.sourceId[\s\S]*routeLegacySourceId/,
  'legacy source URL filters must be canonicalized into the visible resource filters',
)
assert.match(
  digestPanel,
  /setRouteResourceType[\s\S]*sourceType: undefined,[\s\S]*sourceId: undefined/,
  'changing resource type must clear legacy source filters',
)
assert.match(
  digestPanel,
  /setRouteResourceId[\s\S]*sourceType: undefined,[\s\S]*sourceId: undefined/,
  'changing resource id must clear legacy source filters',
)
assert.match(
  digestPanel,
  /subscriptionSourceLabel\(item\)[\s\S]*resourceTypeLabel\(item\.resourceType\)/,
  'V25 digest rows must explain both the subscription cause and associated resource',
)
assert.doesNotMatch(
  digestPanel,
  /notificationUnread|notificationIds|未读来源|通知已读|digest-unread/,
  'V25 digest panel must not present ordinary notification unread semantics',
)

assert.match(
  topicView,
  /subscription-source-type="TOPIC"[\s\S]*:subscription-source-id="topic\?\.id"/,
  'topic detail must use the canonical V25 subscription source id',
)

console.log('V25 trusted subscription delivery guard passed')
