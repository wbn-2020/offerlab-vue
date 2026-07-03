import { BizException } from '@/api/client'

export const GOVERNANCE_RISK_NOTICE = '内容仅供经验交流，不构成专业建议'

export const REPORT_REASON_OPTIONS = [
  { value: 'SPAM', label: '垃圾广告' },
  { value: 'ABUSE', label: '骚扰辱骂' },
  { value: 'ILLEGAL', label: '违法违规' },
  { value: 'MISLEADING', label: '虚假误导' },
  { value: 'RIGHTS', label: '侵犯权益' },
  { value: 'RISK', label: '风险内容' },
  { value: 'OTHER', label: '其他问题' },
]

export interface GovernanceFeedback {
  tone: 'success' | 'warning' | 'error'
  title: string
  message: string
}

export const reportSuccessFeedback: GovernanceFeedback = {
  tone: 'success',
  title: '已提交',
  message: '感谢反馈，我们会根据社区规则处理。',
}

const errorCodeOf = (error: unknown) => {
  if (error instanceof BizException) return error.code
  const status = (error as any)?.response?.status
  return typeof status === 'number' ? status : undefined
}

export const mapReportErrorToFeedback = (error: unknown): GovernanceFeedback => {
  const code = errorCodeOf(error)
  if (code === 30001) {
    return {
      tone: 'warning',
      title: '已收到',
      message: '你已经提交过，正在处理中。',
    }
  }
  if (code === 10429 || code === 429) {
    return {
      tone: 'warning',
      title: '提交太频繁',
      message: '提交太频繁，请稍后再试。',
    }
  }
  if (code === 10403 || code === 403 || code === 10404 || code === 404 || code === 410 || code === 30202 || code === 30301) {
    return {
      tone: 'warning',
      title: '内容状态已变化',
      message: '内容状态已变化，无需重复举报。',
    }
  }
  return {
    tone: 'error',
    title: '提交失败',
    message: '提交失败，请稍后再试。',
  }
}

export const normalizeRiskNoticeForUsers = (notice?: string | null) => (
  notice && notice.trim() ? GOVERNANCE_RISK_NOTICE : ''
)

export const getUnavailableContentCopy = (code?: number | string | null) => {
  const normalized = String(code ?? '').toLowerCase()
  if (normalized === '10403' || normalized === '403' || normalized === 'forbidden') {
    return {
      title: '内容暂不可见',
      description: '当前账号暂时无法查看这段内容。',
    }
  }
  return {
    title: '内容暂不可见',
    description: '内容状态已变化，可能已删除、下架或暂时受限。',
  }
}

export const getPostUnavailableState = (post?: {
  deleted?: boolean
  restricted?: boolean
  visibility?: number | string
  postStatus?: number | string
  status?: number | string
  moderationStatus?: number | string
} | null) => {
  if (!post) return null
  const statusValues = [
    post.visibility,
    post.postStatus,
    post.status,
    post.moderationStatus,
  ].map((value) => String(value ?? '').toLowerCase())

  if (post.deleted || statusValues.some((value) => ['deleted', 'removed', 'offline', 'hidden', 'restricted', 'blocked'].includes(value)) || post.restricted) {
    return getUnavailableContentCopy()
  }

  return null
}
