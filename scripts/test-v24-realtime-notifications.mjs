import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const codecSource = read('src/lib/packet-codec.ts')
const realtimeSource = read('src/composables/useRealtime.ts')
const notificationsView = read('src/views/NotificationsView.vue')
const packageJson = JSON.parse(read('package.json'))

assert.equal(
  packageJson.scripts?.['test:v24-realtime-notifications'],
  'node scripts/test-v24-realtime-notifications.mjs',
  'package.json must expose the V24 realtime guard',
)

assert.match(codecSource, /MAX_FRAME_BYTES = 16 \* 1024/, 'codec must cap frames at 16 KiB')
assert.match(codecSource, /magic !== MAGIC_NUMBER/, 'codec must reject invalid magic values')
assert.match(codecSource, /length < MIN_PACKET_LENGTH/, 'codec must reject undersized declared lengths')
assert.match(codecSource, /length !== buffer\.byteLength - MAGIC_BYTES/, 'codec must require the declared length to match the frame')
assert.match(codecSource, /isKnownCommand\(command\)/, 'codec must reject unknown commands')
assert.match(codecSource, /TextDecoder\('utf-8', \{ fatal: true \}\)/, 'codec must reject malformed UTF-8')

assert.match(realtimeSource, /DEFAULT_WEBSOCKET_PATH = '\/ws\/notifications'/, 'an unset override must use the same-origin endpoint')
assert.match(realtimeSource, /rawUrl\?\.trim\(\) \|\| DEFAULT_WEBSOCKET_PATH/, 'the same-origin endpoint must be the default URL')
assert.match(realtimeSource, /['"]token['"], ['"]access_token['"], ['"]authorization['"]/, 'credentials must be rejected from WebSocket URL query parameters')
assert.match(realtimeSource, /socket\.send\(encodePacket\(Command\.AUTH_REQ, \{ token \}\)\)/, 'JWT must be sent in the auth frame')
assert.match(realtimeSource, /socket\.send\(encodePacket\(Command\.PING\)\)/, 'heartbeats must not reuse the JWT payload')
assert.match(realtimeSource, /if \(!authenticated\) \{[\s\S]*packet\.cmd !== Command\.AUTH_RESP[\s\S]*socket\.close\(4002, 'Invalid packet'\)/, 'pre-auth non-auth packets must fail closed')
assert.match(realtimeSource, /isAuthenticatedResponse\(packet\.body\)/, 'AUTH_RESP must require the explicit authenticated field')
assert.match(realtimeSource, /POLL_ONLY_RECONNECT_CLOSE_CODES = new Set\(\[4001, 4002, 4003, 4004\]\)/, 'auth and session-limit failures must wait for the next poll')
assert.match(realtimeSource, /else if \(packet\.cmd !== Command\.PONG\) \{\s*socket\.close\(4002, 'Invalid packet'\)/, 'invalid server-direction commands must fail closed')

assert.match(notificationsView, /hasPendingNotificationRefresh/, 'notification center must track pending refreshes')
assert.match(notificationsView, /watch\(\s*\(\) => realtimeStore\.latestUnreadId/, 'notification center must react to the latest unread marker')
assert.match(notificationsView, /<span>有新通知<\/span>[\s\S]*@click="refreshNotifications"/, 'notification center must show a refresh prompt for new notifications')
assert.match(notificationsView, /const refreshNotifications = \(\) => \{\s*hasPendingNotificationRefresh\.value = false\s*void loadNotifications\(\)/, 'refreshing must reload the authoritative HTTP list')

const compiledCodec = ts.transpileModule(codecSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: 'packet-codec.ts',
}).outputText
const codec = await import(`data:text/javascript;base64,${Buffer.from(compiledCodec).toString('base64')}`)
const {
  Command,
  MAGIC_NUMBER,
  MAX_FRAME_BYTES,
  decodePacket,
  encodePacket,
} = codec

const makePacket = (command, bodyText) => {
  const body = new TextEncoder().encode(bodyText)
  const buffer = new ArrayBuffer(10 + body.byteLength)
  const view = new DataView(buffer)
  view.setUint32(0, MAGIC_NUMBER, false)
  view.setUint32(4, 6 + body.byteLength, false)
  view.setUint16(8, command, false)
  new Uint8Array(buffer, 10).set(body)
  return buffer
}

const valid = encodePacket(Command.AUTH_REQ, { token: 'jwt-only-in-first-frame' })
const decoded = decodePacket(valid)
assert.equal(decoded.magic, MAGIC_NUMBER)
assert.equal(decoded.cmd, Command.AUTH_REQ)
assert.deepEqual(decoded.body, { token: 'jwt-only-in-first-frame' })

const badMagic = valid.slice(0)
new DataView(badMagic).setUint32(0, 0, false)
assert.throws(() => decodePacket(badMagic), /magic/i)

const badLength = valid.slice(0)
const badLengthView = new DataView(badLength)
badLengthView.setUint32(4, badLengthView.getUint32(4, false) + 1, false)
assert.throws(() => decodePacket(badLength), /length/i)

const undersizedLength = makePacket(Command.PING, '{}')
new DataView(undersizedLength).setUint32(4, 5, false)
assert.throws(() => decodePacket(undersizedLength), /length/i)

assert.throws(() => decodePacket(new ArrayBuffer(MAX_FRAME_BYTES + 1)), /maximum/i)
assert.throws(() => decodePacket(makePacket(0x7fff, '{}')), /command/i)
assert.throws(() => decodePacket(makePacket(Command.NOTIF_PUSH, '{')), /JSON/i)
assert.throws(
  () => encodePacket(Command.PING, { value: 'x'.repeat(MAX_FRAME_BYTES) }),
  /maximum/i,
)

console.log('V24 realtime notification guard passed')
