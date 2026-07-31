// 六步社区成长路径：对「自己已留下的公开记录」的如实映射。
//
// 硬约束（PRODUCT.md 社区成长路径 + 红线原文）：
// - 路径不是等级、不是资质、不做任何跨用户对比或排名（无公开财富榜）。
// - 声望不可消费、不可转移，不代表专业资质；野点不可兑换真实物品。
// - 角色经过申请/审核/暂停/撤销流程，不授予平台权威。
// - 三态诚实：数据源读不到 → unavailable；读到但为空 → empty；有记录 → active。
//   绝不把 unavailable 伪装成 empty 或 active，绝不编造计数。
// 本文件是零依赖纯函数（守卫会转译执行），网络与取数由页面负责。

export type GrowthPathState = 'active' | 'empty' | 'unavailable'

export type TrustedGrowthPathSource<T extends object> = T & {
  trusted: true
}

export interface GrowthPayloadMetadata {
  source?: unknown
  degraded?: unknown
  fallbackReason?: unknown
}

export interface GrowthResultEnvelopeMetadata extends GrowthPayloadMetadata {
  code?: unknown
  message?: unknown
  data?: unknown
}

export interface GrowthPathStepDefinition {
  key: string
  title: string
  hint: string
}

// 顺序与 PRODUCT.md「社区成长路径」L44-49 严格一致，不得重排。
export const GROWTH_PATH_STEPS: readonly GrowthPathStepDefinition[] = [
  { key: 'trusted-content', title: '可信公开内容', hint: '发布公开、可核查、可纠错的内容。' },
  { key: 'co-build', title: '内容需求与公共共建', hint: '发起或认领公共内容需求，参与共建。' },
  { key: 'contribution-records', title: '可解释的贡献记录', hint: '每一笔贡献记录都有可追溯的原因。' },
  {
    key: 'domain-reputation',
    title: '不可消费的领域声望与逐步开放的野点',
    hint: '声望不可消费、不可转移，不代表专业资质。',
  },
  {
    key: 'virtual-benefits',
    title: '低风险虚拟权益、感谢票和平台配额悬赏',
    hint: '全部为虚拟记录，不涉及真实货币。',
  },
  {
    key: 'community-roles',
    title: '经过申请、审核、暂停和撤销流程的社区角色',
    hint: '角色来自公开流程，不授予平台权威。',
  },
] as const

export interface GrowthPathSnapshot {
  windowDays: number
  /** null = 来源不可用；只有页面验证过的可信 payload 才能构造 trusted source。 */
  posts: TrustedGrowthPathSource<{ windowPostCount: number }> | null
  coBuild: TrustedGrowthPathSource<{ claimedCount: number; createdCount: number }> | null
  records: TrustedGrowthPathSource<{ ledgerCount: number }> | null
  reputation: TrustedGrowthPathSource<{ reputationDomainCount: number; pointBalance: number }> | null
  perks: TrustedGrowthPathSource<{
    entitlementCount: number
    thanksReceivedCount: number
    bountySubmissionCount: number
  }> | null
  roles: TrustedGrowthPathSource<{ grantCount: number; applicationCount: number }> | null
}

export interface GrowthPathStepStatus extends GrowthPathStepDefinition {
  state: GrowthPathState
  evidence: string[]
}

const UNAVAILABLE_EVIDENCE = '相关记录暂无法读取，稍后再看。'
const UNTRUSTED_SOURCE_PATTERN = /demo|fallback|unavailable|degraded/i

const hasUntrustedMarker = (value: unknown) => (
  typeof value === 'string'
  && value.trim().length > 0
  && UNTRUSTED_SOURCE_PATTERN.test(value)
)

export const hasUntrustedGrowthMetadata = (payload: unknown): boolean => {
  if (payload == null || typeof payload !== 'object') return false
  const metadata = payload as GrowthPayloadMetadata
  if (
    metadata.source != null
    && (typeof metadata.source !== 'string' || metadata.source.trim().toLowerCase() !== 'remote')
  ) return true
  if (metadata.degraded != null && metadata.degraded !== false) return true
  if (
    metadata.fallbackReason != null
    && (typeof metadata.fallbackReason !== 'string' || Boolean(metadata.fallbackReason.trim()))
  ) return true
  return false
}

export const isTrustedGrowthPayload = (
  payload: unknown,
  envelopeMessage?: unknown,
): boolean => {
  if (payload == null || typeof payload !== 'object' || hasUntrustedMarker(envelopeMessage)) return false
  const metadata = payload as GrowthPayloadMetadata
  // Growth-path empty and active states require an explicit remote, non-degraded
  // contract. Missing source metadata is unavailable, never an implicit success.
  if (metadata.source !== 'remote' || metadata.degraded !== false) return false
  if (
    metadata.fallbackReason != null
    && (typeof metadata.fallbackReason !== 'string' || metadata.fallbackReason.trim())
  ) return false
  return true
}

export const isTrustedGrowthResult = (result: unknown): boolean => {
  if (result == null || typeof result !== 'object') return false
  const envelope = result as GrowthResultEnvelopeMetadata
  if (envelope.code !== 0 || hasUntrustedMarker(envelope.message)) return false
  return envelope.source === 'remote'
    && envelope.degraded === false
    && !hasUntrustedGrowthMetadata(envelope)
}

export const toGrowthCount = (value: unknown): number | null => {
  if (value == null) return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const count = Number(value)
  return Number.isSafeInteger(count) && count >= 0 ? count : null
}

