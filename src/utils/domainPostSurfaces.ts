import type { Post } from '@/api/types'
import { DOMAIN } from '@/utils/domains'

type SurfaceTone = 'tech' | 'career' | 'reading' | 'lifestyle' | 'investment'

export interface DomainSurfaceChip {
  label: string
  tone: SurfaceTone
}

export interface DomainSurfaceItem {
  label: string
  value: string
}

export interface DomainCardSurface {
  tone: SurfaceTone
  chips: DomainSurfaceChip[]
  imageUrl?: string
  imageAlt?: string
}

export interface DomainDetailSurface {
  tone: SurfaceTone
  title: string
  description: string
  items: DomainSurfaceItem[]
  chips: DomainSurfaceChip[]
  images: string[]
  riskNotice?: string
}

const isPresent = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== ''
const hasContent = (surface: Pick<DomainDetailSurface, 'items' | 'chips' | 'images' | 'riskNotice'>) => (
  surface.items.length > 0
  || surface.chips.length > 0
  || surface.images.length > 0
  || Boolean(surface.riskNotice)
)

const firstText = (source: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = source[key]
    if (isPresent(value)) return String(value).trim()
  }
  return ''
}

const listFrom = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，、\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const firstList = (source: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = listFrom(source[key])
    if (values.length) return values
  }
  return []
}

const yearsText = (value: string) => {
  if (!value) return ''
  return /年|year/i.test(value) ? value : `${value} 年经验`
}

const ratingText = (value: string) => {
  if (!value) return ''
  return /分|\/|星/.test(value) ? value : `${value} 分`
}

const anonymousText = (source: Record<string, unknown>) => {
  const value = source.anonymous ?? source.isAnonymous ?? source.anonymousPost
  if (value === true || value === 'true' || value === 1 || value === '1') return '匿名分享'
  return ''
}

const extensionOf = (post: Post): Record<string, unknown> => post.extension || {}

const imageList = (post: Post, extension: Record<string, unknown>) => {
  const images = [
    ...listFrom(post.coverUrl),
    ...firstList(extension, ['gallery', 'images', 'imageUrls', 'photoUrls', 'photos']),
    ...listFrom(extension.coverUrl),
    ...listFrom(extension.imageUrl),
  ]
  return Array.from(new Set(images)).slice(0, 6)
}

const chip = (label: string, tone: SurfaceTone): DomainSurfaceChip | null => label ? { label, tone } : null
const compactChips = (items: Array<DomainSurfaceChip | null | undefined>, limit: number) => items.filter(Boolean).slice(0, limit) as DomainSurfaceChip[]

const item = (label: string, value: string): DomainSurfaceItem | null => value ? { label, value } : null
const compactItems = (items: Array<DomainSurfaceItem | null | undefined>) => items.filter(Boolean) as DomainSurfaceItem[]

const buildTech = (post: Post) => {
  const ext = extensionOf(post)
  const techStacks = firstList(ext, ['techStacks', 'stacks'])
  const difficulty = firstText(ext, ['difficulty', 'level'])
  const scenario = firstText(ext, ['scenario', 'scene', 'useCase'])
  const tools = firstList(ext, ['relatedTools', 'tools', 'tooling'])
  return {
    card: {
      tone: 'tech' as const,
      chips: compactChips([
        chip(difficulty, 'tech'),
        chip(scenario, 'tech'),
        ...techStacks.map((value) => chip(value, 'tech')),
      ], 4),
    },
    detail: {
      tone: 'tech' as const,
      title: '技术实践信息',
      description: '这篇内容会优先展示技术栈、难度、应用场景和相关工具。',
      items: compactItems([
        item('技术栈', techStacks.join(' / ')),
        item('难度等级', difficulty),
        item('应用场景', scenario),
        item('相关工具', tools.join(' / ')),
      ]),
      chips: compactChips(techStacks.map((value) => chip(value, 'tech')), 8),
      images: imageList(post, ext),
    },
  }
}

const buildCareer = (post: Post) => {
  const ext = extensionOf(post)
  const company = firstText(ext, ['company', 'companyName', 'organization'])
  const companySize = firstText(ext, ['companySize', 'orgSize', 'scale'])
  const position = firstText(ext, ['position', 'role', 'jobTitle', 'direction'])
  const years = yearsText(firstText(ext, ['yearsOfExp', 'experienceYears', 'workYears']))
  const anonymous = anonymousText(ext)
  return {
    card: {
      tone: 'career' as const,
      chips: compactChips([
        chip(anonymous, 'career'),
        chip(company, 'career'),
        chip(position, 'career'),
        chip(years, 'career'),
      ], 4),
    },
    detail: {
      tone: 'career' as const,
      title: '职场经验信息',
      description: '聚合公司、岗位方向、工作年限和匿名标识，方便判断经验适配度。',
      items: compactItems([
        item('匿名标识', anonymous),
        item('公司', company),
        item('公司规模', companySize),
        item('岗位方向', position),
        item('工作年限', years),
      ]),
      chips: compactChips([chip(anonymous, 'career'), chip(companySize, 'career'), chip(position, 'career')], 6),
      images: imageList(post, ext),
    },
  }
}

