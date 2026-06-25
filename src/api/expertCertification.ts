import client, { type Result } from './client'
import { adaptId, adaptTime } from './adapters'
import type {
  ApiId,
  ExpertCertificationApplication,
  ExpertCertificationApplyPayload,
  ExpertCertificationCheckItem,
  ExpertCertificationEligibility,
} from './types'

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const toStringList = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((item) => safeText(item)).filter(Boolean)
    : []
)

const adaptCheckItem = (raw: any): ExpertCertificationCheckItem => ({
  code: safeText(raw?.code),
  label: safeText(raw?.label),
  passed: Boolean(raw?.passed),
  detail: safeText(raw?.detail),
})

const adaptEligibility = (raw: any): ExpertCertificationEligibility => ({
  domain: toNumber(raw?.domain),
  domainName: safeText(raw?.domainName),
  eligible: Boolean(raw?.eligible),
  riskAcknowledgementRequired: Boolean(raw?.riskAcknowledgementRequired),
  manualReviewOnly: raw?.manualReviewOnly == null ? true : Boolean(raw.manualReviewOnly),
  riskWarning: safeText(raw?.riskWarning),
  explanation: safeText(raw?.explanation),
  checks: Array.isArray(raw?.checks) ? raw.checks.map(adaptCheckItem) : [],
})

const adaptApplication = (raw: any): ExpertCertificationApplication => ({
  id: adaptId(raw?.id),
  applicantUid: raw?.applicantUid == null ? undefined : adaptId(raw.applicantUid),
  domain: toNumber(raw?.domain),
  domainName: safeText(raw?.domainName),
  status: toNumber(raw?.status),
  statusLabel: safeText(raw?.statusLabel),
  evidenceSummary: safeText(raw?.evidenceSummary),
  evidenceLinks: toStringList(raw?.evidenceLinks),
  eligibilityPassed: Boolean(raw?.eligibilityPassed),
  eligibilitySummary: safeText(raw?.eligibilitySummary),
  riskAcknowledged: Boolean(raw?.riskAcknowledged),
  riskWarning: safeText(raw?.riskWarning),
  reviewerUid: raw?.reviewerUid == null ? undefined : adaptId(raw.reviewerUid),
  reviewNote: safeText(raw?.reviewNote),
  revokedBy: raw?.revokedBy == null ? undefined : adaptId(raw.revokedBy),
  revokeNote: safeText(raw?.revokeNote),
  autoCertified: Boolean(raw?.autoCertified),
  createTime: adaptTime(raw?.createTime ?? raw?.createdAt),
  updateTime: adaptTime(raw?.updateTime ?? raw?.updatedAt),
  reviewTime: raw?.reviewTime ? adaptTime(raw.reviewTime) : undefined,
  revokedTime: raw?.revokedTime ? adaptTime(raw.revokedTime) : undefined,
})

export const expertCertificationApi = {
  getEligibility: async (domain: number): Promise<Result<ExpertCertificationEligibility>> => {
    const res = await client.get('/api/v1/expert-certifications/eligibility', {
      params: { domain },
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptEligibility(res.data) : null,
    }
  },

  listMine: async (domain?: number): Promise<Result<ExpertCertificationApplication[]>> => {
    const res = await client.get('/api/v1/expert-certifications/applications/me', {
      params: { domain },
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: Array.isArray(res.data) ? res.data.map(adaptApplication) : [],
    }
  },

  apply: async (payload: ExpertCertificationApplyPayload): Promise<Result<ExpertCertificationApplication>> => {
    const res = await client.post('/api/v1/expert-certifications/applications', payload, {
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptApplication(res.data) : null,
    }
  },

  revoke: async (applicationId: ApiId, note?: string): Promise<Result<ExpertCertificationApplication>> => {
    const res = await client.post(`/api/v1/expert-certifications/applications/${applicationId}/revoke`, {
      note: safeText(note),
    }, {
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptApplication(res.data) : null,
    }
  },
}
