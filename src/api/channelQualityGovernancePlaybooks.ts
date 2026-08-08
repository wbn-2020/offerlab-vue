import client, { type Result, withRemoteResultProvenance } from './client'

const BASE = '/api/v1/community-health'
const HASH = /^sha256:[0-9a-f]{64}$/
const VERSION_STATUS = new Set(['DRAFT', 'PUBLISHED', 'RETIRED'])
const BINDING_STATUS = new Set(['PROPOSED', 'ACCEPTED', 'COMPLETED', 'WAIVED'])
const APPLICABILITY = new Set(['MATCHED', 'PARTIAL', 'NOT_MATCHED', 'INSUFFICIENT_CONTEXT'])

export type PlaybookVersionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED'
export type CasePlaybookStatus = 'PROPOSED' | 'ACCEPTED' | 'COMPLETED' | 'WAIVED'

export interface PlaybookVersion {
  id: string
  playbookId: string
  versionNo: number
  status: PlaybookVersionStatus
  contentSummary: string
  canonicalContentJson: string
  contentHash: string
  publishedAt?: string
  retiredAt?: string
}

export interface GovernancePlaybook {
  id: string
  playbookCode: string
  latestVersionNo: number
  playbookVersion: number
  versions: PlaybookVersion[]
  canCreateVersion: boolean
  canPublish: boolean
  canRetire: boolean
}

export interface CasePlaybookCheck {
  id: string
  checkKey: string
  title: string
  instruction: string
  evidenceRequirement: 'NONE' | 'REFERENCE_REQUIRED'
  state: 'PENDING' | 'PASSED' | 'WAIVED'
  checkVersion: number
}

export interface CasePlaybook {
  id: string
  caseId: string
  playbookId: string
  playbookVersionId: string
  sourceContentHash: string
  snapshotHash: string
  bindingStatus: CasePlaybookStatus
  bindingVersion: number
  checks: CasePlaybookCheck[]
  canAccept: boolean
  canVerifyCheck: boolean
  canWaiveCheck: boolean
  canComplete: boolean
  canWaive: boolean
}

export class ChannelQualityGovernancePlaybookContractError extends Error {
  constructor() {
    super('Invalid V44 playbook response')
    this.name = 'ChannelQualityGovernancePlaybookContractError'
  }
}

const asId = (value: unknown): string | null => {
  const text = String(value ?? '').trim()
  return /^[1-9]\d{0,18}$/.test(text) ? text : null
}
const asVersion = (value: unknown): number | null => (
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
)
const asText = (value: unknown, min = 1, max = 500): string | null => (
  typeof value === 'string' && value.trim().length >= min && value.trim().length <= max ? value.trim() : null
)
const asObject = (value: unknown): Record<string, unknown> | null => (
  value != null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
)
const requireRemote = <T>(raw: Result<unknown>, adapt: (value: unknown) => T): Result<T> => {
  const result = withRemoteResultProvenance(raw)
  if (result.source !== 'remote' || result.degraded || result.data == null) {
    throw new ChannelQualityGovernancePlaybookContractError()
  }
  return { ...result, data: adapt(result.data) }
}

const adaptVersion = (value: unknown): PlaybookVersion => {
  const item = asObject(value)
  const id = asId(item?.id)
  const playbookId = asId(item?.playbookId)
  const versionNo = asVersion(item?.versionNo)
  const status = asText(item?.status, 1, 16)
  const summary = asText(item?.contentSummary, 2, 500)
  const content = asText(item?.canonicalContentJson, 2, 65536)
  const hash = asText(item?.contentHash, 71, 71)
  if (!item || !id || !playbookId || versionNo == null || !status || !VERSION_STATUS.has(status)
    || !summary || !content || !hash || !HASH.test(hash)) {
    throw new ChannelQualityGovernancePlaybookContractError()
  }
  return { id, playbookId, versionNo, status: status as PlaybookVersionStatus, contentSummary: summary,
    canonicalContentJson: content, contentHash: hash,
    ...(typeof item.publishedAt === 'string' ? { publishedAt: item.publishedAt } : {}),
    ...(typeof item.retiredAt === 'string' ? { retiredAt: item.retiredAt } : {}) }
}

const adaptPlaybook = (value: unknown): GovernancePlaybook => {
  const item = asObject(value)
  const id = asId(item?.id)
  const code = asText(item?.playbookCode, 2, 80)
  const latest = asVersion(item?.latestVersionNo)
  const version = asVersion(item?.playbookVersion)
  if (!item || !id || !code || latest == null || version == null || !Array.isArray(item.versions)
    || typeof item.canCreateVersion !== 'boolean' || typeof item.canPublish !== 'boolean'
    || typeof item.canRetire !== 'boolean') {
    throw new ChannelQualityGovernancePlaybookContractError()
  }
  return { id, playbookCode: code, latestVersionNo: latest, playbookVersion: version,
    versions: item.versions.map(adaptVersion), canCreateVersion: item.canCreateVersion,
    canPublish: item.canPublish, canRetire: item.canRetire }
}

