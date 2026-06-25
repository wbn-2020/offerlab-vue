import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsView = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')
const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')

assert.match(opsView, /Kafka\/ES\/Redis 本地运行控制台/, 'OpsView must render the local middleware console')
assert.match(opsView, /localMiddlewareCommands/, 'OpsView must define local middleware commands')
assert.match(opsView, /check-local-middleware\.ps1/, 'OpsView must expose the read-only middleware check command')
assert.match(opsView, /start-local-kafka\.ps1/, 'OpsView must expose the Kafka startup script as a copy-only command')
assert.match(opsView, /loadKafkaLocalCheck/, 'OpsView must load the Kafka local read-only check')
assert.match(opsView, /kafkaLocalCheckCards/, 'OpsView must summarize Kafka local check cards')
assert.match(opsView, /readyForOutboxReplay/, 'OpsView must show whether Kafka is ready before outbox replay')
assert.match(opsView, /const canRetryOutbox = computed\(\(\) => kafkaLocalCheck\.value\?\.readyForOutboxReplay === true\)/, 'OpsView must derive an explicit outbox retry gate from Kafka readiness')
assert.match(opsView, /selectedFailedIds\.length === 0 \|\| isBatchRetrying \|\| !canRetryOutbox/, 'batch outbox retry button must be disabled when Kafka is not ready')
assert.match(opsView, /retryingId === message\.id \|\| !canRetryOutbox/, 'single outbox retry buttons must be disabled when Kafka is not ready')
assert.match(opsView, /if \(!canRetryOutbox\.value\)[\s\S]*批量重试已禁用/, 'batch outbox retry handler must fail closed before calling the API')
assert.match(opsView, /isKafkaLocalCheckLoading/, 'OpsView must expose loading state for Kafka local checks')
assert.match(opsView, /copyLocalMiddlewareCommand/, 'OpsView must copy local commands instead of executing them')
assert.match(opsView, /navigator\.clipboard\.writeText\(command\)/, 'OpsView must use clipboard copy for local commands')
assert.doesNotMatch(opsView, /client\.(post|get)\(['"`]\/api\/v1\/ops\/local-process/, 'OpsView must not call a backend process-start endpoint')
assert.doesNotMatch(opsView, /child_process|exec\(|spawn\(/, 'OpsView must not embed local process execution')

assert.match(opsApi, /export interface KafkaLocalCheck/, 'opsApi must type the Kafka local check response')
assert.match(opsApi, /getKafkaLocalCheck/, 'opsApi must expose getKafkaLocalCheck')
assert.match(opsApi, /\/api\/v1\/ops\/kafka\/local-check/, 'opsApi must call the backend read-only Kafka check endpoint')
assert.match(opsApi, /readyForOutboxReplay/, 'Kafka local check type must include outbox replay readiness')
assert.match(opsApi, /blockedOperations/, 'Kafka local check type must include blocked dangerous operations')

console.log('Kafka local console guard passed')
