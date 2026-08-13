import type { ExpertCertificationApplication, ExpertCertificationCheckItem, ExpertCertificationEligibility } from '@/api/types'

export const certificationStatusText = (status?: number) => {
  switch (Number(status)) {
    case 10:
      return '审核中'
    case 20:
      return '已通过'
    case 30:
      return '未通过'
    case 40:
      return '已撤回'
    default:
      return '处理中'
  }
}

export const certificationStatusTone = (status?: number) => {
  switch (Number(status)) {
    case 20:
      return 'status-pass'
    case 30:
      return 'status-reject'
    case 40:
      return 'status-revoke'
    default:
      return 'status-pending'
  }
}

export const safeCertificationExplanation = (eligibility?: ExpertCertificationEligibility | null) => {
  if (!eligibility) return ''
  if (eligibility.eligible) {
    return '你已满足当前领域认证作者的基础申请条件，提交后仍会进入人工审核。'
  }
  return '继续积累同领域公开内容和近期更新后，可以再提交认证作者申请。'
}

export const safeCertificationRiskWarning = (value?: string) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return '该领域内容仅用于社区经验交流，不构成投资、理财、法律、健康或其他专业建议；认证不代表平台对每条内容背书。'
}

export const safeCertificationCheck = (check: ExpertCertificationCheckItem) => {
  if (check.code === 'published_posts') {
    const current = Math.max(0, Number(check.current) || 0)
    const required = Math.max(1, Number(check.required) || 3)
    return {
      label: '同领域公开内容',
      detail: `当前 ${current}/${required}，需要至少 ${required} 篇同领域公开内容。`,
    }
  }
  if (check.code === 'recent_activity') {
    return {
      label: '近期活跃',
      detail: check.passed ? '90 天内有公开更新。' : '需要在 90 天内保持至少一次公开更新。',
    }
  }
  return {
    label: '人工审核条件',
    detail: check.passed ? '该项已满足。' : '该项还需要继续补充。',
  }
}

export const safeCertificationSummary = (item: ExpertCertificationApplication) => {
  if (item.eligibilitySummary) return item.eligibilityPassed ? '提交时已通过基础资格检查。' : '提交时仍有基础条件需要补充。'
  return item.eligibilityPassed ? '资格通过' : '资格待补充'
}

export const safeCertificationSubmitError = () => '认证作者申请暂时无法提交，请稍后重试或继续补充公开内容。'
