export const EDITOR_LIMITS = Object.freeze({
  titleMin: 8,
  titleMax: 200,
  contentMax: 50000,
  summaryMax: 240,
  tagMax: 5,
  tagNameMax: 32,
  coverUrlMax: 512,
})

export type EditorField = 'domain' | 'title' | 'content' | 'summary' | 'tags' | 'coverUrl'

export type EditorValidationInput = {
  domain?: number
  title?: unknown
  content?: unknown
  summary?: unknown
  tags?: unknown
  coverUrl?: unknown
  minContentLength: number
  minTagCount: number
}

export type EditorValidationResult = {
  errors: Partial<Record<EditorField, string>>
  normalized: {
    title: string
    content: string
    summary: string
    tags: string[]
    coverUrl: string
  }
}

const text = (value: unknown) => typeof value === 'string' ? value : ''

export const clampEditorText = (value: unknown, maxLength: number) => (
  text(value).slice(0, Math.max(0, maxLength))
)

export const applyEditorTextLimit = (
  previousValue: unknown,
  nextValue: unknown,
  maxLength: number,
) => {
  const previous = text(previousValue)
  const next = text(nextValue)
  const limit = Math.max(0, maxLength)
  if (previous.length > limit) {
    return next.length <= previous.length ? next : previous
  }
  return next.slice(0, limit)
}

export const normalizeEditorTags = (value: unknown) => {
  if (!Array.isArray(value)) return []
  const tags = new Map<string, string>()
  value.forEach((item) => {
    const tag = text(item).trim().replace(/\s+/g, ' ')
    if (!tag) return
    const key = tag.toLocaleLowerCase()
    if (!tags.has(key)) tags.set(key, tag)
  })
  return [...tags.values()]
}

export const isValidPublicHttpUrl = (value: unknown) => {
  const candidate = text(value).trim()
  if (!candidate) return true
  if (candidate.length > EDITOR_LIMITS.coverUrlMax) return false
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const validateEditorPublish = (input: EditorValidationInput): EditorValidationResult => {
  const title = text(input.title).trim()
  const content = text(input.content).trim()
  const summary = text(input.summary).trim()
  const tags = normalizeEditorTags(input.tags)
  const coverUrl = text(input.coverUrl).trim()
  const errors: Partial<Record<EditorField, string>> = {}

  if (!input.domain) errors.domain = '请选择频道'

  if (!title) {
    errors.title = '请输入标题'
  } else if (title.length < EDITOR_LIMITS.titleMin) {
    errors.title = `标题至少需要 ${EDITOR_LIMITS.titleMin} 个字符，当前还差 ${EDITOR_LIMITS.titleMin - title.length} 个`
  } else if (title.length > EDITOR_LIMITS.titleMax) {
    errors.title = `标题最多 ${EDITOR_LIMITS.titleMax} 个字符，当前超出 ${title.length - EDITOR_LIMITS.titleMax} 个`
  }

  const minContentLength = Math.max(1, input.minContentLength)
  if (!content) {
    errors.content = '请输入正文'
  } else if (content.length < minContentLength) {
    errors.content = `正文至少需要 ${minContentLength} 个字符，当前还差 ${minContentLength - content.length} 个`
  } else if (content.length > EDITOR_LIMITS.contentMax) {
    errors.content = `正文最多 ${EDITOR_LIMITS.contentMax} 个字符，当前超出 ${content.length - EDITOR_LIMITS.contentMax} 个`
  }

  if (summary.length > EDITOR_LIMITS.summaryMax) {
    errors.summary = `摘要最多 ${EDITOR_LIMITS.summaryMax} 个字符，当前超出 ${summary.length - EDITOR_LIMITS.summaryMax} 个`
  }

  const minTagCount = Math.max(1, input.minTagCount)
  if (tags.length < minTagCount) {
    errors.tags = `至少添加 ${minTagCount} 个标签`
  } else if (tags.length > EDITOR_LIMITS.tagMax) {
    errors.tags = `最多添加 ${EDITOR_LIMITS.tagMax} 个标签，当前超出 ${tags.length - EDITOR_LIMITS.tagMax} 个`
  } else if (tags.some((tag) => tag.length > EDITOR_LIMITS.tagNameMax)) {
    errors.tags = `单个标签最多 ${EDITOR_LIMITS.tagNameMax} 个字符`
  }

  if (!isValidPublicHttpUrl(coverUrl)) {
    errors.coverUrl = coverUrl.length > EDITOR_LIMITS.coverUrlMax
      ? `封面链接最多 ${EDITOR_LIMITS.coverUrlMax} 个字符`
      : '封面链接必须是完整的 http 或 https 地址'
  }

  return {
    errors,
    normalized: { title, content, summary, tags, coverUrl },
  }
}

export const editorDisabledReason = (
  errors: Partial<Record<EditorField, string>>,
  fieldOrder: EditorField[] = ['title', 'content', 'domain', 'tags', 'summary', 'coverUrl'],
) => {
  const reasons = fieldOrder.map((field) => errors[field]).filter((message): message is string => Boolean(message))
  return reasons.length ? `请先修正：${reasons.join('；')}` : ''
}
