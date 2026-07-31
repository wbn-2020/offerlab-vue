const STORAGE_VERSION = 2
const ENVELOPE_PREFIX = '__offerlab_safe_storage_v2__:'
const DEFAULT_MAX_ENTRY_BYTES = 1_500_000
const DEFAULT_MAX_TOTAL_BYTES = 4_000_000

type StorageArea = 'local' | 'session'

export type StorageFailureReason =
  | 'unavailable'
  | 'entry-too-large'
  | 'total-limit'
  | 'quota'
  | 'write-failed'

export type ManagedStorageOptions = {
  ttlMs?: number
  sensitive?: boolean
  owner?: string
  namespace?: string
  maxEntryBytes?: number
  maxTotalBytes?: number
}

export type StorageWriteResult = {
  ok: boolean
  key: string
  bytes: number
  reason?: StorageFailureReason
  error?: unknown
}

type StorageEnvelope = {
  version: typeof STORAGE_VERSION
  value: string
  createdAt: number
  updatedAt: number
  expiresAt?: number
  sensitive?: boolean
  owner?: string
  namespace?: string
}

type DecodedStorageValue = {
  value: string
  envelope?: StorageEnvelope
}

type StorageErrorListener = (result: StorageWriteResult) => void

let lastFailure: StorageWriteResult | null = null
const errorListeners = new Set<StorageErrorListener>()

const now = () => Date.now()

const encodedBytes = (value: string) => {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).byteLength
  return value.length * 2
}

const storageFor = (area: StorageArea): Storage | null => {
  try {
    if (typeof window === 'undefined') return null
    return area === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

const parseEnvelope = (raw: string): DecodedStorageValue => {
  if (!raw.startsWith(ENVELOPE_PREFIX)) return { value: raw }
  try {
    const envelope = JSON.parse(raw.slice(ENVELOPE_PREFIX.length)) as Partial<StorageEnvelope>
    if (
      envelope.version !== STORAGE_VERSION
      || typeof envelope.value !== 'string'
      || !Number.isFinite(envelope.createdAt)
      || !Number.isFinite(envelope.updatedAt)
    ) {
      return { value: raw }
    }
    return {
      value: envelope.value,
      envelope: envelope as StorageEnvelope,
    }
  } catch {
    return { value: raw }
  }
}

const serializeEnvelope = (value: string, options: ManagedStorageOptions, previous?: StorageEnvelope) => {
  const timestamp = now()
  const envelope: StorageEnvelope = {
    version: STORAGE_VERSION,
    value,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    ...(options.ttlMs && options.ttlMs > 0 ? { expiresAt: timestamp + options.ttlMs } : {}),
    ...(options.sensitive ? { sensitive: true } : {}),
    ...(options.owner ? { owner: options.owner } : {}),
    ...(options.namespace ? { namespace: options.namespace } : {}),
  }
  return `${ENVELOPE_PREFIX}${JSON.stringify(envelope)}`
}

const isExpired = (envelope?: StorageEnvelope) => Boolean(
  envelope?.expiresAt && envelope.expiresAt <= now(),
)

const reportFailure = (failure: StorageWriteResult) => {
  lastFailure = failure
  errorListeners.forEach((listener) => listener(failure))
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offerlab:storage-error', { detail: failure }))
    }
  } catch {
    // Observability must never make storage fallback fail harder.
  }
  return failure
}

const isQuotaError = (error: unknown) => {
  const candidate = error as { name?: string; code?: number } | null
  return candidate?.name === 'QuotaExceededError'
    || candidate?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || candidate?.code === 22
    || candidate?.code === 1014
}

const storageBytes = (storage: Storage) => {
  let total = 0
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key) continue
    const value = storage.getItem(key)
    if (value == null) continue
    total += encodedBytes(key) + encodedBytes(value)
  }
  return total
}

const cleanupExpired = (storage: Storage) => {
  const expiredKeys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key) continue
    const raw = storage.getItem(key)
    if (raw == null) continue
    const decoded = parseEnvelope(raw)
    if (isExpired(decoded.envelope)) expiredKeys.push(key)
  }
  expiredKeys.forEach((key) => storage.removeItem(key))
  return expiredKeys.length
}

const read = (area: StorageArea, key: string) => {
  const storage = storageFor(area)
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    if (raw == null) return null
    const decoded = parseEnvelope(raw)
    if (isExpired(decoded.envelope)) {
      storage.removeItem(key)
      return null
    }
    return decoded.value
  } catch {
    return null
  }
}

