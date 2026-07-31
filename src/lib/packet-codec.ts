export const MAGIC_NUMBER = 0xCAFEBABE
export const MAX_FRAME_BYTES = 16 * 1024

const MAGIC_BYTES = 4
const LENGTH_BYTES = 4
const COMMAND_BYTES = 2
const HEADER_BYTES = MAGIC_BYTES + LENGTH_BYTES + COMMAND_BYTES
const MIN_PACKET_LENGTH = LENGTH_BYTES + COMMAND_BYTES

export enum Command {
  AUTH_REQ = 0x0001,
  AUTH_RESP = 0x0002,
  NOTIF_PUSH = 0x0003,
  UNREAD_COUNT = 0x0004,
  PING = 0x0005,
  PONG = 0x0006,
}

const knownCommands = new Set<number>([
  Command.AUTH_REQ,
  Command.AUTH_RESP,
  Command.NOTIF_PUSH,
  Command.UNREAD_COUNT,
  Command.PING,
  Command.PONG,
])

export interface Packet {
  magic: number
  length: number
  cmd: Command
  body: unknown
}

export const isKnownCommand = (value: number): value is Command => knownCommands.has(value)

export function encodePacket(cmd: Command, body: unknown = {}): ArrayBuffer {
  if (!isKnownCommand(cmd)) {
    throw new Error('Unknown packet command')
  }
  const bodyJson = JSON.stringify(body)
  if (typeof bodyJson !== 'string') {
    throw new Error('Packet body must be JSON serializable')
  }
  const bodyBytes = new TextEncoder().encode(bodyJson)
  const length = MIN_PACKET_LENGTH + bodyBytes.length
  const frameBytes = MAGIC_BYTES + length
  if (frameBytes > MAX_FRAME_BYTES) {
    throw new Error('Packet exceeds maximum frame size')
  }

  const buffer = new ArrayBuffer(frameBytes)
  const view = new DataView(buffer)

  view.setUint32(0, MAGIC_NUMBER, false)
  view.setUint32(MAGIC_BYTES, length, false)
  view.setUint16(MAGIC_BYTES + LENGTH_BYTES, cmd, false)

  const bodyArray = new Uint8Array(buffer, HEADER_BYTES)
  bodyArray.set(new Uint8Array(bodyBytes))

  return buffer
}

export function decodePacket(buffer: ArrayBuffer): Packet {
  if (!(buffer instanceof ArrayBuffer)) {
    throw new Error('Packet must be an ArrayBuffer')
  }
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error('Packet is shorter than the header')
  }
  if (buffer.byteLength > MAX_FRAME_BYTES) {
    throw new Error('Packet exceeds maximum frame size')
  }

  const view = new DataView(buffer)

  const magic = view.getUint32(0, false)
  if (magic !== MAGIC_NUMBER) {
    throw new Error('Packet magic does not match')
  }

  const length = view.getUint32(MAGIC_BYTES, false)
  if (length < MIN_PACKET_LENGTH) {
    throw new Error('Packet length is shorter than the minimum')
  }
  if (length !== buffer.byteLength - MAGIC_BYTES) {
    throw new Error('Packet length does not match frame size')
  }

  const command = view.getUint16(MAGIC_BYTES + LENGTH_BYTES, false)
  if (!isKnownCommand(command)) {
    throw new Error('Unknown packet command')
  }

  const bodyBytes = new Uint8Array(buffer, HEADER_BYTES, length - MIN_PACKET_LENGTH)
  const bodyJson = new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes)
  let body: unknown
  try {
    body = JSON.parse(bodyJson)
  } catch {
    throw new Error('Packet body is not valid JSON')
  }

  return { magic, length, cmd: command, body }
}
