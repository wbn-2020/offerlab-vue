export const safeRedirect = (value: unknown, fallback = '/') => {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string') return fallback
  const path = target.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\') || /\s/.test(path)) return fallback
  if (/^\/(?:login|register|welcome)(?:[/?#]|$)/.test(path)) return fallback
  try {
    const url = new URL(path, 'https://wenye.local')
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(.*token.*|.*session.*|auth|sid|debug|preview|invite|utm|utm_.+|includeTestData|source|fallbackReason|scanLimit|degraded)$/i.test(key)) {
        url.searchParams.delete(key)
      }
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export const redirectQuery = (value: unknown, fallback = '/') => {
  const redirect = safeRedirect(value, fallback)
  return redirect === fallback ? {} : { redirect }
}