const write = (
  area: StorageArea,
  key: string,
  value: string,
  options: ManagedStorageOptions = {},
): StorageWriteResult => {
  const storage = storageFor(area)
  if (!storage) {
    return reportFailure({ ok: false, key, bytes: 0, reason: 'unavailable' })
  }

  try {
    cleanupExpired(storage)
    const previousRaw = storage.getItem(key)
    const previous = previousRaw == null ? undefined : parseEnvelope(previousRaw).envelope
    const serialized = serializeEnvelope(value, options, previous)
    const bytes = encodedBytes(key) + encodedBytes(serialized)
    const maxEntryBytes = options.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES
    if (bytes > maxEntryBytes) {
      return reportFailure({ ok: false, key, bytes, reason: 'entry-too-large' })
    }

    const currentBytes = previousRaw == null ? 0 : encodedBytes(key) + encodedBytes(previousRaw)
    const projectedBytes = storageBytes(storage) - currentBytes + bytes
    const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES
    if (projectedBytes > maxTotalBytes) {
      return reportFailure({ ok: false, key, bytes, reason: 'total-limit' })
    }

    storage.setItem(key, serialized)
    return { ok: true, key, bytes }
  } catch (error) {
    return reportFailure({
      ok: false,
      key,
      bytes: encodedBytes(value),
      reason: isQuotaError(error) ? 'quota' : 'write-failed',
      error,
    })
  }
}

const remove = (area: StorageArea, key: string) => {
  try {
    storageFor(area)?.removeItem(key)
  } catch {
    // Storage can be disabled; callers should still degrade gracefully.
  }
}

const getManaged = (
  area: StorageArea,
  key: string,
  options: ManagedStorageOptions,
) => {
  const storage = storageFor(area)
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    if (raw == null) return null
    const decoded = parseEnvelope(raw)
    if (isExpired(decoded.envelope)) {
      storage.removeItem(key)
      return null
    }
    if (!decoded.envelope) {
      // Legacy values stay readable even when the best-effort metadata migration fails.
      write(area, key, decoded.value, options)
    }
    return decoded.value
  } catch {
    return null
  }
}

const legacySensitiveKeyMatchesOwner = (key: string, owner: string) => (
  key.startsWith(`post_draft:${owner}:`)
  || key.startsWith(`mock-interview-draft:${owner}:`)
  || key.startsWith(`offerlab:${owner}:question-note-draft:`)
)

const clearSensitive = (owner?: string) => {
  const storage = storageFor('local')
  if (!storage) return 0
  const keys: string[] = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key) continue
      const raw = storage.getItem(key)
      if (raw == null) continue
      const envelope = parseEnvelope(raw).envelope
      const managedMatch = envelope?.sensitive === true && (!owner || envelope.owner === owner)
      const legacyMatch = Boolean(owner && !envelope && legacySensitiveKeyMatchesOwner(key, owner))
      if (managedMatch || legacyMatch) keys.push(key)
    }
    keys.forEach((key) => storage.removeItem(key))
    return keys.length
  } catch {
    return 0
  }
}

export const safeStorage = {
  get(key: string) {
    return read('local', key)
  },

  set(key: string, value: string, options?: ManagedStorageOptions) {
    return write('local', key, value, options)
  },

  getDraft(key: string, options: ManagedStorageOptions) {
    return getManaged('local', key, { ...options, sensitive: true })
  },

  setDraft(key: string, value: string, options: ManagedStorageOptions) {
    return write('local', key, value, { ...options, sensitive: true })
  },

  remove(key: string) {
    remove('local', key)
  },

  clearSensitive(owner?: string) {
    return clearSensitive(owner)
  },

  cleanupExpired() {
    const storage = storageFor('local')
    return storage ? cleanupExpired(storage) : 0
  },

  getLastFailure() {
    return lastFailure
  },

  onError(listener: StorageErrorListener) {
    errorListeners.add(listener)
    return () => errorListeners.delete(listener)
  },

  sessionGet(key: string) {
    return read('session', key)
  },

  sessionSet(key: string, value: string, options?: ManagedStorageOptions) {
    return write('session', key, value, options)
  },

  sessionRemove(key: string) {
    remove('session', key)
  },
}
