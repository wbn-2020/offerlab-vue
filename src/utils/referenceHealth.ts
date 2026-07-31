import type { PostReference } from '@/api/postReferences'

// 引用健康度：对「作者自报的来源状态」的如实汇总。
// 硬约束：绝不表述为「平台已验证/链接可达」。这里没有任何 URL 探活，
// BROKEN 只来自作者手动维护，健康度纯由客户端对已拉取列表计算。
export type ReferenceHealthTone = 'none' | 'maintained' | 'attention'

export interface ReferenceHealthSummary {
  total: number // 全部来源条数
  active: number // 作者维护为有效（非 BROKEN）的条数
  broken: number // referenceStatus === 'BROKEN'
  oldestConfirmedAt: string | null // 有效行里最早的 lastConfirmedAt（ISO），无则 null
  tone: ReferenceHealthTone // none=无来源 / maintained=无失效 / attention=存在失效
}

// 状态语义标签：替代裸串 ACTIVE/BROKEN，使 BROKEN 不以颜色为唯一信息载体。
// 措辞只描述「作者维护的状态」，不声称平台核实过链接。
export const referenceStatusLabel = (status?: string | null): string =>
  status === 'BROKEN' ? '已标记失效' : '有效（作者维护）'

export const summarizeReferenceHealth = (items: PostReference[]): ReferenceHealthSummary => {
  const list = Array.isArray(items) ? items : []
  let active = 0
  let broken = 0
  let oldestConfirmedAt: string | null = null
  for (const item of list) {
    if (item?.referenceStatus === 'BROKEN') {
      broken += 1
      continue
    }
    // 只有 ACTIVE/BROKEN 两态，非 BROKEN 即作者维护为有效
    active += 1
    const confirmedAt = item?.lastConfirmedAt
    if (confirmedAt && (oldestConfirmedAt === null || confirmedAt < oldestConfirmedAt)) {
      oldestConfirmedAt = confirmedAt
    }
  }
  const total = list.length
  let tone: ReferenceHealthTone
  if (total === 0) {
    tone = 'none'
  } else if (broken > 0) {
    tone = 'attention'
  } else {
    tone = 'maintained'
  }
  return { total, active, broken, oldestConfirmedAt, tone }
}
