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
    value: POST_TYPE.TECH_ARTICLE,
    code: 'TECH_ARTICLE',
    label: '技术文章',
    shortLabel: '文章',
    description: '沉淀架构设计、技术方案、源码阅读和工程实践。',
    placeholder: '例如：Spring Cloud Gateway 鉴权链路实践',
    minContentLength: 40,
  },
  {
    value: POST_TYPE.PROJECT_REVIEW,
    code: 'PROJECT_REVIEW',
    label: '项目复盘',
    shortLabel: '复盘',
    description: '复盘项目背景、架构取舍、关键问题、结果和经验。',
    placeholder: '例如：CodeCoachAI 从 0 到 1 的后端架构复盘',
    minContentLength: 80,
  },
  {
    value: POST_TYPE.PITFALL,
    code: 'PITFALL',
    label: '踩坑记录',
    shortLabel: '踩坑',
    description: '记录排查过程、根因、修复方案和防复发建议。',
    placeholder: '例如：一次 Redis 缓存击穿的定位记录',
    minContentLength: 60,
  },
  {
    value: POST_TYPE.QUESTION,
    code: 'QUESTION',
    label: '问答求助',
    shortLabel: '问答',
    description: '提出具体技术问题，补充上下文和已尝试方案。',
    placeholder: '例如：MyBatis 分页失效应该从哪里排查？',
    minContentLength: 30,
  },
  {
    value: POST_TYPE.RESOURCE,
    code: 'RESOURCE',
    label: '资源分享',
    shortLabel: '资源',
    description: '分享学习路线、工具、模板、开源项目和参考资料。',
    placeholder: '例如：Java 后端工程化学习资源合集',
    minContentLength: 30,
  },
  {
    value: POST_TYPE.NOTE,
    code: 'NOTE',
    label: '经验笔记',
    shortLabel: '笔记',
    description: '记录小而有用的经验、命令、配置和处理手法。',
    placeholder: '例如：一次慢 SQL 优化的复盘笔记',
    minContentLength: 30,
  },
  {
    value: POST_TYPE.SYSTEM_DESIGN,
    code: 'SYSTEM_DESIGN',
    label: '系统设计',
    shortLabel: '设计',
    description: '拆解架构目标、容量估算、模块边界、数据模型和取舍。',
    placeholder: '例如：从 0 设计一个消息通知系统',
    minContentLength: 80,
  },
  {
    value: POST_TYPE.INTERVIEW_RECAP,
    code: 'INTERVIEW_RECAP',
    label: '面试复盘',
    shortLabel: '复盘',
    description: '沉淀面试问题、追问路径、表达卡点和后续补强计划。',
    placeholder: '例如：某厂 Java 后端二面复盘',
    minContentLength: 80,
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
]

export const COMMUNITY_CONTENT_TYPES: ContentTypeOption[] = [...FALLBACK_COMMUNITY_CONTENT_TYPES]
export const LEGACY_CONTENT_TYPES: ContentTypeOption[] = [...FALLBACK_LEGACY_CONTENT_TYPES]
export const ALL_CONTENT_TYPES: ContentTypeOption[] = [...COMMUNITY_CONTENT_TYPES, ...LEGACY_CONTENT_TYPES]

const contentTypeByValue = new Map<PostTypeValue, ContentTypeOption>()

export const DEFAULT_POST_TYPE = POST_TYPE.TECH_ARTICLE

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
