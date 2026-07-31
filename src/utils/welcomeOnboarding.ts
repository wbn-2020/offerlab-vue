import { safeStorage } from './safeStorage'

const STORAGE_KEY = 'welcome-onboarding'
const STORAGE_NS = 'registration-onboarding'
const MAX_AGE_MS = 30 * 60_000

export const beginWelcomeOnboarding = (uid: string | number) => {
  const ownerUid = String(uid)
  safeStorage.sessionSet(STORAGE_KEY, ownerUid, {
    namespace: STORAGE_NS,
    owner: ownerUid,
    sensitive: true,
    ttlMs: MAX_AGE_MS,
  })
}

export const canAccessWelcomeOnboarding = (uid: string | number | null | undefined) =>
  uid != null && safeStorage.sessionGet(STORAGE_KEY) === String(uid)

export const clearWelcomeOnboarding = () => {
  safeStorage.sessionRemove(STORAGE_KEY)
}
