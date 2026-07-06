const patternFromTerms = (terms: string[]) => new RegExp(terms.join('|'), 'i')

const blockedReasonPatterns = [
  [/AI 精准推荐|精准推荐|智能认为/i, '基于公开内容信号推荐'],
  [/猜你喜欢|你一定会喜欢|系统认为你必须看|平台判断你需要/i, '社区正在讨论'],
  [/根据你的隐私画像|隐私画像|私密互动|浏览记录/i, '基于公共内容信号推荐'],
  [patternFromTerms(['\u5e7f\u544a\u6295\u653e', '\u4ed8\u8d39\u4f18\u5148', '\u4ed8\u8d39\u66dd\u5149', '\u4f1a\u5458\u4e13\u5c5e', '\u6536\u76ca\u5206\u6210', '\u63d0\u73b0', '限时购买', '赞助推荐', '付费置顶', '搜索词竞价']), '频道编辑整理'],
  [patternFromTerms(['\u4e13\u5bb6\u5efa\u8bae', '\u6743\u5a01\u63a8\u8350', '\u4e13\u4e1a\u80cc\u4e66', '\u4e13\u4e1a\u5f71\u54cd\u529b', '官方背书', '平台担保', '权威认证']), '同频道近期讨论较多'],
  [/目标公司|公司偏好|匹配.*公司|目标岗位|岗位偏好|匹配.*岗位/i, '与你关注的主题相关'],
  [/面试|求职|Offer|offer/i, '来自可复用经验'],
] as const

const highRiskEndorsementPatterns = patternFromTerms([
  '\u4e13\u5bb6\u5efa\u8bae',
  '\u6743\u5a01\u63a8\u8350',
  '\u4e13\u4e1a\u80cc\u4e66',
  '\u4e13\u4e1a\u5f71\u54cd\u529b',
  '\u6295\u8d44\u5efa\u8bae',
  '\u8bca\u7597\u610f\u89c1',
  '\u6cd5\u5f8b\u610f\u89c1',
  '\u6536\u76ca\u4fdd\u8bc1',
])

const sensitiveSuggestionPatterns = [
  patternFromTerms(['\u5e7f\u544a\u6295\u653e', '\u4ed8\u8d39\u66dd\u5149', '\u4ed8\u8d39\u4f18\u5148', '\u4f1a\u5458\u4e13\u5c5e', '\u6536\u76ca\u5206\u6210', '\u63d0\u73b0', '\u652f\u4ed8\u98ce\u63a7', '限时购买', '赞助推荐', '付费置顶', '搜索词竞价']),
  /隐私画像|私密浏览|私密互动|AI 精准|精准推荐|大模型个性化推荐/i,
  patternFromTerms(['\u4e13\u5bb6\u5efa\u8bae', '\u6743\u5a01\u63a8\u8350', '\u4e13\u4e1a\u80cc\u4e66', '\u4e13\u4e1a\u8ba4\u8bc1', '\u7a33\u8d5a', '\u4fdd\u8bc1\u6536\u76ca', '官方背书', '平台担保', '权威认证']),
  /身份证|手机号|住址|开盒|人肉搜索|曝光个人信息/i,
] as const

const truthyFlag = (value: unknown) => value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
const normalizedText = (value: unknown) => String(value ?? '').trim().toLowerCase()

const allowsPublicVisibility = (value: unknown) => {
  if (value === undefined || value === null || value === '') return true
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'public' || normalized === 'published'
}

const allowsPublishedStatus = (value: unknown) => {
  if (value === undefined || value === null || value === '') return true
  const normalized = normalizedText(value)
  if ([
    '0',
    'deleted',
    'removed',
    'taken_down',
    'takedown',
    'restricted',
    'private',
    'draft',
    'reviewing',
    'pending_review',
    'under_review',
    'audit',
    'auditing',
    'moderating',
    'hidden',
    'illegal',
    'violation',
    'violated',
    'confirmed_violation',
    'rejected',
    'blocked',
  ].includes(normalized)) {
    return false
  }
  return ['1', 'published', 'public', 'normal', 'active', 'completed', 'paused'].includes(normalized)
}

