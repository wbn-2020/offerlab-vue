import { postApi } from '@/api/post'

export const POST_TYPE = {
  LEGACY_INTERVIEW: 1,
  LEGACY_BLOG: 2,
  LEGACY_SOLUTION: 3,
  LEGACY_QA: 4,
  TECH_ARTICLE: 10,
  PROJECT_REVIEW: 11,
  PITFALL: 12,
  QUESTION: 13,
  RESOURCE: 14,
  NOTE: 15,
  SYSTEM_DESIGN: 16,
  INTERVIEW_RECAP: 17,
} as const

export type PostTypeValue = typeof POST_TYPE[keyof typeof POST_TYPE]

export type ContentTypeCode =
  | 'TECH_ARTICLE'
  | 'PROJECT_REVIEW'
  | 'PITFALL'
  | 'QUESTION'
  | 'RESOURCE'
  | 'NOTE'
  | 'SYSTEM_DESIGN'
  | 'INTERVIEW_RECAP'
  | 'LEGACY_INTERVIEW'
  | 'LEGACY_BLOG'
  | 'LEGACY_SOLUTION'
  | 'LEGACY_QA'

export interface ContentTypeOption {
  value: PostTypeValue
  code: ContentTypeCode
  label: string
  shortLabel: string
  description: string
  placeholder: string
  minContentLength: number
  legacy?: boolean
}

const FALLBACK_COMMUNITY_CONTENT_TYPES: ContentTypeOption[] = [
  {
    value: POST_TYPE.NOTE,
    code: 'NOTE',
    label: '经验分享',
    shortLabel: '经验',
    description: '分享亲身经历、过程、踩坑、结果和可复用的做法。',
    placeholder: '例如：我如何用两周时间调整作息并稳定完成学习计划',
    minContentLength: 30,
  },
  {
    value: POST_TYPE.QUESTION,
    code: 'QUESTION',
    label: '问题求助',
    shortLabel: '求助',
    description: '提出具体问题，补充背景、已尝试方法和期待获得的建议。',
    placeholder: '例如：第一次租房看房时，哪些细节最容易被忽略？',
    minContentLength: 30,
  },
  {
    value: POST_TYPE.TECH_ARTICLE,
    code: 'TECH_ARTICLE',
    label: '攻略清单',
    shortLabel: '攻略',
    description: '整理步骤、方法、清单、避坑指南和可照着执行的经验。',
    placeholder: '例如：新手准备第一次独自旅行的行前清单',
    minContentLength: 40,
  },
  {
    value: POST_TYPE.RESOURCE,
    code: 'RESOURCE',
    label: '资源推荐',
    shortLabel: '资源',
    description: '推荐工具、网站、书单、课程、模板、资料和使用建议。',
    placeholder: '例如：我常用的 8 个免费效率工具和适合场景',
    minContentLength: 30,
  },
  {
    value: POST_TYPE.SYSTEM_DESIGN,
    code: 'SYSTEM_DESIGN',
    label: '观点讨论',
    shortLabel: '讨论',
    description: '表达观点、提出判断、分享观察，并邀请大家一起讨论。',
    placeholder: '例如：远程办公真正考验的是自我管理还是团队协作？',
    minContentLength: 40,
  },
  {
    value: POST_TYPE.PROJECT_REVIEW,
    code: 'PROJECT_REVIEW',
    label: '复盘记录',
    shortLabel: '复盘',
    description: '复盘一次项目、活动、经历或决策，记录背景、过程、结果和下一步。',
    placeholder: '例如：第一次组织线下读书会后的完整复盘',
    minContentLength: 60,
  },
  {
    value: POST_TYPE.PITFALL,
    code: 'PITFALL',
    label: '图文笔记',
    shortLabel: '笔记',
    description: '轻量记录灵感、日常观察、实用片段和图文式分享。',
    placeholder: '例如：这周让我效率变高的 5 个小习惯',
    minContentLength: 30,
  },
]

const FALLBACK_LEGACY_CONTENT_TYPES: ContentTypeOption[] = [
  {
    value: POST_TYPE.LEGACY_INTERVIEW,
    code: 'LEGACY_INTERVIEW',
    label: '历史经验',
    shortLabel: '旧经验',
    description: '旧版经验类型，保留给历史数据和知识卡链路。',
    placeholder: '例如：某主题 Java 后端复盘',
    minContentLength: 120,
    legacy: true,
  },
  {
    value: POST_TYPE.LEGACY_BLOG,
    code: 'LEGACY_BLOG',
    label: '技术博客',
    shortLabel: '博客',
    description: '旧版技术博客类型。',
    placeholder: '例如：Spring 事务传播机制总结',
    minContentLength: 40,
    legacy: true,
  },
  {
    value: POST_TYPE.LEGACY_SOLUTION,
    code: 'LEGACY_SOLUTION',
    label: '题解',
    shortLabel: '题解',
    description: '旧版题解类型。',
    placeholder: '例如：一道并发题的解法整理',
    minContentLength: 40,
    legacy: true,
  },
  {
    value: POST_TYPE.LEGACY_QA,
    code: 'LEGACY_QA',
    label: '历史问答',
    shortLabel: '问答',
    description: '旧版问答类型。',
    placeholder: '例如：如何梳理一个技术问题的上下文？',
    minContentLength: 40,
    legacy: true,
  },
  {
    value: POST_TYPE.INTERVIEW_RECAP,
    code: 'INTERVIEW_RECAP',
    label: '面试复盘',
    shortLabel: '面试',
    description: '职场经验频道保留的面试复盘类型，用于兼容历史内容和直达链路。',
    placeholder: '例如：某次产品运营岗位面试后的表达复盘',
    minContentLength: 80,
    legacy: true,
  },
]

