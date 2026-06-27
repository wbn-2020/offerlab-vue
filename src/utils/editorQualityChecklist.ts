import { DOMAIN, getDomainLabel, normalizeDomain, type DomainValue } from '@/utils/domains'

export type EditorQualityChecklistState = 'complete' | 'needs-work' | 'tip'

export type EditorQualityChecklistKey =
  | 'title'
  | 'content'
  | 'domain'
  | 'tags'
  | 'anonymous'
  | 'series'

export interface EditorQualityChecklistTagLike {
  label?: string | null
  name?: string | null
  text?: string | null
}

export interface EditorQualityChecklistInput {
  title?: string | null
  content?: string | null
  domain?: number | string | null
  domainLabel?: string | null
  tags?: Array<string | EditorQualityChecklistTagLike> | null
  anonymous?: boolean | null
  seriesId?: string | number | null
  seriesTitle?: string | null
  minTitleLength?: number
  maxTitleLength?: number
  minContentLength?: number
  strongContentLength?: number
}

export interface EditorQualityChecklistItem {
  key: EditorQualityChecklistKey
  title: string
  description: string
  state: EditorQualityChecklistState
  complete: boolean
  required: boolean
}

export interface EditorQualityChecklistSummary {
  total: number
  completed: number
  needsWork: number
  tips: number
  requiredTotal: number
  requiredCompleted: number
  progressPercent: number
  headline: string
  hint: string
  nextFocus: string[]
}

export interface EditorQualityChecklistResult {
  items: EditorQualityChecklistItem[]
  summary: EditorQualityChecklistSummary
  normalized: {
    title: string
    content: string
    plainText: string
    domain?: DomainValue
    domainLabel: string
    tags: string[]
    anonymous: boolean
    hasSeries: boolean
  }
}

const DEFAULT_MIN_TITLE_LENGTH = 8
const DEFAULT_MAX_TITLE_LENGTH = 60
const DEFAULT_MIN_CONTENT_LENGTH = 80
const DEFAULT_STRONG_CONTENT_LENGTH = 220

const SENSITIVE_CAREER_PATTERNS = [
  /薪资/u,
  /工资/u,
  /年包/u,
  /裁员/u,
  /绩效/u,
  /leader/iu,
  /主管/u,
  /老板/u,
  /公司/u,
  /hr/iu,
  /面试/u,
  /offer/iu,
]

const SERIES_CUE_PATTERNS = [
  /系列/u,
  /专题/u,
  /连载/u,
  /第[\d一二三四五六七八九十百]+[篇期章讲]/u,
  /part\s*\d+/iu,
  /episode\s*\d+/iu,
  /续/u,
]

const normalizeText = (value?: string | number | null) => String(value ?? '').trim()

const normalizeTag = (value: string | EditorQualityChecklistTagLike | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  return normalizeText(value.label || value.name || value.text)
}