const governanceValues = (item: any) => [
  item?.status,
  item?.postStatus,
  item?.publishStatus,
  item?.moderationStatus,
  item?.reviewStatus,
  item?.governanceStatus,
  item?.riskStatus,
]

export const isReportedForReview = (item: any) => {
  const values = governanceValues(item).map(normalizedText)
  return truthyFlag(item?.reported)
    || truthyFlag(item?.isReported)
    || truthyFlag(item?.hasPendingReport)
    || Number(item?.reportCount || 0) > 0
    || values.some((value) => ['reported', 'pending_report', 'reporting', 'report_pending'].includes(value))
    || [1, '1', 'pending'].includes(item?.reportStatus)
}

export const isConfirmedGovernanceViolation = (item: any) => {
  if (!item || typeof item !== 'object') return false
  if (
    truthyFlag(item.confirmedViolation)
    || truthyFlag(item.governanceViolation)
    || truthyFlag(item.isViolation)
    || truthyFlag(item.illegal)
  ) {
    return true
  }
  return governanceValues(item)
    .map(normalizedText)
    .some((value) => [
      'illegal',
      'violation',
      'violated',
      'confirmed_violation',
      'confirmed-violation',
      'rejected',
      'blocked',
      'removed_by_moderation',
    ].includes(value))
}

export const isReviewingGovernanceContent = (item: any) => (
  governanceValues(item)
    .map(normalizedText)
    .some((value) => ['reviewing', 'pending_review', 'under_review', 'audit', 'auditing', 'moderating'].includes(value))
)

export const isUntreatedHighRiskContent = (item: any) => {
  const risk = normalizedText(item?.riskLevel ?? item?.risk ?? item?.domainRiskLevel)
  if (!['high', 'severe', 'critical', '3', '4'].includes(risk)) return false
  if (
    truthyFlag(item?.riskHandled)
    || truthyFlag(item?.highRiskReviewed)
    || truthyFlag(item?.riskNoticeShown)
    || ['handled', 'approved', 'passed', 'normal'].includes(normalizedText(item?.reviewStatus ?? item?.moderationStatus))
  ) {
    return false
  }
  return true
}

