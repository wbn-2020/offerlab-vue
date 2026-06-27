import type { ContentSeriesRecord } from '@/api/contentSeries'
import type { PublicDomainConfig } from '@/api/domains'
import { DOMAIN, getDomainOption, normalizeDomain } from '@/utils/domains'
import { sanitizeVisibleText } from '@/utils/textQuality'

type PreviewTagLike = string | number | { name?: unknown; label?: unknown; value?: unknown } | null | undefined

export interface EditorPreviewDraftInput {
  title?: unknown
  content?: unknown
  domain?: number | string | null
  tags?: PreviewTagLike[]
  tagLabels?: PreviewTagLike[]
  anonymousCareerPost?: boolean
  selectedSeriesId?: string | number | null
  summary?: unknown
  extension?: Record<string, unknown> | null
}

export type EditorPreviewDomainInput = Pick<PublicDomainConfig, 'domain' | 'domainName' | 'icon' | 'description'>

export type EditorPreviewSeriesInput = Pick<ContentSeriesRecord, 'id' | 'title' | 'summary' | 'status' | 'progress'>

export interface EditorPreviewMapOptions {
  domains?: EditorPreviewDomainInput[]
  seriesRecords?: EditorPreviewSeriesInput[]
  fallbackSummary?: string
  summaryLength?: number
}

export interface EditorPreviewModel {
  isEmpty: boolean
  title: string
  titlePlaceholder: boolean
  summary: string
  summaryPlaceholder: boolean
  summarySource: 'explicit' | 'derived' | 'placeholder'
  domain: {
    value: number
    label: string
    icon: string
    description: string
  }
  tags: string[]
  anonymous: {
    enabled: boolean
    label: string
    description: string
  }
  series: {
    selected: boolean
    id?: string
    title: string
    description: string
    tone: 'accent' | 'neutral'
  }
  placeholder: {
    title: string
    description: string
  }
}

export const EDITOR_PREVIEW_COPY = {
  emptyTitle: '\u9884\u89c8\u4f1a\u968f\u7740\u8349\u7a3f\u5185\u5bb9\u5b9e\u65f6\u66f4\u65b0',
  emptyDescription: '\u7ee7\u7eed\u8865\u5145\u6807\u9898\u3001\u6b63\u6587\u548c\u6807\u7b7e\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u53d1\u5e03\u540e\u7684\u79fb\u52a8\u7aef\u5361\u7247\u6548\u679c\u3002',
  titlePlaceholder: '\u5f85\u5b8c\u5584\u6807\u9898',
  summaryPlaceholder: '\u8865\u5145\u6b63\u6587\u540e\uff0c\u8fd9\u91cc\u4f1a\u81ea\u52a8\u751f\u6210\u4e00\u6bb5\u6458\u8981\u9884\u89c8\uff0c\u5e2e\u52a9\u4f60\u5feb\u901f\u68c0\u67e5\u53d1\u5e03\u5361\u7247\u7684\u7b2c\u4e00\u5c4f\u4fe1\u606f\u3002',
  anonymousCareerOnLabel: '\u533f\u540d\u53d1\u5e03',
  anonymousCareerOnDescription: '\u5f53\u524d\u662f\u804c\u573a\u5185\u5bb9\u533f\u540d\u6001\uff0c\u9884\u89c8\u4e2d\u4f1a\u9690\u85cf\u4f60\u7684\u516c\u5f00\u8eab\u4efd\uff0c\u53ea\u4fdd\u7559\u5185\u5bb9\u672c\u8eab\u3002',
  anonymousCareerOffLabel: '\u516c\u5f00\u8eab\u4efd',
  anonymousCareerOffDescription: '\u5f53\u524d\u4f1a\u5c55\u793a\u4f60\u7684\u516c\u5f00\u8eab\u4efd\u4e0e\u5185\u5bb9\u5f52\u5c5e\uff0c\u9002\u5408\u7ecf\u9a8c\u603b\u7ed3\u3001\u9879\u76ee\u590d\u76d8\u548c\u8d44\u6e90\u5206\u4eab\u3002',
  seriesSelectedTitlePrefix: '\u7cfb\u5217\u5f52\u5c5e',
  seriesSelectedDescriptionPrefix: '\u53d1\u5e03\u540e\u8be5\u5185\u5bb9\u4f1a\u5f52\u5165\u6240\u9009\u7cfb\u5217\uff0c\u65b9\u4fbf\u8bfb\u8005\u6309\u4e3b\u9898\u8fde\u7eed\u9605\u8bfb\u3002',
  seriesUnselectedTitle: '\u672a\u52a0\u5165\u7cfb\u5217',
  seriesUnselectedDescription: '\u5f53\u524d\u5185\u5bb9\u5c06\u4ee5\u72ec\u7acb\u5e16\u5b50\u53d1\u5e03\uff1b\u5982\u679c\u8fd9\u662f\u8fde\u7eed\u66f4\u65b0\u5185\u5bb9\uff0c\u5efa\u8bae\u8865\u5145\u7cfb\u5217\u5f52\u5c5e\u3002',
  selectedSeriesFallback: '\u5df2\u9009\u62e9\u7cfb\u5217',
} as const

const DEFAULT_SUMMARY_LENGTH = 96

const normalizeText = (value: unknown) => sanitizeVisibleText(value)

const normalizeSeriesId = (value: unknown) => {
  const normalized = normalizeText(value)
  return normalized ? String(normalized) : ''
}

const normalizeTag = (value: PreviewTagLike) => {
  if (typeof value === 'string') return normalizeText(value)
  if (typeof value === 'number') return ''
  if (!value || typeof value !== 'object') return ''
  return normalizeText(value.name) || normalizeText(value.label) || normalizeText(value.value)
}

