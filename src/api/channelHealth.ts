import client, { type Result } from './client'

export interface ChannelHealth {
  domain: number
  domainName: string
  publicPostCount: number
  trustProfileCount: number
  trustProfileCoveragePercent: number
  freshnessAwaitingConfirmation: number
  pendingSuggestions: number
  unresolvedQuestions: number
  openContentNeeds: number
  healthStatus: 'STABLE' | 'ATTENTION'
  attentionReasons: string[]
}

const count = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const adapt = (raw: any): ChannelHealth => ({
  domain: Number(raw?.domain ?? 0),
  domainName: String(raw?.domainName ?? '未分类'),
  publicPostCount: count(raw?.publicPostCount),
  trustProfileCount: count(raw?.trustProfileCount),
  trustProfileCoveragePercent: Math.min(100, count(raw?.trustProfileCoveragePercent)),
  freshnessAwaitingConfirmation: count(raw?.freshnessAwaitingConfirmation),
  pendingSuggestions: count(raw?.pendingSuggestions),
  unresolvedQuestions: count(raw?.unresolvedQuestions),
  openContentNeeds: count(raw?.openContentNeeds),
  healthStatus: raw?.healthStatus === 'STABLE' ? 'STABLE' : 'ATTENTION',
  attentionReasons: Array.isArray(raw?.attentionReasons)
    ? raw.attentionReasons.map((item: unknown) => String(item)).filter(Boolean)
    : [],
})

export const channelHealthApi = {
  list: async (domain?: number): Promise<Result<ChannelHealth[]>> => {
    const res = await client.get('/api/v1/community-health/channels', {
      params: domain == null ? undefined : { domain },
    }) as Result<any>
    return {
      ...res,
      data: Array.isArray(res.data) ? res.data.map(adapt) : [],
    }
  },
}
