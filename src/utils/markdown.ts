import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

md.validateLink = (url: string) => /^(https?:|mailto:)/i.test(url.trim())

const defaultLinkOpen = md.renderer.rules.link_open
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const href = token.attrGet('href') || ''
  if (/^https?:/i.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer nofollow')
  }
  return defaultLinkOpen ? defaultLinkOpen(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
}

const blockedTags = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'base',
  'link',
  'meta',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'svg',
  'math',
])

const allowedTags = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])

const selfClosingTags = new Set(['br', 'hr', 'img'])

const namedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
}

const decodeHtmlEntities = (value: string) => value.replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, (match, entity: string) => {
  const normalized = entity.toLowerCase()
  if (normalized.startsWith('#x')) {
    const codePoint = Number.parseInt(normalized.slice(2), 16)
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
  }
  if (normalized.startsWith('#')) {
    const codePoint = Number.parseInt(normalized.slice(1), 10)
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
  }
  return namedEntities[normalized] ?? match
})

const escapeAttributeValue = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const normalizeUrlForSchemeCheck = (value: string) => decodeHtmlEntities(value)
  .replace(/[\u0000-\u001f\u007f\s]+/g, '')
  .trim()

const isSafeLinkUrl = (value: string) => /^(https?:|mailto:)/i.test(normalizeUrlForSchemeCheck(value))

const isSafeImageUrl = (value: string) => /^(https?:|\/(?!\/)|\.{0,2}\/)/i.test(normalizeUrlForSchemeCheck(value))

const parseAttributes = (attrs: string) => {
  const parsed: Array<{ name: string; value: string }> = []
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = attrPattern.exec(attrs)) !== null) {
    parsed.push({
      name: match[1].toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? '',
    })
  }
  return parsed
}

const safeClassValue = (value: string) => /^[\w\s:-]+$/.test(value)
const safeDimensionValue = (value: string) => /^\d{1,4}%?$/.test(value)

const sanitizeAttributes = (tag: string, rawAttrs: string) => {
  const attrs: string[] = []
  for (const { name, value } of parseAttributes(rawAttrs)) {
    if (!name || name.startsWith('on') || name === 'style' || name === 'srcdoc') continue
    if (name === 'href' && tag === 'a') {
      if (isSafeLinkUrl(value)) attrs.push(`href="${escapeAttributeValue(value.trim())}"`)
      continue
    }
    if (name === 'src' && tag === 'img') {
      if (isSafeImageUrl(value)) attrs.push(`src="${escapeAttributeValue(value.trim())}"`)
      continue
    }
    if (name === 'alt' && tag === 'img') {
      attrs.push(`alt="${escapeAttributeValue(value)}"`)
      continue
    }
    if ((name === 'width' || name === 'height') && tag === 'img') {
      if (safeDimensionValue(value)) attrs.push(`${name}="${escapeAttributeValue(value)}"`)
      continue
    }
    if (name === 'title' && (tag === 'a' || tag === 'img')) {
      attrs.push(`title="${escapeAttributeValue(value)}"`)
      continue
    }
    if (name === 'target' && tag === 'a') {
      if (value === '_blank') attrs.push('target="_blank"')
      continue
    }
    if (name === 'rel' && tag === 'a') {
      attrs.push(`rel="${escapeAttributeValue(value.replace(/[^\w\s-]/g, '').trim())}"`)
      continue
    }
    if (name === 'class' && (tag === 'code' || tag === 'pre')) {
      if (safeClassValue(value)) attrs.push(`class="${escapeAttributeValue(value.trim())}"`)
    }
  }
  return attrs.length ? ` ${attrs.join(' ')}` : ''
}

export const sanitizeMarkdownHtml = (html: string) => {
  if (!html) return ''
  let safe = html.replace(/<!--[\s\S]*?-->/g, '')
  for (const tag of blockedTags) {
    safe = safe.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi'), '')
    safe = safe.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '')
  }

  return safe.replace(/<\/?([a-z][\w:-]*)([^<>]*)>/gi, (fullTag, rawTagName: string, rawAttrs: string) => {
    const tag = rawTagName.toLowerCase()
    if (!allowedTags.has(tag)) return ''
    if (fullTag.startsWith('</')) {
      return selfClosingTags.has(tag) ? '' : `</${tag}>`
    }
    return `<${tag}${sanitizeAttributes(tag, rawAttrs)}${selfClosingTags.has(tag) ? '>' : '>'}`
  })
}

export const renderMarkdown = (value: string) => sanitizeMarkdownHtml(md.render(value || ''))