const unique = <T>(items: T[]) => [...new Set(items)]

const collectTags = (draft: EditorPreviewDraftInput) => {
  const preferred = Array.isArray(draft.tagLabels) && draft.tagLabels.length ? draft.tagLabels : draft.tags
  return unique((preferred || []).map(normalizeTag).filter(Boolean)).slice(0, 6)
}

const stripMarkdown = (value: string) => {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const truncate = (value: string, length: number) => {
  if (value.length <= length) return value
  return `${value.slice(0, Math.max(0, length - 3)).trimEnd()}...`
}

const deriveSummaryFromContent = (content: string, length: number) => {
  const visible = stripMarkdown(content)
  return visible ? truncate(visible, length) : ''
}

const resolveSummary = (draft: EditorPreviewDraftInput, options: EditorPreviewMapOptions) => {
  const explicitSummary = normalizeText(draft.summary)
    || normalizeText(draft.extension?.summary)
  if (explicitSummary) {
    return {
      text: truncate(explicitSummary, options.summaryLength || DEFAULT_SUMMARY_LENGTH),
      placeholder: false,
      source: 'explicit' as const,
    }
  }

  const fallbackSummary = normalizeText(options.fallbackSummary)
  if (fallbackSummary) {
    return {
      text: truncate(fallbackSummary, options.summaryLength || DEFAULT_SUMMARY_LENGTH),
      placeholder: false,
      source: 'derived' as const,
    }
  }

  const derived = deriveSummaryFromContent(normalizeText(draft.content), options.summaryLength || DEFAULT_SUMMARY_LENGTH)
  if (derived) {
    return {
      text: derived,
      placeholder: false,
      source: 'derived' as const,
    }
  }

  return {
    text: EDITOR_PREVIEW_COPY.summaryPlaceholder,
    placeholder: true,
    source: 'placeholder' as const,
  }
}

const resolveDomain = (domainValue: unknown, domains: EditorPreviewDomainInput[] = []) => {
  const safeDomainValue = typeof domainValue === 'number' || typeof domainValue === 'string' || domainValue == null
    ? domainValue
    : undefined
  const normalizedValue = normalizeDomain(safeDomainValue)
  const matched = domains.find((item) => Number(item.domain) === Number(normalizedValue))
  const fallback = getDomainOption(normalizedValue)
  return {
    value: normalizedValue,
    label: normalizeText(matched?.domainName) || fallback.label,
    icon: normalizeText(matched?.icon) || fallback.icon,
    description: normalizeText(matched?.description) || fallback.description,
  }
}

const resolveAnonymous = (domainValue: number, anonymousCareerPost: boolean) => {
  const enabled = domainValue === DOMAIN.CAREER && Boolean(anonymousCareerPost)
  if (enabled) {
    return {
      enabled: true,
      label: EDITOR_PREVIEW_COPY.anonymousCareerOnLabel,
      description: EDITOR_PREVIEW_COPY.anonymousCareerOnDescription,
    }
  }
  return {
    enabled: false,
    label: EDITOR_PREVIEW_COPY.anonymousCareerOffLabel,
    description: EDITOR_PREVIEW_COPY.anonymousCareerOffDescription,
  }
}

const resolveSeries = (
  draft: EditorPreviewDraftInput,
  seriesRecords: EditorPreviewSeriesInput[] = [],
) => {
  const selectedSeriesId = normalizeSeriesId(draft.selectedSeriesId) || normalizeSeriesId(draft.extension?.seriesId)
  const matchedRecord = selectedSeriesId
    ? seriesRecords.find((item) => String(item.id) === selectedSeriesId)
    : undefined
  const seriesTitle = normalizeText(matchedRecord?.title) || normalizeText(draft.extension?.seriesTitle)

  if (selectedSeriesId || seriesTitle) {
    const readableTitle = seriesTitle || EDITOR_PREVIEW_COPY.selectedSeriesFallback
    const progressText = normalizeText(matchedRecord?.progress?.label)
    return {
      selected: true,
      id: selectedSeriesId || undefined,
      title: `${EDITOR_PREVIEW_COPY.seriesSelectedTitlePrefix}: ${readableTitle}`,
      description: `${EDITOR_PREVIEW_COPY.seriesSelectedDescriptionPrefix}${progressText ? ` \u5f53\u524d\u8fdb\u5ea6: ${progressText}\u3002` : ''}`,
      tone: 'accent' as const,
    }
  }

  return {
    selected: false,
    id: undefined,
    title: EDITOR_PREVIEW_COPY.seriesUnselectedTitle,
    description: EDITOR_PREVIEW_COPY.seriesUnselectedDescription,
    tone: 'neutral' as const,
  }
}

export const mapEditorDraftToPreview = (
  draft: EditorPreviewDraftInput,
  options: EditorPreviewMapOptions = {},
): EditorPreviewModel => {
  const title = normalizeText(draft.title)
  const domain = resolveDomain(draft.domain, options.domains)
  const summary = resolveSummary(draft, options)
  const tags = collectTags(draft)
  const anonymous = resolveAnonymous(domain.value, Boolean(draft.anonymousCareerPost))
  const series = resolveSeries(draft, options.seriesRecords)

  const isEmpty = !title && !normalizeText(draft.content) && tags.length === 0 && summary.source === 'placeholder'

  return {
    isEmpty,
    title: title || EDITOR_PREVIEW_COPY.titlePlaceholder,
    titlePlaceholder: !title,
    summary: summary.text,
    summaryPlaceholder: summary.placeholder,
    summarySource: summary.source,
    domain,
    tags,
    anonymous,
    series,
    placeholder: {
      title: EDITOR_PREVIEW_COPY.emptyTitle,
      description: EDITOR_PREVIEW_COPY.emptyDescription,
    },
  }
}
