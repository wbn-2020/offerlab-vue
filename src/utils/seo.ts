export const SITE_NAME = 'OfferLab 综合社区'
export const DEFAULT_DESCRIPTION = 'OfferLab 是一个多领域实践社区，围绕技术、职场、阅读、生活与投资理财分享真实经验。'

type PageSeo = {
  title?: string | null
  description?: string | null
  canonical?: string | null
}

const DESCRIPTION_SELECTOR = 'meta[name="description"]'
const CANONICAL_SELECTOR = 'link[rel="canonical"]'

const normalizeText = (value?: string | null, maxLength = 160) => {
  const text = String(value || '')
    .replace(/[#*`>_[\]()~!-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trim()}…`
}

const resolveCanonical = (canonical?: string | null) => {
  if (typeof window === 'undefined') return ''
  const raw = String(canonical || '').trim()
  if (!raw) return `${window.location.origin}${window.location.pathname}${window.location.search}`
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${window.location.origin}${raw.startsWith('/') ? raw : `/${raw}`}`
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
    canonicalLink.setAttribute('href', resolveCanonical(canonical))
  }
}