const buildReading = (post: Post) => {
  const ext = extensionOf(post)
  const bookName = firstText(ext, ['bookName', 'bookTitle', 'titleOfBook'])
  const author = firstText(ext, ['bookAuthor', 'authorName', 'author'])
  const readingTime = firstText(ext, ['readingTime', 'readingDuration', 'duration'])
  const rating = ratingText(firstText(ext, ['rating', 'score', 'bookRating']))
  return {
    card: {
      tone: 'reading' as const,
      chips: compactChips([
        chip(bookName, 'reading'),
        chip(author, 'reading'),
        chip(readingTime, 'reading'),
        chip(rating, 'reading'),
      ], 4),
    },
    detail: {
      tone: 'reading' as const,
      title: '阅读记录',
      description: '保留书名、作者、阅读时长和评分，让读书笔记更容易被复用。',
      items: compactItems([
        item('书名', bookName),
        item('作者', author),
        item('阅读时长', readingTime),
        item('评分', rating),
      ]),
      chips: compactChips([chip(bookName, 'reading'), chip(author, 'reading'), chip(rating, 'reading')], 6),
      images: imageList(post, ext),
    },
  }
}

const buildLifestyle = (post: Post) => {
  const ext = extensionOf(post)
  const images = imageList(post, ext)
  const topic = firstText(ext, ['topic', 'scene', 'scenario', 'activity'])
  const location = firstText(ext, ['location', 'city', 'place'])
  const mood = firstText(ext, ['mood', 'feeling'])
  return {
    card: {
      tone: 'lifestyle' as const,
      chips: compactChips([chip(topic, 'lifestyle'), chip(location, 'lifestyle'), chip(mood, 'lifestyle')], 4),
      imageUrl: images[0],
      imageAlt: post.title,
    },
    detail: {
      tone: 'lifestyle' as const,
      title: '生活图文信息',
      description: '生活内容优先展示图片墙，同时保留地点、场景和状态线索。',
      items: compactItems([
        item('主题', topic),
        item('地点', location),
        item('状态', mood),
      ]),
      chips: compactChips([chip(topic, 'lifestyle'), chip(location, 'lifestyle'), chip(mood, 'lifestyle')], 6),
      images,
    },
  }
}

const buildInvestment = (post: Post) => {
  const ext = extensionOf(post)
  const investmentType = firstText(ext, ['investmentType', 'assetType', 'financeType', 'productType'])
  const riskLevel = firstText(ext, ['riskLevel', 'risk', 'riskGrade'])
  const horizon = firstText(ext, ['horizon', 'holdingPeriod', 'period'])
  const riskNotice = firstText(ext, ['riskNotice', 'riskDisclaimer', 'disclaimer'])
  return {
    card: {
      tone: 'investment' as const,
      chips: compactChips([
        chip(investmentType, 'investment'),
        chip(riskLevel, 'investment'),
        chip(horizon, 'investment'),
      ], 4),
    },
    detail: {
      tone: 'investment' as const,
      title: '投资理财信息',
      description: '突出投资类型、风险等级和风险提示，帮助读者先判断适配性。',
      items: compactItems([
        item('投资类型', investmentType),
        item('风险等级', riskLevel),
        item('周期', horizon),
      ]),
      chips: compactChips([chip(investmentType, 'investment'), chip(riskLevel, 'investment')], 6),
      images: imageList(post, ext),
      riskNotice,
    },
  }
}

const buildSurface = (post: Post) => {
  switch (post.domain) {
    case DOMAIN.CAREER:
      return buildCareer(post)
    case DOMAIN.READING:
      return buildReading(post)
    case DOMAIN.LIFESTYLE:
      return buildLifestyle(post)
    case DOMAIN.INVESTMENT:
      return buildInvestment(post)
    case DOMAIN.TECH:
    default:
      return buildTech(post)
  }
}

export const buildDomainCardSurface = (post: Post): DomainCardSurface => buildSurface(post).card

export const buildDomainDetailSurface = (post: Post): DomainDetailSurface | null => {
  const detail = buildSurface(post).detail
  return hasContent(detail) ? detail : null
}
