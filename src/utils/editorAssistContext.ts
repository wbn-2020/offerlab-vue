import type {
  EditorAssistAction,
  EditorAssistContext,
  EditorAssistContextParseResult,
  EditorAssistContextType,
  EditorAssistFallbackReason,
  EditorAssistSource,
  EditorAssistSourceHint,
  EditorSearchGapContext,
} from '@/api/types'

type QueryLike = Record<string, unknown>

export const CREATOR_WORKBENCH_EDITOR_ACTIONS: readonly EditorAssistAction[] = [
  'update',
  'reply',
  'continue',
  'series',
  'topic',
  'template',
  'fulfill',
]

export const EDITOR_ASSIST_CONTEXT_TYPES: readonly EditorAssistContextType[] = [
  'post',
  'reply',
  'idea',
  'series',
  'topic',
  'template',
  'need',
]

export const EDITOR_ASSIST_ENTRY_SOURCES: readonly EditorAssistSource[] = [
  'creator_workbench',
  'post_detail',
  'series_entry',
  'topic_candidate',
  'content_type_template',
  'collaboration_need',
  'manual_publish',
]

const LEGACY_CONTEXT_SOURCES = new Set([
  'own_post_feedback',
  'comment_question',
  'series_gap',
  'topic_idea',
  'creator_topic_idea',
  'search_gap',
])

const ACTIONS = new Set<string>(CREATOR_WORKBENCH_EDITOR_ACTIONS)
const CONTEXT_TYPES = new Set<string>(EDITOR_ASSIST_CONTEXT_TYPES)
const ENTRY_SOURCES = new Set<string>(EDITOR_ASSIST_ENTRY_SOURCES)
const SEARCH_GAP_SOURCES = new Set(['search_gap', 'search_discovery'])

const firstValue = (value: unknown) => Array.isArray(value) ? value[0] : value

const safeText = (value: unknown, maxLength: number) => {
  const raw = firstValue(value)
  if (typeof raw !== 'string' && typeof raw !== 'number') return ''
  const text = String(raw)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const parseEditorQuery = (value: unknown): QueryLike => {
  const raw = firstValue(value)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as QueryLike
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as QueryLike : {}
  } catch {
    try {
      return Object.fromEntries(new URLSearchParams(raw).entries())
    } catch {
      return {}
    }
  }
}

const flatQuery = (query: QueryLike): QueryLike => ({
  ...query,
  ...parseEditorQuery(query.editorQuery),
})

const sameSitePath = (value: unknown) => {
  const text = safeText(value, 180)
  if (!text || !text.startsWith('/') || text.startsWith('//')) return undefined
  if (/^\/editor(?:\/|$|\?)/.test(text)) return undefined
  if (/\s/.test(text)) return undefined
  return text
}

const searchGapDegraded = (
  fallbackReason: EditorAssistFallbackReason,
  source?: EditorSearchGapContext['source'],
) => ({
  context: null as EditorSearchGapContext | null,
  source,
  degraded: true,
  fallbackReason,
  canShowSourceHint: false,
  sourceHint: null as EditorAssistSourceHint | null,
})

const editorAssistIds = (query: QueryLike) => ({
  postId: safeText(query.postId, 32),
  commentId: safeText(query.commentId, 64),
  ideaId: safeText(query.ideaId, 64),
  seriesId: safeText(query.seriesId, 64),
  needId: safeText(query.needId, 64),
  topicId: safeText(query.topicId, 64),
  templateCode: safeText(query.templateCode, 64),
})

const inferContextType = (
  ids: ReturnType<typeof editorAssistIds>,
  action?: EditorAssistAction,
): EditorAssistContextType | undefined => {
  if (ids.postId && action === 'reply') return 'reply'
  if (ids.ideaId) return 'idea'
  if (ids.seriesId && action === 'series') return 'series'
  if (ids.postId && action === 'series') return 'series'
  if (ids.topicId && action === 'topic') return 'topic'
  if (ids.needId && action === 'fulfill') return 'need'
  if (ids.templateCode && action === 'template') return 'template'
  if (ids.postId) return 'post'
  if (ids.seriesId) return 'series'
  if (ids.topicId) return 'topic'
  if (ids.needId) return 'need'
  if (ids.templateCode) return 'template'
  return undefined
}

const missingRequiredId = (context: EditorAssistContext) => {
  if (context.contextType === 'reply') return !context.postId || !context.commentId
  if (context.contextType === 'idea') return !context.ideaId
  if (context.contextType === 'series') return !context.seriesId && !context.postId
  if (context.contextType === 'topic') return !context.topicId && !context.ideaId
  if (context.contextType === 'need') return !context.needId
  if (context.contextType === 'post') return Boolean(context.action && ['update', 'reply', 'continue'].includes(context.action)) && !context.postId
  return false
}

const degraded = (
  fallbackReason: EditorAssistFallbackReason,
  source?: EditorAssistSource,
): EditorAssistContextParseResult => ({
  context: null,
  source,
  degraded: true,
  fallbackReason,
  canShowSourceHint: false,
  sourceHint: null,
})

