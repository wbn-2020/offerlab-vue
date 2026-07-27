import { isKnownDomain } from './domains'

// 跨频道策展的频道构成：对「已拉取的 section items」的如实汇总。
// 硬约束：纯客户端计数，零请求；未知域帖如实计入 unknownCount，
// 绝不把未分类内容兜底进任何具体频道（频道明确红线，沿用 FIX-D 口径）。
export interface DomainCompositionEntry {
  domain: number // 已知频道值（过 isKnownDomain）
  count: number
}

export interface CurationDomainComposition {
  total: number // 参与统计的条目总数
  byDomain: DomainCompositionEntry[] // 已知频道计数，按 count 降序、同数按 domain 升序稳定排列
  unknownCount: number // 无频道归属（null/未知值）的条目数，如实呈现
}

export interface DomainCarryingItem {
  post?: { domain?: number | null } | null
}

export const summarizeCurationDomains = (
  items: DomainCarryingItem[],
): CurationDomainComposition => {
  const list = Array.isArray(items) ? items : []
  const counts = new Map<number, number>()
  let unknownCount = 0
  for (const item of list) {
    const domain = item?.post?.domain
    if (isKnownDomain(domain)) {
      const value = Number(domain)
      counts.set(value, (counts.get(value) ?? 0) + 1)
    } else {
      unknownCount += 1
    }
  }
  const byDomain = [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => (b.count - a.count) || (a.domain - b.domain))
  return { total: list.length, byDomain, unknownCount }
}
