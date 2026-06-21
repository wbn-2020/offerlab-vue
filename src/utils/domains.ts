export const DOMAIN = {
  TECH: 1,
  CAREER: 2,
  READING: 3,
  LIFESTYLE: 4,
  INVESTMENT: 5,
} as const

export type DomainValue = typeof DOMAIN[keyof typeof DOMAIN]

export interface DomainOption {
  value: DomainValue
  label: string
  icon: string
  description: string
}

export const DOMAIN_OPTIONS: DomainOption[] = [
  { value: DOMAIN.TECH, label: '技术', icon: '💻', description: '编程、架构、踩坑、技术文章' },
  { value: DOMAIN.CAREER, label: '职场', icon: '💼', description: '求职经验、职场沟通、职业规划' },
  { value: DOMAIN.READING, label: '阅读', icon: '📚', description: '读书笔记、书评、推荐书单' },
  { value: DOMAIN.LIFESTYLE, label: '生活', icon: '🎮', description: '兴趣分享、日常、游戏、影视' },
  { value: DOMAIN.INVESTMENT, label: '投资理财', icon: '💡', description: '理财心得、投资复盘' },
]

const domainByValue = new Map<DomainValue, DomainOption>()
DOMAIN_OPTIONS.forEach((d) => domainByValue.set(d.value, d))

export const DEFAULT_DOMAIN = DOMAIN.TECH

export const isKnownDomain = (domain?: number | string | null): domain is DomainValue => {
  const value = Number(domain)
  return Number.isFinite(value) && domainByValue.has(value as DomainValue)
}

export const normalizeDomain = (domain?: number | string | null): DomainValue => {
  const value = Number(domain)
  return Number.isFinite(value) && domainByValue.has(value as DomainValue)
    ? (value as DomainValue)
    : DEFAULT_DOMAIN
}

export const getDomainOption = (domain?: number | null): DomainOption => {
  return domainByValue.get(Number(domain) as DomainValue) ?? domainByValue.get(DEFAULT_DOMAIN)!
}

export const getDomainLabel = (domain?: number | null): string => getDomainOption(domain).label
export const getDomainIcon = (domain?: number | null): string => getDomainOption(domain).icon
