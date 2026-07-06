import type {
  SearchDiscoverySource,
  SearchReviewStatus,
  SearchSuggestionItem,
  SearchSuggestionType,
  ZeroResultAction,
  ZeroResultActionType,
} from '@/api/search'

const suggestionTypes: SearchSuggestionType[] = ['keyword', 'tag', 'topic', 'collection', 'correction', 'synonym']
const discoverySources: SearchDiscoverySource[] = ['remote', 'local', 'fallback', 'demo']
const reviewStatuses: SearchReviewStatus[] = ['SAFE', 'REVIEW_REQUIRED', 'REJECTED']

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const pickEnum = <T extends string>(value: unknown, values: T[], fallback: T): T => {
  return values.includes(value as T) ? value as T : fallback
}

export const isFormalSearchDiscoverySource = (item: Pick<SearchSuggestionItem | ZeroResultAction, 'source'>) => {
  return item.source === 'remote'
}

export const isDisplayOnlySearchDiscoverySource = (source: SearchDiscoverySource) => {
  return source === 'fallback' || source === 'demo'
}

export const isPersistableSearchDiscoveryItem = (item: Pick<SearchSuggestionItem, 'source' | 'reviewStatus'>) => {
  return isFormalSearchDiscoverySource(item) && item.reviewStatus === 'SAFE'
}

export const isDownstreamSearchDiscoveryItem = isPersistableSearchDiscoveryItem

export const isFormalZeroResultAction = (action: Pick<ZeroResultAction, 'source' | 'requiresReview'>) => {
  return isFormalSearchDiscoverySource(action) && !action.requiresReview
}

export const isDownstreamZeroResultAction = isFormalZeroResultAction

export const normalizeSearchSuggestionItem = (
  value: unknown,
  defaults: Partial<SearchSuggestionItem> = {},
): SearchSuggestionItem | null => {
  const raw = typeof value === 'string' ? { text: value } : (value && typeof value === 'object' ? value as Record<string, unknown> : null)
  if (!raw) return null

  const text = asString(raw.text ?? raw.keyword ?? raw.name ?? raw.value ?? defaults.text)
  if (!text) return null

  const source = pickEnum(raw.source ?? defaults.source, discoverySources, defaults.source || 'remote')
  const reviewStatus = pickEnum(raw.reviewStatus ?? defaults.reviewStatus, reviewStatuses, defaults.reviewStatus || 'REVIEW_REQUIRED')
  const suggestionType = pickEnum(raw.suggestionType ?? raw.type ?? defaults.suggestionType, suggestionTypes, defaults.suggestionType || 'keyword')
  const item = {
    text,
    suggestionType,
    source,
    reasonText: asString(raw.reasonText ?? raw.reason) || defaults.reasonText,
    targetHref: asString(raw.targetHref ?? raw.href ?? raw.url) || defaults.targetHref,
    persistable: false,
    reviewStatus,
  }

  return {
    ...item,
    persistable: isPersistableSearchDiscoveryItem(item),
  }
}

export const adaptSearchSuggestionItems = (
  values: unknown,
  defaults: Partial<SearchSuggestionItem> = {},
  limit = 10,
): SearchSuggestionItem[] => {
  const source = Array.isArray(values)
    ? values
    : values && typeof values === 'object' && Array.isArray((values as { items?: unknown[] }).items)
      ? (values as { items: unknown[] }).items
      : []

  const seen = new Set<string>()
  const items: SearchSuggestionItem[] = []
  for (const value of source) {
    const item = normalizeSearchSuggestionItem(value, defaults)
    const key = item ? `${item.suggestionType}:${item.text.toLowerCase()}` : ''
    if (!item || seen.has(key)) continue
    seen.add(key)
    items.push(item)
    if (items.length >= limit) break
  }
  return items
}

const actionLabel = (actionType: ZeroResultActionType, text: string) => {
  if (actionType === 'relax_filter') return '放宽筛选'
  if (actionType === 'try_keyword') return `试试 ${text}`
  if (actionType === 'open_topic') return `查看话题 ${text}`
  if (actionType === 'open_tag') return `查看标签 ${text}`
  if (actionType === 'create_gap') return '记录内容缺口'
  return '去编辑器补充'
}

export const buildZeroResultActions = (
  query: string,
  suggestions: SearchSuggestionItem[] = [],
  source: SearchDiscoverySource = 'fallback',
): ZeroResultAction[] => {
  const originalQuery = query.trim()
  const actions: ZeroResultAction[] = []

  actions.push({
    actionType: 'relax_filter',
    label: actionLabel('relax_filter', originalQuery),
    payload: { originalQuery },
    requiresLogin: false,
    requiresReview: false,
    source,
  })

  for (const item of suggestions.slice(0, 6)) {
    if (item.reviewStatus === 'REJECTED') continue
    const actionType: ZeroResultActionType =
      item.suggestionType === 'topic' ? 'open_topic' :
        item.suggestionType === 'tag' ? 'open_tag' :
          'try_keyword'
    actions.push({
      actionType,
      label: actionLabel(actionType, item.text),
      targetHref: item.targetHref,
      payload: {
        text: item.text,
        suggestionType: item.suggestionType,
        originalQuery,
      },
      requiresLogin: false,
      requiresReview: item.source !== 'remote' || item.reviewStatus !== 'SAFE',
      source: item.source,
    })
  }

  actions.push({
    actionType: 'create_gap',
    label: actionLabel('create_gap', originalQuery),
    payload: { originalQuery },
    requiresLogin: true,
    requiresReview: true,
    source: 'fallback',
  })

  actions.push({
    actionType: 'open_editor',
    label: actionLabel('open_editor', originalQuery),
    targetHref: '/editor',
    payload: { originalQuery },
    requiresLogin: true,
    requiresReview: true,
    source: 'fallback',
  })

  return actions
}
