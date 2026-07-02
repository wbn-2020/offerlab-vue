const blockedReasonPatterns = [
  [/AI 精准推荐|精准推荐|智能认为/i, '基于公开内容信号推荐'],
  [/猜你喜欢|你一定喜欢|系统认为你必须看/i, '社区正在讨论'],
  [/根据你的隐私画像|隐私画像|私密互动|浏览记录/i, '基于公共内容信号推荐'],
  [/目标公司|公司偏好|匹配.*公司|目标岗位|岗位偏好|匹配.*岗位/i, '与你关注的主题相关'],
  [/面试|求职|Offer|offer/i, '来自可复用经验'],
] as const

const truthyFlag = (value: unknown) => value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'

const allowsPublicVisibility = (value: unknown) => {
  if (value === undefined || value === null || value === '') return true
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'public' || normalized === 'published'
}

const allowsPublishedStatus = (value: unknown) => {
  if (value === undefined || value === null || value === '') return true
  const normalized = String(value).trim().toLowerCase()
  if (['deleted', 'removed', 'taken_down', 'takedown', 'restricted', 'private', 'draft', 'reviewing', 'hidden'].includes(normalized)) {
    return false
  }
  return normalized === '1' || normalized === 'published' || normalized === 'public' || normalized === 'normal'
}

export const normalizeRecommendationReason = (reason?: string | null) => {
  const text = String(reason || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  for (const [pattern, replacement] of blockedReasonPatterns) {
    if (pattern.test(text)) return replacement
  }
  return text.length > 28 ? `${text.slice(0, 27)}…` : text
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
  if (!allowsPublicVisibility(post.visibility ?? post.postVisibility)) return false
  if (!allowsPublishedStatus(post.postStatus ?? post.publishStatus)) return false
  if (!allowsPublishedStatus(post.status ?? post.moderationStatus)) return false
  return true
}

export const filterVisiblePosts = <T>(items: T[] | undefined | null, limit?: number) => {
  const filtered = (items || []).filter(isPublicPostVisible)
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
