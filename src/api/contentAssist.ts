import client, { type Result, getErrorMessage } from './client'
import type {
  ApiId,
  ContentAssistQualityMetric,
  ContentAssistResult,
  ContentAssistSeriesHint,
  ContentAssistSuggestion,
} from './types'
import { DOMAIN, getDomainLabel, normalizeDomain } from '@/utils/domains'
import { sanitizeVisibleText } from '@/utils/textQuality'

export interface ContentAssistRequest {
  title: string
  content: string
  postType: number
  domain: number
  tags: string[]
  extension?: Record<string, unknown>
  seriesId?: ApiId
  aiEnabled?: boolean
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const firstReadableLine = (value: string) => {
  const lines = value
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\r?\n+/)
    .map((line) => line.replace(/[#>*`_()[\]-]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 8)
  return lines[0] || ''
}

const safeText = (value: unknown) => sanitizeVisibleText(value) || ''

const summarizeContent = (req: ContentAssistRequest) => {
  const firstLine = firstReadableLine(req.content)
  if (firstLine) return firstLine.length > 88 ? `${firstLine.slice(0, 88)}...` : firstLine
  const title = safeText(req.title)
  if (title) return `围绕“${title.slice(0, 32)}”补充背景、过程、结果和可复用建议。`
  return `补一段 ${getDomainLabel(req.domain)} 领域的真实实践背景，助手会继续完善摘要建议。`
}

const qualityMetricsOf = (req: ContentAssistRequest): ContentAssistQualityMetric[] => {
  const titleLength = safeText(req.title).length
  const contentLength = safeText(req.content).length
  const tagCount = req.tags.filter(Boolean).length
  const titleScore = clampScore(titleLength >= 10 ? 100 : titleLength * 8)
  const contentScore = clampScore(Math.min(100, (contentLength / 18) * 10))
  const structureScore = clampScore(
    ['背景', '问题', '方案', '结果', '复盘', '总结', '步骤', '收益']
      .filter((keyword) => req.content.includes(keyword)).length * 22,
  )
  const tagScore = clampScore(tagCount >= 4 ? 100 : tagCount * 25)
  return [
    { label: '标题清晰度', score: titleScore, detail: '标题是否能快速说明主题、场景和结果。' },
    { label: '正文完整度', score: contentScore, detail: '正文是否具备足够上下文，便于他人复用。' },
    { label: '结构完整度', score: structureScore, detail: '是否写清背景、问题、方案、结果等关键段落。' },
    { label: '标签覆盖度', score: tagScore, detail: '标签是否足够支撑搜索、推荐和系列归档。' },
  ]
}

const qualitySummaryOf = (metrics: ContentAssistQualityMetric[]) => {
  const score = clampScore(metrics.reduce((sum, item) => sum + item.score, 0) / Math.max(metrics.length, 1))
  if (score >= 85) return { score, label: '可直接发布', reason: '核心信息比较完整，适合进入发布与系列归档。' }
  if (score >= 65) return { score, label: '再补一轮', reason: '主体已经成型，再补标签或结构化段落会更稳。' }
  return { score, label: '建议补充', reason: '建议先完善背景、过程和结论，再进入发布。' }
}

const qualityLevelLabel = (value: unknown) => {
  switch (safeText(value).toUpperCase()) {
    case 'EXCELLENT':
      return '可直接发布'
    case 'GOOD':
      return '再补一轮'
    case 'FAIR':
      return '继续补充'
    case 'NEEDS_WORK':
      return '建议补充'
    default:
      return ''
  }
}

const qualityDimensionLabel = (value: unknown) => {
  switch (safeText(value).toLowerCase()) {
    case 'title':
      return '标题清晰度'
    case 'content':
      return '正文完整度'
    case 'structure':
      return '结构完整度'
    case 'tags':
      return '标签覆盖度'
    case 'domain':
      return '领域归属度'
    default:
      return safeText(value) || '质量项'
  }
}

const assistErrorReason = (value: unknown) => {
  const code = safeText(value).toUpperCase()
  if (!code) return ''
  if (code === 'AI_INVALID_RESPONSE') return 'AI 返回格式异常，当前已切换为规则建议。'
  if (code.includes('TIMEOUT')) return 'AI 响应超时，当前已切换为规则建议。'
  if (code.includes('RATE_LIMIT') || code.includes('TOO_MANY_REQUESTS')) return 'AI 请求已限流，当前已切换为规则建议。'
  return `AI 返回 ${code}，当前已切换为规则建议。`
}

const uniqueActionItems = (items: Array<unknown>) => {
  const seen = new Set<string>()
  return items
    .map((item) => safeText(item))
    .filter((item) => {
      const key = item.trim()
      if (!key) return false
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const suggestion = (id: string, label: string, detail: string, reason: string, confidence = 0.7): ContentAssistSuggestion => ({
  id,
  label,
  detail,
  reason,
  confidence,
})

const uniqueSuggestions = (items: ContentAssistSuggestion[], selected: string[]) => {
  const taken = new Set(selected.map((item) => item.trim().toLowerCase()).filter(Boolean))
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.label.trim().toLowerCase()
    if (!key || taken.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const tagSuggestionsOf = (req: ContentAssistRequest) => {
  const suggestions: ContentAssistSuggestion[] = []
  const text = `${req.title}\n${req.content}`.toLowerCase()

  const keywordRules: Array<[RegExp, string, string]> = [
    [/redis|缓存/, 'Redis', '正文涉及缓存、热点数据或会话治理。'],
    [/mysql|sql|索引|事务/, 'MySQL', '内容提到了数据库、索引或事务处理。'],
    [/kafka|mq|消息/, '消息队列', '适合标注异步链路或消息治理主题。'],
    [/docker|容器|k8s|kubernetes/, '容器化', '正文涉及部署、容器化或集群编排。'],
    [/spring|spring boot|springboot/, 'Spring Boot', '适合补齐 Java 服务端技术栈标签。'],
    [/vue|vite|前端/, 'Vue', '内容涉及 Vue 或前端工程实践。'],
    [/排查|故障|告警|线上/, '稳定性治理', '适合沉淀故障排查与稳定性治理经验。'],
    [/面试|offer|求职/, '面试复盘', '内容与求职/面试经验直接相关。'],
    [/读书|书单|阅读/, '读书笔记', '内容适合沉淀为阅读或方法论笔记。'],
  ]

  keywordRules.forEach(([pattern, label, detail], index) => {
    if (pattern.test(text)) {
      suggestions.push(suggestion(`tag-keyword-${index}`, label, detail, '由标题和正文关键词推断', 0.82))
    }
  })

  const domainSeeds: Record<number, Array<[string, string]>> = {
    [DOMAIN.TECH]: [['技术复盘', '适合承接技术经验和方案总结。'], ['实践总结', '方便归并同主题实战内容。']],
    [DOMAIN.CAREER]: [['求职经验', '突出投递、面试和 offer 经验。'], ['职场成长', '适合沟通、协作和成长型内容。']],
    [DOMAIN.READING]: [['阅读方法', '适合提炼读书方法和知识吸收路径。'], ['方法论摘记', '便于和书单、笔记内容串联。']],
    [DOMAIN.LIFESTYLE]: [['生活实践', '适合记录长期实践或兴趣项目。'], ['兴趣沉淀', '便于归并持续更新的生活系列。']],
    [DOMAIN.INVESTMENT]: [['风险复盘', '帮助区分复盘内容与观点表达。'], ['资产配置', '适合围绕策略和配置思路建立检索入口。']],
  }

  ;(domainSeeds[normalizeDomain(req.domain)] || []).forEach(([label, detail], index) => {
    suggestions.push(suggestion(`tag-domain-${index}`, label, detail, `来自 ${getDomainLabel(req.domain)} 领域默认补全`, 0.68))
  })

  return uniqueSuggestions(suggestions, req.tags).slice(0, 6)
}

const topicSuggestionsOf = (req: ContentAssistRequest) => {
  const text = `${req.title}\n${req.content}`
  const suggestions: ContentAssistSuggestion[] = []
  const rules: Array<[RegExp, string, string]> = [
    [/复盘|总结/, '复盘方法论', '适合聚合持续输出的复盘类内容。'],
    [/架构|系统设计/, '系统设计复盘', '适合架构、容量和系统设计主题。'],
    [/故障|排查|告警/, '稳定性与故障排查', '适合线上问题、告警和排查流程沉淀。'],
    [/面试|offer/, '面试实战', '适合求职、面试和谈薪经验。'],
    [/阅读|书单|读书/, '阅读与知识吸收', '适合阅读总结和书单延展。'],
  ]
  rules.forEach(([pattern, label, detail], index) => {
    if (pattern.test(text)) {
      suggestions.push(suggestion(`topic-rule-${index}`, label, detail, '由正文关键词推断', 0.78))
    }
  })
  if (normalizeDomain(req.domain) === DOMAIN.TECH) {
    suggestions.push(suggestion('topic-tech', '工程实践周记', '适合持续沉淀迭代中的实践记录。', '来自技术领域默认推荐', 0.62))
  }
  if (normalizeDomain(req.domain) === DOMAIN.READING) {
    suggestions.push(suggestion('topic-reading', '阅读清单共读', '适合串联多篇书单、摘记和方法论内容。', '来自阅读领域默认推荐', 0.64))
  }
  return uniqueSuggestions(suggestions, []).slice(0, 4)
}

const seriesHintsOf = (req: ContentAssistRequest, tagSuggestions: ContentAssistSuggestion[]): ContentAssistSeriesHint[] => {
  const domainLabel = getDomainLabel(req.domain)
  const primaryTag = req.tags[0] || tagSuggestions[0]?.label || domainLabel
  return [
    {
      id: req.seriesId,
      title: `${primaryTag} 连载`,
      progressText: '适合把同主题经验持续归档成系列。',
    },
    {
      title: `${domainLabel} 实践复盘`,
      progressText: '适合季度复盘、周报式输出或专题合集。',
    },
  ]
}

const actionItemsOf = (req: ContentAssistRequest, metrics: ContentAssistQualityMetric[]) => {
  const actions: string[] = []
  if (metrics[0]?.score < 70) actions.push('把标题改成“场景 + 问题/动作 + 结果”的结构，减少泛标题。')
  if (metrics[1]?.score < 70) actions.push('补 1 到 2 段背景、关键步骤和结果数据，方便他人快速理解。')
  if (metrics[2]?.score < 60) actions.push('正文建议至少补齐“背景 / 问题 / 方案 / 结果”中的 3 项。')
  if (metrics[3]?.score < 75) actions.push('再补 1 到 3 个能代表技术栈或主题的标签。')
  if (normalizeDomain(req.domain) === DOMAIN.INVESTMENT) {
    actions.push('投资理财领域建议补充风险边界和非建议声明，降低误解风险。')
  }
  return actions.slice(0, 4)
}

const buildDisabledAssist = (req: ContentAssistRequest): ContentAssistResult => {
  const metrics = qualityMetricsOf(req)
  const quality = qualitySummaryOf(metrics)
  return {
    status: 'disabled',
    source: 'fallback',
    summary: 'AI 已关闭，当前仅保留本地规则检查与手动发布流程。',
    qualityScore: quality.score,
    qualityLabel: quality.label,
    qualityReason: quality.reason,
    qualityMetrics: metrics,
    actionItems: ['重新开启 AI 后，可恢复摘要、标签、话题和系列建议。'],
    tagSuggestions: [],
    topicSuggestions: [],
    seriesHints: [],
  }
}

const buildFailedAssist = (message: string): ContentAssistResult => ({
  status: 'failed',
  source: 'fallback',
  summary: '',
  qualityScore: 0,
  qualityLabel: '建议暂不可用',
  qualityReason: message,
  qualityMetrics: [],
  actionItems: ['你仍然可以依赖现有发布检查和草稿保护继续写作。'],
  tagSuggestions: [],
  topicSuggestions: [],
  seriesHints: [],
  fallbackReason: message,
})

const buildFallbackAssist = (req: ContentAssistRequest, fallbackReason = ''): ContentAssistResult => {
  const metrics = qualityMetricsOf(req)
  const quality = qualitySummaryOf(metrics)
  const tags = tagSuggestionsOf(req)
  const topics = topicSuggestionsOf(req)
  return {
    status: 'degraded',
    source: 'fallback',
    summary: summarizeContent(req),
    qualityScore: quality.score,
    qualityLabel: quality.label,
    qualityReason: quality.reason,
    qualityMetrics: metrics,
    actionItems: actionItemsOf(req, metrics),
    tagSuggestions: tags,
    topicSuggestions: topics,
    seriesHints: seriesHintsOf(req, tags),
    fallbackReason: fallbackReason || '内容助手接口暂不可用，已切换为本地规则建议。',
  }
}

const buildWritingCmd = (req: ContentAssistRequest) => ({
  domain: normalizeDomain(req.domain),
  postType: Number(req.postType),
  title: safeText(req.title) || undefined,
  content: safeText(req.content),
  tagNames: req.tags.map((item) => safeText(item)).filter(Boolean).slice(0, 8),
})

const buildQualityCmd = (req: ContentAssistRequest) => ({
  domain: normalizeDomain(req.domain),
  postType: Number(req.postType),
  title: safeText(req.title) || undefined,
  content: safeText(req.content),
  tagNames: req.tags.map((item) => safeText(item)).filter(Boolean).slice(0, 8),
})

const buildTagTopicCmd = (req: ContentAssistRequest) => ({
  domain: normalizeDomain(req.domain),
  title: safeText(req.title) || undefined,
  content: safeText(req.content),
})

const adaptSuggestionList = (value: unknown, prefix: string): ContentAssistSuggestion[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((raw, index) => {
      const label = safeText((raw as any)?.label ?? (raw as any)?.name ?? (raw as any)?.title ?? raw)
      if (!label) return null
      return suggestion(
        safeText((raw as any)?.id) || `${prefix}-${index}`,
        label,
        safeText((raw as any)?.detail),
        safeText((raw as any)?.reason) || '来自远端助手建议',
        Number((raw as any)?.confidence ?? 0.72),
      )
    })
    .filter((item): item is ContentAssistSuggestion => Boolean(item))
}

const adaptSeriesHints = (value: unknown): ContentAssistSeriesHint[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    const title = safeText((raw as any)?.title ?? raw)
    if (!title) return []
    const rawId = (raw as any)?.id
    const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : undefined
    return [{
      id,
      title,
      progressText: safeText((raw as any)?.progressText),
    }]
  })
}

const adaptQualityMetrics = (value: unknown, req: ContentAssistRequest): ContentAssistQualityMetric[] => {
  if (!Array.isArray(value)) return qualityMetricsOf(req)
  const metrics = value
    .map((item: any) => ({
      label: qualityDimensionLabel(item?.dimension ?? item?.label),
      score: clampScore(Number(item?.score ?? 0)),
      detail: safeText(item?.reason ?? item?.detail) || '来自远端质量判断。',
    }))
    .filter((item) => item.label)
  return metrics.length ? metrics : qualityMetricsOf(req)
}

const mergeRemoteAssist = (
  req: ContentAssistRequest,
  payload: {
    writing?: any
    quality?: any
    tagTopic?: any
    requestFailed?: boolean
    fallbackReason?: string
  },
): ContentAssistResult => {
  const metrics = adaptQualityMetrics(payload.quality?.explanations, req)
  const defaultQuality = qualitySummaryOf(metrics)
  const remoteTagSuggestions = uniqueSuggestions(adaptSuggestionList(payload.tagTopic?.tags, 'remote-tag'), req.tags).slice(0, 6)
  const remoteTopicSuggestions = adaptSuggestionList(payload.tagTopic?.topics, 'remote-topic').slice(0, 4)
  const tagSuggestions = remoteTagSuggestions.length ? remoteTagSuggestions : tagSuggestionsOf(req)
  const topicSuggestions = remoteTopicSuggestions.length ? remoteTopicSuggestions : topicSuggestionsOf(req)
  const actionItems = uniqueActionItems([
    ...(Array.isArray(payload.writing?.suggestions) ? payload.writing.suggestions : []),
    ...(Array.isArray(payload.quality?.suggestions) ? payload.quality.suggestions : []),
    ...actionItemsOf(req, metrics),
  ]).slice(0, 6)
  const fallbackReason = payload.fallbackReason
    || assistErrorReason(payload.quality?.errorCode)
    || assistErrorReason(payload.writing?.errorCode)
    || (payload.requestFailed ? '部分接口暂不可用，当前已混合使用规则建议。' : '')
    || (
      [payload.writing?.provider, payload.quality?.provider]
        .map((item) => safeText(item).toLowerCase())
        .filter(Boolean)
        .every((item) => item === 'rules')
        ? 'AI 默认关闭或未配置，当前展示规则建议。'
        : ''
    )
  const degraded = Boolean(
    payload.requestFailed
    || payload.writing?.fallbackUsed
    || payload.quality?.fallbackUsed
    || [payload.writing?.provider, payload.quality?.provider]
      .map((item) => safeText(item).toLowerCase())
      .filter(Boolean)
      .every((item) => item === 'rules'),
  )
  return {
    status: degraded ? 'degraded' : 'ready',
    source: 'remote',
    summary: safeText(payload.writing?.summary) || summarizeContent(req),
    qualityScore: clampScore(Number(payload.quality?.score ?? defaultQuality.score)),
    qualityLabel: qualityLevelLabel(payload.quality?.level) || defaultQuality.label,
    qualityReason: safeText(payload.quality?.summary) || defaultQuality.reason,
    qualityMetrics: metrics,
    actionItems: actionItems.length ? actionItems : actionItemsOf(req, metrics),
    tagSuggestions,
    topicSuggestions,
    seriesHints: seriesHintsOf(req, tagSuggestions),
    fallbackReason: fallbackReason || undefined,
  }
}

export const contentAssistApi = {
  getEditorAssist: async (req: ContentAssistRequest): Promise<Result<ContentAssistResult>> => {
    if (req.aiEnabled === false) {
      return {
        code: 0,
        message: 'AI disabled',
        data: buildDisabledAssist(req),
      }
    }
    if (!safeText(req.content)) {
      return {
        code: 0,
        message: 'fallback',
        data: buildFallbackAssist(req, '补充至少一段正文后，再尝试远端建议。'),
      }
    }

    try {
      const [writingRes, qualityRes, tagTopicRes] = await Promise.allSettled([
        client.post('/api/v1/content-assist/writing', buildWritingCmd(req), { skipAuthRedirect: true }) as Promise<Result<any>>,
        client.post('/api/v1/content-assist/quality-score', buildQualityCmd(req), { skipAuthRedirect: true }) as Promise<Result<any>>,
        client.post('/api/v1/content-assist/tag-topic-suggestions', buildTagTopicCmd(req), { skipAuthRedirect: true }) as Promise<Result<any>>,
      ])
      const fulfilled = [writingRes, qualityRes, tagTopicRes]
        .filter((item): item is PromiseFulfilledResult<Result<any>> => item.status === 'fulfilled')
      if (!fulfilled.length) {
        throw new Error('content assist endpoints unavailable')
      }
      const rejectedMessages = [writingRes, qualityRes, tagTopicRes]
        .filter((item): item is PromiseRejectedResult => item.status === 'rejected')
        .map((item) => getErrorMessage(item.reason, ''))
        .filter(Boolean)
      const base = fulfilled[0].value
      return {
        ...base,
        data: mergeRemoteAssist(req, {
          writing: writingRes.status === 'fulfilled' ? writingRes.value.data : undefined,
          quality: qualityRes.status === 'fulfilled' ? qualityRes.value.data : undefined,
          tagTopic: tagTopicRes.status === 'fulfilled' ? tagTopicRes.value.data : undefined,
          requestFailed: rejectedMessages.length > 0,
          fallbackReason: rejectedMessages[0],
        }),
      }
    } catch (error) {
      try {
        return {
          code: 0,
          message: 'fallback',
          data: buildFallbackAssist(req, getErrorMessage(error, '内容助手暂时不可用，已切换到规则降级模式。')),
        }
      } catch (fallbackError) {
        return {
          code: 0,
          message: 'failed',
          data: buildFailedAssist(getErrorMessage(fallbackError, '建议暂时不可用，请稍后再试。')),
        }
      }
    }
  },
}
