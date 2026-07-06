import { siteBrand } from '@/utils/brand'

export const SITE_NAME = siteBrand.displayName
export const DEFAULT_DESCRIPTION = `${siteBrand.tagline}，${siteBrand.description}`

type PageSeo = {
  title?: string | null
  description?: string | null
  canonical?: string | null
}

const DESCRIPTION_SELECTOR = 'meta[name="description"]'
const CANONICAL_SELECTOR = 'link[rel="canonical"]'
export const SENSITIVE_CANONICAL_QUERY_KEYS = new Set([
  'token',
  'session',
  'sid',
  'auth',
  'debug',
  'preview',
  'invite',
  'ref',
  'referrer',
  'source',
  'from',
  'q',
  'query',
  'search',
  'keyword',
  'page',
  'pageSize',
  'size',
  'cursor',
  'sort',
  'order',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'experiment',
  'exp',
  'variant',
  'ab',
  'includeTestData',
  'scanLimit',
  'report',
])

const normalizeText = (value?: string | null, maxLength = 160) => {
  const text = String(value || '')
    .replace(/[#*`>_[\]()~!-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trim()}…`
}

const isUnsafeHost = (hostname: string) => {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) return true
  if (normalized === ['local', 'host'].join('')) return true
  if (normalized.endsWith('.local') || normalized.endsWith('.test') || normalized.endsWith('.invalid')) return true
  const parts = normalized.split('.').map((part) => Number(part))
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    const [first, second] = parts
    if (first === 10 || first === 127) return true
    if (first === 172 && second >= 16 && second <= 31) return true
    if (first === 192 && second === 168) return true
  }
  return false
}

const safePublicOrigin = () => {
  const configured = String(import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_APP_PUBLIC_SITE_URL || '').trim()
  const candidates = [
    configured,
    typeof window !== 'undefined' ? window.location.origin : '',
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      if (!['https:', 'http:'].includes(url.protocol)) continue
      if (isUnsafeHost(url.hostname)) continue
      return url.origin
    } catch {
      // Ignore invalid public site configuration and fall back to the next candidate.
    }
  }
  return ''
}

const stripUnsafeQuery = (url: URL) => {
  const next = new URL(url.toString())
  next.hash = ''
  for (const key of [...next.searchParams.keys()]) {
    const normalized = key.trim()
    if (normalized.toLowerCase().startsWith('utm_') || SENSITIVE_CANONICAL_QUERY_KEYS.has(normalized)) {
      next.searchParams.delete(key)
    } else {
      next.searchParams.delete(key)
    }
  }
  return next
}

const normalizeCanonicalPath = (value?: string | null) => {
  const raw = String(value || '').trim()
  const source = raw || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const withoutHash = source.split('#')[0] || '/'
  const withoutQuery = withoutHash.split('?')[0] || '/'

  if (/^https?:\/\//i.test(withoutQuery)) {
    try {
      const parsed = new URL(withoutQuery)
      return parsed.pathname || '/'
    } catch {
      return '/'
    }
  }

  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
}

export const buildCanonicalUrl = (canonical?: string | null) => {
  const origin = safePublicOrigin()
  const path = normalizeCanonicalPath(canonical)

  try {
    if (!origin) return path
    const parsed = stripUnsafeQuery(new URL(path, origin))
    return `${origin}${parsed.pathname}`
  } catch {
    return path || '/'
  }
}

const ensureDescriptionMeta = () => {
  if (typeof document === 'undefined') return null
  const current = document.head.querySelector<HTMLMetaElement>(DESCRIPTION_SELECTOR)
  if (current) return current
  const created = document.createElement('meta')
  created.setAttribute('name', 'description')
  document.head.appendChild(created)
  return created
}

const ensureCanonicalLink = () => {
  if (typeof document === 'undefined') return null
  const current = document.head.querySelector<HTMLLinkElement>(CANONICAL_SELECTOR)
  if (current) return current
  const created = document.createElement('link')
  created.setAttribute('rel', 'canonical')
  document.head.appendChild(created)
  return created
}

export const summarizeSeoText = (value?: string | null, fallback = DEFAULT_DESCRIPTION, maxLength = 160) => {
  const text = normalizeText(value, maxLength)
  return text || fallback
}

export const applyPageSeo = ({ title, description, canonical }: PageSeo = {}) => {
  if (typeof document === 'undefined') return

  const normalizedTitle = normalizeText(title, 80)
  document.title = normalizedTitle ? `${normalizedTitle} - ${SITE_NAME}` : SITE_NAME

  const descriptionMeta = ensureDescriptionMeta()
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', summarizeSeoText(description))
  }

  const canonicalLink = ensureCanonicalLink()
  if (canonicalLink) {
    canonicalLink.setAttribute('href', buildCanonicalUrl(canonical))
  }
}
