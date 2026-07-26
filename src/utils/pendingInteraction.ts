import { safeStorage } from './safeStorage'

export type PendingInteractionKind = 'like' | 'favorite'

export interface PendingInteraction {
  intentId: string
  postId: string
  kind: PendingInteractionKind
  ownerUid?: string
}

const STORAGE_KEY = 'pending-interaction'
const STORAGE_NS = 'interaction-intent'
const MAX_AGE_MS = 60_000

const createIntentId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`

const readPendingInteraction = (): PendingInteraction | null => {
  const raw = safeStorage.sessionGet(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PendingInteraction>
    if (
      typeof parsed.intentId !== 'string'
      || typeof parsed.postId !== 'string'
      || (parsed.kind !== 'like' && parsed.kind !== 'favorite')
      || (parsed.ownerUid !== undefined && typeof parsed.ownerUid !== 'string')
    ) {
      clearPendingInteraction()
      return null
    }
    return parsed as PendingInteraction
  } catch {
    clearPendingInteraction()
    return null
  }
}

const writePendingInteraction = (pending: PendingInteraction) => {
  safeStorage.sessionSet(STORAGE_KEY, JSON.stringify(pending), {
    namespace: STORAGE_NS,
    ttlMs: MAX_AGE_MS,
    sensitive: true,
    ...(pending.ownerUid ? { owner: pending.ownerUid } : {}),
  })
}

export const rememberPendingInteraction = (
  postId: string | number,
  kind: PendingInteractionKind,
) => {
  writePendingInteraction({
    intentId: createIntentId(),
    postId: String(postId),
    kind,
  })
}

export const claimPendingInteraction = (ownerUid: string | number) => {
  const pending = readPendingInteraction()
  if (!pending) return
  const owner = String(ownerUid)
  if (pending.ownerUid && pending.ownerUid !== owner) {
    clearPendingInteraction()
    return
  }
  writePendingInteraction({ ...pending, ownerUid: owner })
}

export const findPendingInteraction = (
  postId: string | number,
  ownerUid: string | number,
): PendingInteraction | null => {
  const pending = readPendingInteraction()
  if (!pending) return null
  if (pending.postId !== String(postId)) return null
  if (!pending.ownerUid || pending.ownerUid !== String(ownerUid)) return null
  return pending
}

export const consumePendingInteraction = (expected: PendingInteraction) => {
  const current = readPendingInteraction()
  if (!current || current.intentId !== expected.intentId) return false
  clearPendingInteraction()
  return true
}

export const clearPendingInteraction = () => {
  safeStorage.sessionRemove(STORAGE_KEY)
}
