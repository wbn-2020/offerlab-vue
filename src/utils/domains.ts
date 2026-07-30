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

export interface CommunityContentForm {
  key: string
  name: string
  icon: string
  description: string
  postTypes: PostTypeValue[]
  tags?: string[]
  topics?: string[]
}

export const HIGH_RISK_DOMAIN_NOTES = {
  investment: '投资理财内容仅供经验交流，不构成投资建议，请自行判断风险。',
  medical: '医疗健康内容仅供经验交流，不构成医疗建议；如涉及诊断、用药或治疗，请咨询合格专业人员。',
  legal: '法律相关内容仅供经验交流，不构成法律意见；涉及具体权益处置时，请咨询合格专业人员。',
  mentalHealth: '情绪心理内容仅供经验交流，不构成心理诊断或治疗建议；如存在紧急风险，请及时寻求线下帮助。',
} as const

export type HighRiskDomainNoteKey = keyof typeof HIGH_RISK_DOMAIN_NOTES

export const getDomainRiskNote = (key?: HighRiskDomainNoteKey | null): string => {
  return key ? HIGH_RISK_DOMAIN_NOTES[key] : ''
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
    riskNote: getDomainRiskNote('investment'),
  },
]

const domainByValue = new Map<DomainValue, DomainOption>()
DOMAIN_OPTIONS.forEach((d) => domainByValue.set(d.value, d))

export const DEFAULT_DOMAIN = DOMAIN.TECH
export const UNKNOWN_DOMAIN_LABEL = '未标注频道'

export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    key: 'tech-digital',
    name: '科技数码',
    icon: '💻',
    description: '编程、AI 工具、产品体验、数码设备和效率工具。',
    domain: DOMAIN.TECH,
    tags: ['AI 工具', '软件工具', '产品体验', '数码设备', '效率工具'],
    topics: ['AI 工具实测', '数码设备体验', '效率工作流'],
  },
  {
    key: 'learning-growth',
    name: '学习成长',
    icon: '📚',
    description: '学习方法、读书笔记、考试经验、技能提升和自我管理。',
    domain: DOMAIN.READING,
    tags: ['学习方法', '读书笔记', '考试经验', '技能提升', '时间管理'],
    topics: ['阅读清单共读', '学习方法复盘', '技能提升路线'],
  },
  {
    key: 'career-experience',
    name: '职场经验',
    icon: '💼',
    description: '求职面试、实习转行、工作复盘和职场选择。',
    domain: DOMAIN.CAREER,
    tags: ['求职经验', '面试经验', '实习经历', '转行经验', '工作复盘'],
    topics: ['转行经验合集', '职场沟通复盘', '面试与 Offer 讨论'],
  },
  {
    key: 'lifestyle',
    name: '生活方式',
    icon: '🌿',
    description: '租房、城市生活、消费经验、旅行、健康、情绪和日常。',
    domain: DOMAIN.LIFESTYLE,
    tags: ['租房', '城市生活', '消费经验', '旅行', '健康', '日常'],
    topics: ['城市租房避坑', '生活消费复盘', '日常健康记录'],
  },
]

export const SECONDARY_COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    key: 'investment',
    name: '投资理财',
    icon: '💡',
    description: '理财心得、投资复盘和风险认知。',
    domain: DOMAIN.INVESTMENT,
    tags: ['风险复盘', '理财心得', '资产配置'],
    topics: ['投资风险复盘', '理财经验交流'],
    riskNote: getDomainRiskNote('investment'),
  },
]

export const COMMUNITY_CONTENT_FORMS: CommunityContentForm[] = [
  {
    key: 'resource',
    name: '资源推荐',
    icon: '🧰',
    description: '工具、网站、书单、课程、模板和资料合集。',
    postTypes: [POST_TYPE.RESOURCE],
    tags: ['工具推荐', '网站推荐', '书单', '课程', '模板', '资料'],
    topics: ['资源合集', '工具箱推荐', '书单与课程'],
  },
  {
    key: 'question',
    name: '问题求助',
    icon: '💬',
    description: '提出具体问题，补充背景、已尝试方法和期待获得的建议。',
    postTypes: [POST_TYPE.QUESTION],
    tags: ['求建议', '求推荐', '问题求助'],
    topics: ['社区问答精选', '问题闭环', '经验征集'],
  },
  {
    key: 'discussion',
    name: '观点讨论',
    icon: '🗣️',
    description: '表达观点、分享观察，并邀请社区成员一起讨论。',
    postTypes: [POST_TYPE.SYSTEM_DESIGN],
    tags: ['观点讨论', '公共议题', '经验交流'],
    topics: ['观点讨论', '经验征集'],
  },
  {
    key: 'retrospective',
    name: '复盘记录',
    icon: '🔁',
    description: '记录一次经历、项目、活动或决策的背景、过程、结果和下一步。',
    postTypes: [POST_TYPE.PROJECT_REVIEW],
    tags: ['复盘', '过程记录', '经验总结'],
    topics: ['经历复盘', '项目复盘'],
  },
  {
    key: 'checklist',
    name: '攻略清单',
    icon: '✅',
    description: '整理步骤、方法、清单、避坑指南和可照着执行的经验。',
    postTypes: [POST_TYPE.TECH_ARTICLE],
    tags: ['攻略', '清单', '避坑指南'],
    topics: ['实用清单', '避坑经验'],
  },
]

// Historical labels remain searchable and routable, but are content-form aliases rather than channels.
export const LEGACY_CONTENT_FORM_LABELS = ['资源推荐', '问答讨论'] as const

export const ALL_COMMUNITY_CHANNELS: CommunityChannel[] = [
  ...COMMUNITY_CHANNELS,
  ...SECONDARY_COMMUNITY_CHANNELS,
]

export const getCommunityChannel = (key?: string | string[] | null): CommunityChannel | undefined => {
  const value = Array.isArray(key) ? key[0] : key
  return ALL_COMMUNITY_CHANNELS.find((channel) => channel.key === value)
}

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

/**
 * Use this at command boundaries. Display code may intentionally fall back to
 * the default domain, but writes must never silently change an unknown domain.
 */
export const requireKnownDomain = (domain?: number | string | null): DomainValue => {
  if (!isKnownDomain(domain)) {
    throw new Error('请选择频道')
  }
  return Number(domain) as DomainValue
}

export const getDomainOption = (domain?: number | null): DomainOption => {
  return domainByValue.get(Number(domain) as DomainValue) ?? domainByValue.get(DEFAULT_DOMAIN)!
}

export const getDomainLabel = (domain?: number | null): string => getDomainOption(domain).label
export const getDomainIcon = (domain?: number | null): string => getDomainOption(domain).icon

export const getDomainOptionSafe = (domain?: number | string | null): DomainOption | undefined => {
  return isKnownDomain(domain) ? domainByValue.get(Number(domain) as DomainValue) : undefined
}

export const getDomainLabelSafe = (domain?: number | string | null): string => {
  return getDomainOptionSafe(domain)?.label ?? UNKNOWN_DOMAIN_LABEL
}

export const getDomainIconSafe = (domain?: number | string | null): string => {
  return getDomainOptionSafe(domain)?.icon ?? ''
}
