export const MAGIC_NUMBER = 0xCAFEBABE

export enum Command {
  AUTH_REQ = 0x0001,
  AUTH_RESP = 0x0002,
  NOTIF_PUSH = 0x0003,
  UNREAD_COUNT = 0x0004,
  PING = 0x0005,
  PONG = 0x0006,
}

export interface Packet {
  magic: number
  length: number
  cmd: Command
  body: any
}

export function encodePacket(cmd: Command, body: any = {}): ArrayBuffer {
  const bodyJson = JSON.stringify(body)
  const bodyBytes = new TextEncoder().encode(bodyJson)
  const length = 4 + 2 + bodyBytes.length

  const buffer = new ArrayBuffer(4 + 2 + 4 + bodyBytes.length)
  const view = new DataView(buffer)

  view.setUint32(0, MAGIC_NUMBER, false)
  view.setUint32(4, length, false)
  view.setUint16(8, cmd, false)

  const bodyArray = new Uint8Array(buffer, 10)
  bodyArray.set(new Uint8Array(bodyBytes))

  return buffer
}

export function decodePacket(buffer: ArrayBuffer): Packet {
  const view = new DataView(buffer)

  const magic = view.getUint32(0, false)
  const length = view.getUint32(4, false)
  const cmd = view.getUint16(8, false) as Command

  const bodyBytes = new Uint8Array(buffer, 10, length - 6)
  const bodyJson = new TextDecoder().decode(bodyBytes)
  const body = JSON.parse(bodyJson)

  return { magic, length, cmd, body }
}
