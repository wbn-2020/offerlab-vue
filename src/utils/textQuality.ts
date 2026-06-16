export const MOJIBAKE_VISIBLE_TEXT = /[\uFFFD\u00C3\u00C2\u00E6\u93C3\u7481\u752F\u93BF\u9410\u7487\u9359\u5BB8\u93C6\u93C8\u951B\u9427\u6769\u7459\u93BB\u9286\u9225]/
const LATIN1_MOJIBAKE_SEQUENCE = /(?:\u00C2[\u0080-\u00BF]|\u00C3[\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3})/

export const isLowQualityVisibleText = (value: string) => {
  if (!value) return false
  if (/[\u0000-\u001F\u007F]/.test(value) || LATIN1_MOJIBAKE_SEQUENCE.test(value) || MOJIBAKE_VISIBLE_TEXT.test(value)) return true
  const compact = value.replace(/\s+/g, '')
  const questionMarks = (compact.match(/\?/g) || []).length
  return questionMarks >= 2 && questionMarks / Math.max(compact.length, 1) >= 0.35
}

export const sanitizeVisibleText = (value: unknown, fallback = '') => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!normalized || isLowQualityVisibleText(normalized)) return fallback
  return normalized
}

export const safeVisibleText = (value: unknown, fallback = '内容编码异常，已隐藏原文') => {
  return sanitizeVisibleText(value, fallback)
}

export const hasLowQualityVisibleText = (values: unknown[]) => {
  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .some(isLowQualityVisibleText)
}

export const filterVisibleTexts = (values: unknown, limit = 12) => {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  return values
    .map((value) => sanitizeVisibleText(value))
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
    .slice(0, limit)
}

const SYNTHETIC_VISIBLE_TEXT = /(E2E|SMOKE|CODEX|TESTDATA|NoSuchOfferLabKeyword|AuroraIndexerProbe|OfferLab\s+review|OfferLab\s+demo|backend\s+probe|synthetic|mock-data|fixture|demo\s+account|demo\s+user|NebulaTech|测试数据|示例数据|编码异常)/i
const GENERATED_ID_TITLE = /\b(?:review|probe|keyword|topic|post)\s*[-_#:]?\s*(?:17\d{10,}|\d{12,})\b/i
const SYNTHETIC_PROBE_VISIBLE_TEXT = /(RealCheck|ReviewActor|OrionInterview|qingce)/i
const SYNTHETIC_CHINESE_TEST_TEXT = /(\u94FE\u8DEF\u6D4B\u8BD5|\u6D4B\u8BD5\u516C\u5F00|\u516C\u5F00\u7528\u6237\u8D44\u6599|\u672A\u547D\u540D\u6807\u7B7E)/i
const GENERATED_TRAILING_ID = /(?:^|[\s:：_-])(?:17\d{10,}|\d{12,})(?:$|\b)/
const INTERNAL_TASK_TEXT = /\b(outbox|traceId|fallback|retry task|search index retry|notification retry|rebuild task)\b/i

export const isSyntheticVisibleText = (value: unknown) => {
  const text = String(value ?? '').trim()
  if (!text) return false
  return SYNTHETIC_VISIBLE_TEXT.test(text)
    || GENERATED_ID_TITLE.test(text)
    || SYNTHETIC_PROBE_VISIBLE_TEXT.test(text)
    || SYNTHETIC_CHINESE_TEST_TEXT.test(text)
    || GENERATED_TRAILING_ID.test(text)
    || INTERNAL_TASK_TEXT.test(text)
}

export const sanitizePublicVisibleText = (value: unknown, fallback = '') => {
  const normalized = sanitizeVisibleText(value, '')
  if (!normalized || isSyntheticVisibleText(normalized)) return fallback
  return normalized
}

export const safePublicVisibleText = (value: unknown, fallback = '内容暂不可展示') => {
  return sanitizePublicVisibleText(value, fallback)
}

export const isPublicContentVisible = (item: any) => {
  const title = item?.title ?? item?.questionText ?? item?.summary ?? item?.name ?? ''
  const summary = item?.summary ?? item?.content ?? item?.answerDraft ?? item?.starStory ?? ''
  const extension = item?.extension || {}
  const tagNames = Array.isArray(item?.tags) ? item.tags.map((tag: any) => tag?.name ?? tag?.tagName ?? tag) : []
  const visibleValues = [
    title,
    summary,
    item?.company,
    item?.position,
    item?.targetCompany,
    item?.targetPosition,
    item?.focusTag,
    item?.companySnapshot,
    item?.positionSnapshot,
    item?.questionTextSnapshot,
    item?.answerHintSnapshot,
    item?.roundSnapshot,
    item?.qualityReason,
    item?.sourceSnippet,
    item?.recentViolationSummary,
    item?.signature,
    extension?.company,
    extension?.position,
    extension?.scenario,
    ...(Array.isArray(extension?.techStacks) ? extension.techStacks : []),
    ...tagNames,
  ]
  if (visibleValues.some((value) => isLowQualityVisibleText(String(value ?? '')))) return false
  if (visibleValues.some(isSyntheticVisibleText)) return false
  const authorName = item?.author?.nickname ?? item?.nickname ?? ''
  if (isSyntheticVisibleText(authorName)) return false
  return true
}

export const filterPublicContent = <T>(items: T[] | undefined | null, limit?: number) => {
  const filtered = (items || []).filter(isPublicContentVisible)
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
}