const stripMarkdown = (value: string) => value
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`[^`]*`/g, ' ')
  .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
  .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
  .replace(/[#>*_\-~|]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const meaningfulParagraphCount = (plainText: string) => plainText
  .split(/[。！？!?；;\n\r]+/u)
  .map((item) => item.trim())
  .filter((item) => item.length >= 18)
  .length

const hasSeriesCue = (title: string, content: string) => {
  const source = `${title}\n${content}`
  return SERIES_CUE_PATTERNS.some((pattern) => pattern.test(source))
}

const hasSensitiveCareerDetails = (title: string, content: string) => {
  const source = `${title}\n${content}`
  return SENSITIVE_CAREER_PATTERNS.some((pattern) => pattern.test(source))
}

const buildHeadline = (completed: number, needsWork: number, tips: number) => {
  if (needsWork === 0 && tips === 0) return '信息已经比较完整，可以进入发布前最后检查。'
  if (needsWork === 0) return '核心信息已齐，可以按提示再补一层可读性和归档信息。'
  if (completed <= 1) return '先把最基本的发布信息补齐，读者会更容易理解你在写什么。'
  return '主体已经成型，再补几项关键信息会更稳。'
}

const buildHint = (needsWorkItems: EditorQualityChecklistItem[], tipItems: EditorQualityChecklistItem[]) => {
  if (needsWorkItems.length > 0) {
    return `优先补齐：${needsWorkItems.slice(0, 2).map((item) => item.title).join('、')}`
  }
  if (tipItems.length > 0) {
    return `可继续优化：${tipItems.slice(0, 2).map((item) => item.title).join('、')}`
  }
  return '继续核对排版、配图和最终措辞后即可发布。'
}

export const evaluateEditorQualityChecklist = (
  input: EditorQualityChecklistInput,
): EditorQualityChecklistResult => {
  const title = normalizeText(input.title)
  const content = normalizeText(input.content)
  const plainText = stripMarkdown(content)
  const tags = (input.tags || []).map((item) => normalizeTag(item)).filter(Boolean)
  const anonymous = Boolean(input.anonymous)
  const hasSeries = Boolean(normalizeText(input.seriesId) || normalizeText(input.seriesTitle))
  const domain = input.domain == null || input.domain === ''
    ? undefined
    : normalizeDomain(input.domain)
  const domainLabel = normalizeText(input.domainLabel) || (domain ? getDomainLabel(domain) : '')

  const minTitleLength = Math.max(1, input.minTitleLength ?? DEFAULT_MIN_TITLE_LENGTH)
  const maxTitleLength = Math.max(minTitleLength, input.maxTitleLength ?? DEFAULT_MAX_TITLE_LENGTH)
  const minContentLength = Math.max(1, input.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH)
  const strongContentLength = Math.max(minContentLength, input.strongContentLength ?? DEFAULT_STRONG_CONTENT_LENGTH)

  const paragraphCount = meaningfulParagraphCount(plainText)
  const contentLength = plainText.length
  const seriesCue = hasSeriesCue(title, content)
  const isCareerDomain = domain === DOMAIN.CAREER
  const hasSensitiveCareerCue = isCareerDomain && hasSensitiveCareerDetails(title, content)

  const items: EditorQualityChecklistItem[] = [
    {
      key: 'title',
      title: '标题',
      description: title.length >= minTitleLength && title.length <= maxTitleLength
        ? '标题长度合适，读者和搜索结果都更容易快速判断主题。'
        : `建议用 ${minTitleLength}-${maxTitleLength} 个字把主题点明，避免过短或信息过散。`,
      state: title.length >= minTitleLength && title.length <= maxTitleLength ? 'complete' : 'needs-work',
      complete: title.length >= minTitleLength && title.length <= maxTitleLength,
      required: true,
    },
    {
      key: 'content',
      title: '正文',
      description: contentLength >= strongContentLength || paragraphCount >= 3
        ? '正文已经覆盖了足够的信息量，适合继续做排版和表达优化。'
        : contentLength >= minContentLength
          ? '建议再补一点背景、过程或结论，让不熟悉上下文的读者也能看懂。'
          : `正文建议至少有 ${minContentLength} 个有效字符，并尽量写出背景、过程和结论。`,
      state: contentLength >= strongContentLength || paragraphCount >= 3
        ? 'complete'
        : contentLength >= minContentLength
          ? 'tip'
          : 'needs-work',
      complete: contentLength >= strongContentLength || paragraphCount >= 3,
      required: true,
    },
    {
      key: 'domain',
      title: '领域',
      description: domain
        ? `当前归类到“${domainLabel || getDomainLabel(domain)}”，有助于推荐给更匹配的读者。`
        : '请选择最贴近的内容领域，方便社区分发、筛选和后续沉淀。',
      state: domain ? 'complete' : 'needs-work',
      complete: Boolean(domain),
      required: true,
    },
    {
      key: 'tags',
      title: '标签',
      description: tags.length >= 2
        ? '标签信息比较完整，方便搜索、相关推荐和后续专题聚合。'
        : tags.length === 1
          ? '已经有基础标签，若再补一个主题或场景标签会更利于被发现。'
          : '至少补 1 个标签，最好同时覆盖主题词和场景词。',
      state: tags.length >= 2 ? 'complete' : tags.length === 1 ? 'tip' : 'needs-work',
      complete: tags.length >= 2,
      required: true,
    },
    {
      key: 'anonymous',
      title: '匿名提示',
      description: isCareerDomain
        ? anonymous
          ? '当前将以匿名方式发布，适合包含公司、薪资或管理关系等敏感细节的内容。'
          : hasSensitiveCareerCue
            ? '内容里可能包含职场敏感信息，发布前可以再确认是否需要匿名。'
            : '如果内容涉及真实公司、团队关系或个人隐私，发布前可以考虑匿名。'
        : anonymous
          ? '当前已开启匿名，请确认这符合你的表达预期。'
          : '当前领域通常可实名表达；若涉及个人隐私，仍可手动改为匿名。',
      state: isCareerDomain
        ? anonymous
          ? 'complete'
          : hasSensitiveCareerCue
            ? 'needs-work'
            : 'tip'
        : anonymous
          ? 'tip'
          : 'complete',
      complete: isCareerDomain ? anonymous : !anonymous,
      required: false,
    },
    {
      key: 'series',
      title: '系列归属',
      description: hasSeries
        ? `已关联到系列${normalizeText(input.seriesTitle) ? `“${normalizeText(input.seriesTitle)}”` : ''}，后续读者更容易连续阅读。`
        : seriesCue
          ? '标题或正文像是系列内容，建议挂到对应系列，方便连续阅读和统一沉淀。'
          : contentLength >= strongContentLength
            ? '这篇内容已经比较完整；如果你会持续写同主题，可以考虑放进系列。'
            : '暂时未关联系列；独立发布也可以，后续想持续更新时再归档到系列即可。',
      state: hasSeries ? 'complete' : seriesCue ? 'needs-work' : 'tip',
      complete: hasSeries,
      required: false,
    },
  ]

  const completed = items.filter((item) => item.state === 'complete').length
  const needsWorkItems = items.filter((item) => item.state === 'needs-work')
  const tipItems = items.filter((item) => item.state === 'tip')
  const requiredItems = items.filter((item) => item.required)
  const requiredCompleted = requiredItems.filter((item) => item.state === 'complete').length

  return {
    items,
    summary: {
      total: items.length,
      completed,
      needsWork: needsWorkItems.length,
      tips: tipItems.length,
      requiredTotal: requiredItems.length,
      requiredCompleted,
      progressPercent: Math.round((completed / Math.max(items.length, 1)) * 100),
      headline: buildHeadline(completed, needsWorkItems.length, tipItems.length),
      hint: buildHint(needsWorkItems, tipItems),
      nextFocus: needsWorkItems.concat(tipItems).slice(0, 3).map((item) => item.title),
    },
    normalized: {
      title,
      content,
      plainText,
      domain,
      domainLabel,
      tags,
      anonymous,
      hasSeries,
    },
  }
}

export const buildEditorQualityChecklist = evaluateEditorQualityChecklist