const adaptCasePlaybook = (value: unknown): CasePlaybook => {
  const item = asObject(value)
  const id = asId(item?.id)
  const caseId = asId(item?.caseId)
  const playbookId = asId(item?.playbookId)
  const playbookVersionId = asId(item?.playbookVersionId)
  const sourceContentHash = asText(item?.sourceContentHash, 71, 71)
  const snapshotHash = asText(item?.snapshotHash, 71, 71)
  const status = asText(item?.bindingStatus, 1, 16)
  const bindingVersion = asVersion(item?.bindingVersion)
  if (!item || !id || !caseId || !playbookId || !playbookVersionId || !sourceContentHash || !snapshotHash
    || !HASH.test(sourceContentHash) || !HASH.test(snapshotHash) || !status || !BINDING_STATUS.has(status)
    || bindingVersion == null || !Array.isArray(item.checks)
    || ['canAccept', 'canVerifyCheck', 'canWaiveCheck', 'canComplete', 'canWaive'].some((key) => typeof item[key] !== 'boolean')) {
    throw new ChannelQualityGovernancePlaybookContractError()
  }
  const checks = item.checks.map((check): CasePlaybookCheck => {
    const row = asObject(check)
    const checkId = asId(row?.id)
    const key = asText(row?.checkKey, 2, 80)
    const title = asText(row?.title, 2, 200)
    const instruction = asText(row?.instruction, 2, 500)
    const requirement = asText(row?.evidenceRequirement, 1, 32)
    const state = asText(row?.state, 1, 16)
    const checkVersion = asVersion(row?.checkVersion)
    if (!checkId || !key || !title || !instruction || !['NONE', 'REFERENCE_REQUIRED'].includes(requirement ?? '')
      || !['PENDING', 'PASSED', 'WAIVED'].includes(state ?? '') || checkVersion == null) {
      throw new ChannelQualityGovernancePlaybookContractError()
    }
    return { id: checkId, checkKey: key, title, instruction,
      evidenceRequirement: requirement as CasePlaybookCheck['evidenceRequirement'],
      state: state as CasePlaybookCheck['state'], checkVersion }
  })
  return { id, caseId, playbookId, playbookVersionId, sourceContentHash, snapshotHash,
    bindingStatus: status as CasePlaybookStatus, bindingVersion, checks,
    canAccept: item.canAccept as boolean, canVerifyCheck: item.canVerifyCheck as boolean,
    canWaiveCheck: item.canWaiveCheck as boolean, canComplete: item.canComplete as boolean,
    canWaive: item.canWaive as boolean }
}

export const channelQualityGovernancePlaybooksApi = {
  list: async (query: { status?: PlaybookVersionStatus; domain?: number } = {}): Promise<Result<GovernancePlaybook[]>> => {
    const raw = await client.get(`${BASE}/quality-governance-playbooks`, { params: query }) as Result<unknown>
    return requireRemote(raw, (value) => {
      if (!Array.isArray(value)) throw new ChannelQualityGovernancePlaybookContractError()
      return value.map(adaptPlaybook)
    })
  },
  create: async (payload: Record<string, unknown>): Promise<Result<GovernancePlaybook>> =>
    requireRemote(await client.post(`${BASE}/quality-governance-playbooks`, payload) as Result<unknown>, adaptPlaybook),
  createVersion: async (playbookId: string, payload: Record<string, unknown>): Promise<Result<PlaybookVersion>> =>
    requireRemote(await client.post(`${BASE}/quality-governance-playbooks/${encodeURIComponent(playbookId)}/versions`, payload) as Result<unknown>, adaptVersion),
  publish: async (versionId: string, payload: Record<string, unknown>): Promise<Result<PlaybookVersion>> =>
    requireRemote(await client.post(`${BASE}/quality-governance-playbook-versions/${encodeURIComponent(versionId)}/publish`, payload) as Result<unknown>, adaptVersion),
  retire: async (versionId: string, payload: Record<string, unknown>): Promise<Result<PlaybookVersion>> =>
    requireRemote(await client.post(`${BASE}/quality-governance-playbook-versions/${encodeURIComponent(versionId)}/retire`, payload) as Result<unknown>, adaptVersion),
  casePlaybooks: async (caseId: string): Promise<Result<CasePlaybook[]>> =>
    requireRemote(await client.get(`${BASE}/quality-review-risk-cases/${encodeURIComponent(caseId)}/playbooks`) as Result<unknown>, (value) => {
      if (!Array.isArray(value)) throw new ChannelQualityGovernancePlaybookContractError()
      return value.map(adaptCasePlaybook)
    }),
  transition: async (casePlaybookId: string, action: 'accept' | 'complete' | 'waive', payload: Record<string, unknown>): Promise<Result<CasePlaybook>> =>
    requireRemote(await client.post(`${BASE}/quality-review-risk-case-playbooks/${encodeURIComponent(casePlaybookId)}/${action}`, payload) as Result<unknown>, adaptCasePlaybook),
}

export const isV44Applicability = (value: unknown): value is 'MATCHED' | 'PARTIAL' | 'NOT_MATCHED' | 'INSUFFICIENT_CONTEXT' =>
  typeof value === 'string' && APPLICABILITY.has(value)