export function parseEditorAssistContext(input: QueryLike = {}): EditorAssistContextParseResult {
  const query = flatQuery(input)
  const source = safeText(query.source, 40)
  const fallbackSource = source || 'manual_publish'
  if (!source) return degraded('missing_source', fallbackSource as EditorAssistSource)
  if (LEGACY_CONTEXT_SOURCES.has(source)) return degraded('context_only_source')
  if (!ENTRY_SOURCES.has(source)) return degraded('invalid_source')

  const entrySource = source as EditorAssistSource
  const ids = editorAssistIds(query)
  const rawAction = safeText(query.action, 32)
  if (!rawAction) return degraded('missing_action', entrySource)
  if (!ACTIONS.has(rawAction)) return degraded('invalid_action', entrySource)
  const action = rawAction as EditorAssistAction

  const rawContextType = safeText(query.contextType, 32)
  if (rawContextType && !CONTEXT_TYPES.has(rawContextType)) return degraded('invalid_context_type', entrySource)
  const contextType = rawContextType
    ? rawContextType as EditorAssistContextType
    : inferContextType(ids, action)
  if (!contextType) return degraded('missing_context_type', entrySource)

  const context: EditorAssistContext = {
    source: entrySource,
    action,
    contextType,
    postId: ids.postId || undefined,
    commentId: ids.commentId || undefined,
    ideaId: ids.ideaId || undefined,
    seriesId: ids.seriesId || undefined,
    needId: ids.needId || undefined,
    topicId: ids.topicId || undefined,
    templateCode: ids.templateCode || undefined,
    title: safeText(query.title, 96) || undefined,
    postType: safeText(query.postType, 32) || undefined,
    topic: safeText(query.topic, 64) || undefined,
    reasonText: safeText(query.reasonText, 140) || undefined,
    returnHref: sameSitePath(query.returnHref ?? query.returnTo),
    contextSource: safeText(query.contextSource ?? query.sourceType, 48) || undefined,
    legacySource: safeText(query.legacySource ?? query.contextSource ?? query.sourceType, 48) || undefined,
  }

  if (missingRequiredId(context)) return degraded('missing_context_id', entrySource)

  return {
    context,
    source: entrySource,
    degraded: false,
    canShowSourceHint: true,
    sourceHint: buildEditorAssistSourceHint(context),
  }
}

export function parseEditorSearchGapContext(input: QueryLike = {}) {
  const query = flatQuery(input)
  const source = safeText(query.source, 40)
  if (!source) return searchGapDegraded('missing_source')
  if (!SEARCH_GAP_SOURCES.has(source)) return searchGapDegraded('invalid_source')
  const keyword = safeText(query.keyword, 80)
  if (!keyword) return searchGapDegraded('missing_context_id', source as EditorSearchGapContext['source'])
  const context: EditorSearchGapContext = {
    source: source as EditorSearchGapContext['source'],
    keyword,
    clusterId: safeText(query.clusterId, 64) || undefined,
    reasonText: safeText(query.reasonText, 140) || '聚合搜索需求可作为选题参考，正文与发布仍需手动确认。',
    templateCode: safeText(query.templateCode, 64) || undefined,
    topicId: safeText(query.topicId, 64) || undefined,
    topicSlug: safeText(query.topicSlug, 96) || undefined,
    returnHref: sameSitePath(query.returnHref ?? query.returnTo),
  }
  return {
    context,
    source: context.source,
    degraded: false,
    canShowSourceHint: true,
    sourceHint: buildEditorSearchGapSourceHint(context),
  }
}

export function buildEditorSearchGapSourceHint(context: EditorSearchGapContext | null | undefined): EditorAssistSourceHint | null {
  if (!context) return null
  return {
    title: `搜索缺口 · ${context.keyword}`,
    detail: `${context.reasonText} 仅作为辅助上下文，不承诺收录、精选、曝光、收益或排名。`,
    returnHref: context.returnHref,
  }
}

const sourceLabels: Record<EditorAssistSource, string> = {
  creator_workbench: '创作者工作台',
  post_detail: '内容详情页',
  series_entry: '系列续写入口',
  topic_candidate: '专题候选入口',
  content_type_template: '内容模板入口',
  collaboration_need: '共建需求',
  manual_publish: '普通发布入口',
}

const actionLabels: Record<EditorAssistAction, string> = {
  update: '更新已有内容',
  reply: '回复公开评论',
  continue: '继续写作',
  series: '补充系列',
  topic: '基于专题或话题开始写',
  template: '套用内容模板',
  fulfill: '创建公开交付',
}

const contextLabels: Record<EditorAssistContextType, string> = {
  post: '内容',
  reply: '评论',
  idea: '选题灵感',
  series: '系列',
  topic: '专题或话题',
  template: '模板',
  need: '共建需求',
}

export function buildEditorAssistSourceHint(context: EditorAssistContext | null | undefined): EditorAssistSourceHint | null {
  if (!context) return null
  if (!context.action || !context.contextType) return null
  const reason = context.reasonText || context.title || context.contextSource
  return {
    title: `${sourceLabels[context.source]} · ${actionLabels[context.action]}`,
    detail: reason
      ? `${contextLabels[context.contextType]}上下文：${reason}`
      : `${contextLabels[context.contextType]}上下文已带入，建议仅作为写作辅助。`,
    returnHref: context.returnHref,
  }
}

export function describeEditorAssistContext(context: EditorAssistContext | null | undefined) {
  return buildEditorAssistSourceHint(context)?.title || ''
}

export function editorAssistContextDetail(context: EditorAssistContext | null | undefined) {
  return buildEditorAssistSourceHint(context)?.detail || ''
}

export function editorAssistSourceLabel(context: EditorAssistContext | null | undefined) {
  return context ? sourceLabels[context.source] : ''
}