export const normalizeRecommendationReason = (reason?: string | null) => {
  const text = String(reason || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  for (const [pattern, replacement] of blockedReasonPatterns) {
    if (pattern.test(text)) return replacement
  }
  return text.length > 28 ? `${text.slice(0, 27)}…` : text
}

export const neutralizeHighRiskRecommendationReason = (reason?: string | null, item?: any) => {
  const normalized = normalizeRecommendationReason(reason)
  if (!normalized) return ''
  if (!isUntreatedHighRiskContent(item) && !highRiskEndorsementPatterns.test(normalized)) return normalized
  if (/频道编辑整理/.test(normalized)) return '频道编辑整理'
  if (/互动|热度|讨论/.test(normalized)) return '近期社区互动热度较高'
  return '同频道近期讨论较多'
}

export const isPublicPostVisible = (post: any) => {
  if (!post || typeof post !== 'object') return false
  if (
    truthyFlag(post.deleted)
    || truthyFlag(post.isDeleted)
    || truthyFlag(post.restricted)
    || truthyFlag(post.isRestricted)
    || truthyFlag(post.private)
    || truthyFlag(post.hidden)
  ) {
    return false
  }
  if (isConfirmedGovernanceViolation(post)) return false
  if (isReviewingGovernanceContent(post)) return false
  if (isUntreatedHighRiskContent(post)) return false
  if (!allowsPublicVisibility(post.visibility ?? post.postVisibility)) return false
  if (!allowsPublishedStatus(post.postStatus ?? post.publishStatus)) return false
  if (!allowsPublishedStatus(post.status ?? post.moderationStatus)) return false
  return true
}

export const filterVisiblePosts = <T>(items: T[] | undefined | null, limit?: number) => {
  const filtered = (items || []).filter(isPublicPostVisible)
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
}

export const filterDistributionPosts = <T>(items: T[] | undefined | null, limit?: number) => filterVisiblePosts(items, limit)

export const isStrongExposurePostVisible = (post: any) => (
  isPublicPostVisible(post)
  && !isUntreatedHighRiskContent(post)
  && !isConfirmedGovernanceViolation(post)
)

export const filterStrongExposurePosts = <T>(items: T[] | undefined | null, limit?: number) => {
  const filtered = (items || []).filter(isStrongExposurePostVisible)
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
}

export const filterSearchSuggestionTerms = (items: unknown, limit?: number) => {
  const source = Array.isArray(items) ? items : []
  const seen = new Set<string>()
  const filtered = source
    .map((item) => String(item ?? '').replace(/\s+/g, ' ').trim())
    .filter((item) => {
      if (!item || item.length > 40) return false
      if (sensitiveSuggestionPatterns.some((pattern) => pattern.test(item))) return false
      const key = item.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
}

export const isPublicCollectionVisible = (collection: any) => {
  if (!collection || typeof collection !== 'object') return false
  if (
    truthyFlag(collection.deleted)
    || truthyFlag(collection.isDeleted)
    || truthyFlag(collection.restricted)
    || truthyFlag(collection.isRestricted)
    || truthyFlag(collection.private)
    || truthyFlag(collection.hidden)
  ) {
    return false
  }
  if (isConfirmedGovernanceViolation(collection)) return false
  if (isReviewingGovernanceContent(collection)) return false
  if (isUntreatedHighRiskContent(collection)) return false
  if (!allowsPublicVisibility(collection.visibility)) return false
  if (!allowsPublishedStatus(collection.status)) return false
  return true
}

export const filterVisibleCollections = <T>(items: T[] | undefined | null, limit?: number) => {
  const filtered = (items || []).filter(isPublicCollectionVisible)
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
}

export interface ViewerDiscoverySuppressions {
  blockedAuthorIds?: Array<string | number>
  hiddenAuthorIds?: Array<string | number>
  suppressedTopicIds?: Array<string | number>
  suppressedTagIds?: Array<string | number>
  blockedKeywords?: string[]
  negativeFeedbackKeys?: string[]
}

const idSet = (values?: Array<string | number>) => new Set((values || []).map((value) => String(value)))

const textValues = (item: any) => [
  item?.name,
  item?.title,
  item?.summary,
  item?.description,
  item?.content,
  item?.category,
  item?.recommendationReason,
  ...(Array.isArray(item?.recommendationReasons) ? item.recommendationReasons : []),
  ...(Array.isArray(item?.tags) ? item.tags.map((tag: any) => tag?.name ?? tag) : []),
  ...(Array.isArray(item?.topicNames) ? item.topicNames : []),
  ...(Array.isArray(item?.extension?.topicNames) ? item.extension.topicNames : []),
]

const itemAuthorIds = (item: any) => [
  item?.authorId,
  item?.uid,
  item?.userId,
  item?.author?.uid,
  item?.author?.userId,
  item?.author?.id,
  item?.user?.uid,
  item?.user?.userId,
]

const itemTopicIds = (item: any) => [
  item?.topicId,
  item?.topic?.id,
  item?.topic?.topicId,
  ...(Array.isArray(item?.topics) ? item.topics.flatMap((topic: any) => [topic?.id, topic?.topicId]) : []),
]

const itemTagIds = (item: any) => [
  item?.tagId,
  item?.id,
  item?.tag?.id,
  item?.tag?.tagId,
  ...(Array.isArray(item?.tags) ? item.tags.flatMap((tag: any) => [tag?.id, tag?.tagId]) : []),
]

const hasAnyId = (values: unknown[], blocked: Set<string>) => values.some((value) => value != null && blocked.has(String(value)))

export const isBlockedByDiscoverySuppression = (item: any, signals: ViewerDiscoverySuppressions = {}) => {
  if (!item || typeof item !== 'object') return false
  const post = item?.post || item?.item?.post || item
  const blockedAuthors = new Set([...idSet(signals.blockedAuthorIds), ...idSet(signals.hiddenAuthorIds)])
  if (hasAnyId([...itemAuthorIds(item), ...itemAuthorIds(post)], blockedAuthors)) return true
  if (hasAnyId([...itemTopicIds(item), ...itemTopicIds(post)], idSet(signals.suppressedTopicIds))) return true
  if (hasAnyId([...itemTagIds(item), ...itemTagIds(post)], idSet(signals.suppressedTagIds))) return true

  const haystack = textValues(item).concat(textValues(post)).map(normalizedText).filter(Boolean)
  const blockedKeywords = (signals.blockedKeywords || []).map(normalizedText).filter(Boolean)
  if (blockedKeywords.some((keyword) => haystack.some((value) => value.includes(keyword)))) return true

  const feedbackKeys = (signals.negativeFeedbackKeys || []).map(normalizedText).filter(Boolean)
  return feedbackKeys.some((key) => haystack.includes(key))
}

export const filterDiscoverySuppressedItems = <T>(
  items: T[] | undefined | null,
  signals: ViewerDiscoverySuppressions = {},
  limit?: number,
) => {
  const filtered = (items || []).filter((item) => !isBlockedByDiscoverySuppression(item, signals))
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
}

export const HIGH_RISK_CONTENT_WARNINGS = {
  投资理财: '投资理财内容仅供讨论和记录，不构成投资建议，请谨慎参考并自行判断风险。',
  医疗健康: '医疗健康内容不能替代专业诊疗意见，如涉及身体不适请咨询正规医疗机构。',
  情绪心理: '情绪心理内容仅供交流支持，如存在紧急风险请尽快联系专业机构或身边可信赖的人。',
  法律纠纷: '法律纠纷内容不能替代律师意见，具体事项请咨询具备资质的专业人士。',
  未成年人: '涉及未成年人的内容需要格外保护隐私和安全，请避免发布可识别个人的信息。',
  隐私暴露: '请谨慎处理个人隐私、联系方式、地址、证件和聊天记录等敏感信息。',
  人肉搜索: '社区不支持人肉搜索、骚扰或动员攻击，请通过正规渠道处理争议。',
  招聘求职欺诈: '招聘求职信息请核验主体和支付要求，警惕收费内推、虚假岗位和诱导转账。',
} as const

const highRiskKeywords = [
  ['投资理财', /投资|理财|股票|基金|币|收益|回本|荐股|财报|保险/i],
  ['医疗健康', /医疗|健康|诊断|用药|手术|医院|症状|疾病/i],
  ['情绪心理', /抑郁|焦虑|自伤|轻生|心理|情绪崩溃/i],
  ['法律纠纷', /法律|律师|起诉|仲裁|合同|侵权|赔偿/i],
  ['未成年人', /未成年|学生隐私|儿童|校园欺凌/i],
  ['隐私暴露', /身份证|手机号|住址|聊天记录|隐私|开盒/i],
  ['人肉搜索', /人肉|开盒|曝光个人信息|网暴/i],
  ['招聘求职欺诈', /内推收费|付费内推|保证 offer|保证Offer|刷简历|转账入职/i],
] as const

export const findHighRiskContentWarning = (text?: string | null) => {
  const value = String(text || '').trim()
  if (!value) return ''
  const hit = highRiskKeywords.find(([, pattern]) => pattern.test(value))
  return hit ? HIGH_RISK_CONTENT_WARNINGS[hit[0]] : ''
}
