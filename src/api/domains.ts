import client, { type Result } from './client'
import { DOMAIN, DOMAIN_OPTIONS, type DomainOption, normalizeDomain } from '@/utils/domains'

export type DomainConfigSource = 'remote' | 'fallback'

export interface PublicDomainConfig {
  domain: number
  domainName: string
  domainSlug: string
  description: string
  sortOrder: number
  enabled: boolean
  riskLevel: string
  postingNotice?: string
  browseNotice?: string
  interactionNotice?: string
  icon: string
}

export interface DomainConfigListResult {
  data: PublicDomainConfig[]
  source: DomainConfigSource
}

const domainOptionByValue = new Map<number, DomainOption>(DOMAIN_OPTIONS.map((item) => [item.value, item]))

const fallbackNoticeByDomain: Record<number, Pick<PublicDomainConfig, 'browseNotice' | 'interactionNotice'>> = {
  [DOMAIN.TECH]: {
    browseNotice: '公开技术内容默认可直接浏览。',
    interactionNotice: '点赞、收藏、评论前请先登录。',
  },
  [DOMAIN.CAREER]: {
    browseNotice: '求职与职场内容优先保留真实背景与边界。',
    interactionNotice: '互动前请先登录并遵守社区礼仪。',
  },
  [DOMAIN.READING]: {
    browseNotice: '读书笔记、书单与方法论摘录可先浏览再决定是否收藏。',
    interactionNotice: '登录后可收藏、评论并追踪后续讨论。',
  },
  [DOMAIN.LIFESTYLE]: {
    browseNotice: '公开生活实践内容可直接浏览。',
    interactionNotice: '互动前请先登录，保持友善表达。',
  },
  [DOMAIN.INVESTMENT]: {
    browseNotice: '浏览投资理财内容时请自行判断风险，社区不构成建议。',
    interactionNotice: '互动前请先登录并注意风险提示。',
  },
}

const localRiskLevel = (domain: number) => {
  if (domain === DOMAIN.INVESTMENT) return 'HIGH'
  if (domain === DOMAIN.CAREER) return 'MEDIUM'
  return 'LOW'
}

const textOrFallback = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const fallbackSlug = (option: DomainOption) => {
  return option.label
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `domain-${option.value}`
}

const buildFallbackDomainConfig = (option: DomainOption, index: number): PublicDomainConfig => {
  const notices = fallbackNoticeByDomain[option.value] || fallbackNoticeByDomain[DOMAIN.TECH]
  return {
    domain: option.value,
    domainName: option.label,
    domainSlug: fallbackSlug(option),
    description: option.description,
    sortOrder: (index + 1) * 10,
    enabled: true,
    riskLevel: localRiskLevel(option.value),
    postingNotice: option.description,
    browseNotice: notices.browseNotice,
    interactionNotice: notices.interactionNotice,
    icon: option.icon,
  }
}

const normalizeList = (items: PublicDomainConfig[]) => {
  return items
    .filter((item) => item.enabled)
    .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.domain - b.domain))
}

const fallbackDomainConfigs = DOMAIN_OPTIONS.map((option, index) => buildFallbackDomainConfig(option, index))

const adaptDomainConfig = (raw: any): PublicDomainConfig => {
  const domain = normalizeDomain(raw?.domain)
  const option = domainOptionByValue.get(domain) ?? DOMAIN_OPTIONS[0]!
  const fallback = fallbackDomainConfigs.find((item) => item.domain === domain) ?? buildFallbackDomainConfig(option, 0)
  return {
    domain,
    domainName: textOrFallback(raw?.domainName, option.label),
    domainSlug: textOrFallback(raw?.domainSlug, fallback.domainSlug),
    description: textOrFallback(raw?.description, option.description),
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : fallback.sortOrder,
    enabled: raw?.enabled == null ? true : Boolean(raw.enabled),
    riskLevel: textOrFallback(raw?.riskLevel, fallback.riskLevel).toUpperCase(),
    postingNotice: textOrFallback(raw?.postingNotice, fallback.postingNotice),
    browseNotice: textOrFallback(raw?.browseNotice, fallback.browseNotice),
    interactionNotice: textOrFallback(raw?.interactionNotice, fallback.interactionNotice),
    icon: option.icon,
  }
}

export const localDomainConfigs = normalizeList([...fallbackDomainConfigs])

export const domainApi = {
  listPublic: async (): Promise<DomainConfigListResult> => {
    try {
      const res = await client.get('/api/v1/domains', { skipAuthRedirect: true }) as Result<any>
      const remoteConfigs = Array.isArray(res.data) ? normalizeList(res.data.map(adaptDomainConfig)) : []
      if (remoteConfigs.length) {
        return {
          data: remoteConfigs,
          source: 'remote',
        }
      }
    } catch {
      // Explore page should stay available even when the public domain config API is unavailable.
    }

    return {
      data: localDomainConfigs,
      source: 'fallback',
    }
  },
}
