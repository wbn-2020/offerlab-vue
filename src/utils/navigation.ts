export const safeRedirect = (value: unknown, fallback = '/') => {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string') return fallback
  const path = target.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\') || /\s/.test(path)) return fallback
  if (/^\/(?:login|register)(?:[/?#]|$)/.test(path)) return fallback
  return path
}

export const redirectQuery = (value: unknown, fallback = '/') => {
  const redirect = safeRedirect(value, fallback)
  return redirect === fallback ? {} : { redirect }
}
