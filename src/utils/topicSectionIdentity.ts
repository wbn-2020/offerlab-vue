export const legacyTopicSectionKey = (title: unknown, fallbackIndex: number): string => {
  const normalized = String(title ?? '').trim().toLowerCase()
  if (!normalized) return `legacy-section-${Math.max(1, fallbackIndex)}`

  let primary = 0x811c9dc5
  let secondary = 0x9e3779b9
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index)
    primary = Math.imul(primary ^ code, 0x01000193)
    secondary = Math.imul(secondary ^ code, 0x85ebca6b)
  }
  return `legacy-section-${(primary >>> 0).toString(36)}-${(secondary >>> 0).toString(36)}`
}

export const nonEmptyTopicItemList = <T>(
  primary: T[] | null | undefined,
  secondary: T[] | null | undefined,
): T[] | null => {
  if (Array.isArray(primary) && primary.length > 0) return primary
  if (Array.isArray(secondary) && secondary.length > 0) return secondary
  return null
}