export const summarizeGrowthPath = (snapshot: GrowthPathSnapshot): GrowthPathStepStatus[] => {
  const days = Math.max(1, Math.floor(snapshot?.windowDays || 30))
  return GROWTH_PATH_STEPS.map((step) => {
    switch (step.key) {
      case 'trusted-content':
        return postsStep(step, snapshot?.posts ?? null, days)
      case 'co-build':
        return coBuildStep(step, snapshot?.coBuild ?? null)
      case 'contribution-records':
        return recordsStep(step, snapshot?.records ?? null)
      case 'domain-reputation':
        return reputationStep(step, snapshot?.reputation ?? null)
      case 'virtual-benefits':
        return perksStep(step, snapshot?.perks ?? null)
      case 'community-roles':
        return rolesStep(step, snapshot?.roles ?? null)
      default:
        return { ...step, state: 'unavailable', evidence: [UNAVAILABLE_EVIDENCE] }
    }
  })
}

const unavailable = (step: GrowthPathStepDefinition): GrowthPathStepStatus => ({
  ...step,
  state: 'unavailable',
  evidence: [UNAVAILABLE_EVIDENCE],
})

const empty = (step: GrowthPathStepDefinition, text: string): GrowthPathStepStatus => ({
  ...step,
  state: 'empty',
  evidence: [text],
})

const active = (step: GrowthPathStepDefinition, evidence: string[]): GrowthPathStepStatus => ({
  ...step,
  state: 'active',
  evidence,
})

const postsStep = (
  step: GrowthPathStepDefinition,
  posts: GrowthPathSnapshot['posts'],
  days: number,
): GrowthPathStepStatus => {
  if (!posts || posts.trusted !== true) return unavailable(step)
  const windowPostCount = toGrowthCount(posts.windowPostCount)
  if (windowPostCount === null) return unavailable(step)
  if (windowPostCount > 0) {
    return active(step, [`近 ${days} 天发布公开内容 ${windowPostCount} 篇。`])
  }
  return empty(step, `近 ${days} 天还没有公开发布。`)
}

const coBuildStep = (
  step: GrowthPathStepDefinition,
  coBuild: GrowthPathSnapshot['coBuild'],
): GrowthPathStepStatus => {
  if (!coBuild || coBuild.trusted !== true) return unavailable(step)
  const claimedCount = toGrowthCount(coBuild.claimedCount)
  const createdCount = toGrowthCount(coBuild.createdCount)
  if (claimedCount === null || createdCount === null) return unavailable(step)
  const parts: string[] = []
  if (claimedCount > 0) parts.push(`认领共建需求 ${claimedCount} 项。`)
  if (createdCount > 0) parts.push(`发起内容需求 ${createdCount} 项。`)
  return parts.length ? active(step, parts) : empty(step, '还没有共建参与记录。')
}

const recordsStep = (
  step: GrowthPathStepDefinition,
  records: GrowthPathSnapshot['records'],
): GrowthPathStepStatus => {
  if (!records || records.trusted !== true) return unavailable(step)
  const ledgerCount = toGrowthCount(records.ledgerCount)
  if (ledgerCount === null) return unavailable(step)
  return ledgerCount > 0
    ? active(step, [`留下可解释的贡献记录 ${ledgerCount} 条。`])
    : empty(step, '还没有贡献记录。')
}

const reputationStep = (
  step: GrowthPathStepDefinition,
  reputation: GrowthPathSnapshot['reputation'],
): GrowthPathStepStatus => {
  if (!reputation || reputation.trusted !== true) return unavailable(step)
  const reputationDomainCount = toGrowthCount(reputation.reputationDomainCount)
  const pointBalance = toGrowthCount(reputation.pointBalance)
  if (reputationDomainCount === null || pointBalance === null) return unavailable(step)
  const parts: string[] = []
  if (reputationDomainCount > 0) {
    parts.push(`在 ${reputationDomainCount} 个频道留下声望记录（不可消费、不代表资质）。`)
  }
  if (pointBalance > 0) {
    parts.push(`野点余额 ${pointBalance}（不可提现、不可购买曝光）。`)
  }
  return parts.length ? active(step, parts) : empty(step, '还没有声望或野点记录。')
}

const perksStep = (
  step: GrowthPathStepDefinition,
  perks: GrowthPathSnapshot['perks'],
): GrowthPathStepStatus => {
  if (!perks || perks.trusted !== true) return unavailable(step)
  const entitlementCount = toGrowthCount(perks.entitlementCount)
  const thanksReceivedCount = toGrowthCount(perks.thanksReceivedCount)
  const bountySubmissionCount = toGrowthCount(perks.bountySubmissionCount)
  if (
    entitlementCount === null
    || thanksReceivedCount === null
    || bountySubmissionCount === null
  ) return unavailable(step)
  const parts: string[] = []
  if (entitlementCount > 0) parts.push(`持有虚拟权益 ${entitlementCount} 项。`)
  if (thanksReceivedCount > 0) parts.push(`收到感谢票 ${thanksReceivedCount} 张。`)
  if (bountySubmissionCount > 0) parts.push(`参与配额悬赏 ${bountySubmissionCount} 次。`)
  return parts.length ? active(step, parts) : empty(step, '还没有虚拟权益、感谢票或悬赏记录。')
}

const rolesStep = (
  step: GrowthPathStepDefinition,
  roles: GrowthPathSnapshot['roles'],
): GrowthPathStepStatus => {
  if (!roles || roles.trusted !== true) return unavailable(step)
  const grantCount = toGrowthCount(roles.grantCount)
  const applicationCount = toGrowthCount(roles.applicationCount)
  if (grantCount === null || applicationCount === null) return unavailable(step)
  const parts: string[] = []
  if (grantCount > 0) parts.push(`获授社区角色 ${grantCount} 个（含历史暂停/撤销记录）。`)
  if (applicationCount > 0) parts.push(`提交角色申请 ${applicationCount} 份。`)
  return parts.length ? active(step, parts) : empty(step, '还没有角色申请或授予记录。')
}