export const COMMUNITY_CONTENT_TYPES: ContentTypeOption[] = [...FALLBACK_COMMUNITY_CONTENT_TYPES]
export const LEGACY_CONTENT_TYPES: ContentTypeOption[] = [...FALLBACK_LEGACY_CONTENT_TYPES]
export const ALL_CONTENT_TYPES: ContentTypeOption[] = [...COMMUNITY_CONTENT_TYPES, ...LEGACY_CONTENT_TYPES]

const contentTypeByValue = new Map<PostTypeValue, ContentTypeOption>()

export const DEFAULT_POST_TYPE = POST_TYPE.NOTE

const supportedValues = new Set<number>(Object.values(POST_TYPE))
const supportedCodes = new Set<string>([
  'TECH_ARTICLE',
  'PROJECT_REVIEW',
  'PITFALL',
  'QUESTION',
  'RESOURCE',
  'NOTE',
  'SYSTEM_DESIGN',
  'INTERVIEW_RECAP',
  'LEGACY_INTERVIEW',
  'LEGACY_BLOG',
  'LEGACY_SOLUTION',
  'LEGACY_QA',
])

const rebuildIndex = () => {
  contentTypeByValue.clear()
  ALL_CONTENT_TYPES.forEach((item) => contentTypeByValue.set(item.value, item))
}

const resetContentTypes = (items: ContentTypeOption[]) => {
  const community = items.filter((item) => !item.legacy)
  const legacy = items.filter((item) => item.legacy)
  COMMUNITY_CONTENT_TYPES.splice(0, COMMUNITY_CONTENT_TYPES.length, ...community)
  LEGACY_CONTENT_TYPES.splice(0, LEGACY_CONTENT_TYPES.length, ...legacy)
  ALL_CONTENT_TYPES.splice(0, ALL_CONTENT_TYPES.length, ...COMMUNITY_CONTENT_TYPES, ...LEGACY_CONTENT_TYPES)
  rebuildIndex()
}

const normalizeContentType = (raw: unknown): ContentTypeOption | null => {
  const item = raw as Partial<ContentTypeOption> | null
  const value = Number(item?.value)
  const code = String(item?.code || '')
  if (!supportedValues.has(value) || !supportedCodes.has(code)) return null
  const fallback = contentTypeByValue.get(value as PostTypeValue)
  return {
    value: value as PostTypeValue,
    code: code as ContentTypeCode,
    label: String(item?.label || fallback?.label || code),
    shortLabel: String(item?.shortLabel || fallback?.shortLabel || item?.label || code),
    description: String(item?.description || fallback?.description || ''),
    placeholder: String(item?.placeholder || fallback?.placeholder || ''),
    minContentLength: Math.max(1, Number(item?.minContentLength || fallback?.minContentLength || 30)),
    legacy: Boolean(item?.legacy),
  }
}

export const loadContentTypeOptions = async () => {
  try {
    const res = await postApi.getContentTypes()
    const items = (res.data || [])
      .map(normalizeContentType)
      .filter((item): item is ContentTypeOption => Boolean(item))
    if (items.length >= FALLBACK_COMMUNITY_CONTENT_TYPES.length) {
      resetContentTypes(items)
    }
  } catch {
    resetContentTypes([...FALLBACK_COMMUNITY_CONTENT_TYPES, ...FALLBACK_LEGACY_CONTENT_TYPES])
  }
  return ALL_CONTENT_TYPES
}

export const getContentTypeOption = (postType?: number | null) => {
  return contentTypeByValue.get(Number(postType) as PostTypeValue)
    || contentTypeByValue.get(DEFAULT_POST_TYPE)!
}

export const getContentTypeLabel = (postType?: number | null) => getContentTypeOption(postType).label

export const getContentTypeShortLabel = (postType?: number | null) => getContentTypeOption(postType).shortLabel

export const isLegacyInterviewType = (postType?: number | null) => Number(postType) === POST_TYPE.LEGACY_INTERVIEW

export const contentTypeCodeOf = (postType?: number | null) => getContentTypeOption(postType).code

rebuildIndex()
