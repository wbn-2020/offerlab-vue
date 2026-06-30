import { POST_TYPE, type PostTypeValue } from '@/utils/contentTypes'

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
  riskNote?: string
}

export interface CommunityChannel {
  key: string
  name: string
  icon: string
  description: string
  domain?: DomainValue
  postTypes?: PostTypeValue[]
  tags?: string[]
  topics?: string[]
  riskNote?: string
}

export const DOMAIN_OPTIONS: DomainOption[] = [
  { value: DOMAIN.TECH, label: '科技数码', icon: '💻', description: '编程、AI 工具、产品体验、数码设备和效率工具' },
  { value: DOMAIN.CAREER, label: '职场经验', icon: '💼', description: '求职面试、实习转行、工作复盘和职场选择' },
  { value: DOMAIN.READING, label: '学习成长', icon: '📚', description: '学习方法、读书笔记、考试经验、技能提升和自我管理' },
  { value: DOMAIN.LIFESTYLE, label: '生活方式', icon: '🌿', description: '租房、城市生活、消费经验、旅行、健康、情绪和日常' },
  {
    value: DOMAIN.INVESTMENT,
    label: '投资理财',
    icon: '💡',
    description: '理财心得、投资复盘和风险认知',
    riskNote: '投资理财内容仅供经验交流，不构成投资建议，请自行判断风险。',
  },
]

const domainByValue = new Map<DomainValue, DomainOption>()
DOMAIN_OPTIONS.forEach((d) => domainByValue.set(d.value, d))

export const DEFAULT_DOMAIN = DOMAIN.TECH

export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    key: 'tech-digital',
    name: '科技数码',
    icon: '💻',
    description: '编程、AI 工具、产品体验、数码设备和效率工具。',
    domain: DOMAIN.TECH,
    tags: ['AI 工具', '软件工具', '产品体验', '数码设备', '效率工具'],
  },
  {
    key: 'learning-growth',
    name: '学习成长',
    icon: '📚',
    description: '学习方法、读书笔记、考试经验、技能提升和自我管理。',
    domain: DOMAIN.READING,
    tags: ['学习方法', '读书笔记', '考试经验', '技能提升', '时间管理'],
  },
  {
    key: 'career-experience',
    name: '职场经验',
    icon: '💼',
    description: '求职面试、实习转行、工作复盘和职场选择。',
    domain: DOMAIN.CAREER,
    tags: ['求职经验', '面试经验', '实习经历', '转行经验', '工作复盘'],
  },
  {
    key: 'lifestyle',
    name: '生活方式',
    icon: '🌿',
    description: '租房、城市生活、消费经验、旅行、健康、情绪和日常。',
    domain: DOMAIN.LIFESTYLE,
    tags: ['租房', '城市生活', '消费经验', '旅行', '健康', '日常'],
  },
  {
    key: 'resources',
    name: '资源推荐',
    icon: '🧰',
    description: '网站、工具、书单、课程、模板和资料合集。',
    postTypes: [POST_TYPE.RESOURCE],
    tags: ['工具推荐', '网站推荐', '书单', '课程', '模板', '资料'],
  },
  {
    key: 'qa-discussion',
    name: '问答讨论',
    icon: '💬',
    description: '求建议、求推荐、提问、观点讨论和经验征集。',
    postTypes: [POST_TYPE.QUESTION, POST_TYPE.NOTE],
    tags: ['求建议', '求推荐', '观点讨论', '经验征集'],
  },
]

export const SECONDARY_COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    key: 'investment',
    name: '投资理财',
    icon: '💡',
    description: '理财心得、投资复盘和风险认知。',
    domain: DOMAIN.INVESTMENT,
    riskNote: '投资理财内容仅供经验交流，不构成投资建议，请自行判断风险。',
  },
]

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
