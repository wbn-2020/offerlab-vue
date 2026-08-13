const publicContentCountPattern = /^\s*(\d+)\s+public\s+posts?\s*$/i

const knowledgeCopyByNormalizedText = new Map<string, string>([
  ['from public post', '来自公开帖子'],
  ['from public tag', '来自公开标签'],
  ['from public topic', '来自公开话题'],
  ['from public content series', '来自公开内容合集'],
  ['from search discovery entry', '来自公开搜索结果'],
  ['aggregated search entry indicates public coverage demand.', '公开搜索结果显示该主题仍有内容补充需求。'],
  ['curated public topic', '公开话题运营整理'],
  ['curated public content', '公开内容运营整理'],
  ['curated from public content', '来自公开内容的运营整理'],
  ['public content query fallback', '来自公开内容的补充结果'],
  ['public reading path generated from public asset relations', '根据公开内容关系生成的阅读建议'],
  ['public reading suggestion organized from public asset relations.', '根据公开内容关系整理的阅读建议。'],
  ['public knowledge path', '公开内容阅读路径'],
  ['public knowledge gap', '公开内容待补方向'],
  ['public content coverage is incomplete.', '当前公开内容覆盖仍不完整。'],
  ['stable public knowledge projection', '公开内容关系整理结果'],
  ['built at request time from currently visible public content.', '根据当前可见的公开内容即时整理。'],
  ['untitled knowledge asset', '未命名公开内容'],
  ['untitled step', '未命名阅读步骤'],
  ['relation explanation is unavailable.', '暂无更多关系说明。'],
  ['relation source is missing or unrecognized.', '关系来源暂不明确。'],
  ['relation review state is missing or unrecognized.', '关系核对状态暂不明确。'],
  ['dynamic graph connection; review and source evidence were not provided.', '这是待核对的关联建议，暂缺完整来源依据。'],
  ['graph edges do not carry review or source evidence.', '当前关联建议暂缺核对和来源依据。'],
])

const normalizedText = (value: unknown): string => (
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
)

export const formatPublicContentCount = (value: unknown): string => {
  const count = Number(value)
  const normalized = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0
  return `${new Intl.NumberFormat('zh-CN').format(normalized)} 篇公开内容`
}

export const formatPublicContentCountText = (
  value: unknown,
  fallback = '正在讨论',
): string => {
  const text = normalizedText(value)
  if (!text) return fallback
  const match = text.match(publicContentCountPattern)
  return match ? formatPublicContentCount(match[1]) : text
}

export const localizePublicCopy = (
  value: unknown,
  fallback = '暂无更多说明。',
): string => {
  const text = normalizedText(value)
  if (!text) return fallback

  const localized = knowledgeCopyByNormalizedText.get(text.toLocaleLowerCase())
  if (localized) return localized

  const countMatch = text.match(publicContentCountPattern)
  if (countMatch) return formatPublicContentCount(countMatch[1])

  return text
    .replace(/^from public post\b[:：]?\s*/i, '来自公开帖子：')
    .replace(/^from public tag\b[:：]?\s*/i, '来自公开标签：')
    .replace(/^from public topic\b[:：]?\s*/i, '来自公开话题：')
    .replace(/^from public content series\b[:：]?\s*/i, '来自公开内容合集：')
    .replace(/^from search discovery entry\b[:：]?\s*/i, '来自公开搜索结果：')
}

export const localizeKnowledgeCopy = localizePublicCopy
