import client, { type Result } from './client'
import type { ApiId, KnowledgeRelationEdge, KnowledgeRelationGraph, KnowledgeRelationNode } from './types'

export interface KnowledgeExploreQuery {
  postId?: ApiId
  tagId?: ApiId
  topicId?: ApiId
  domain?: number
  seriesId?: ApiId
  limit?: number
}

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const adaptNode = (raw: any): KnowledgeRelationNode => ({
  key: safeText(raw?.key),
  type: safeText(raw?.type),
  label: safeText(raw?.label),
  domain: raw?.domain == null ? undefined : toNumber(raw.domain),
})

const adaptEdge = (raw: any): KnowledgeRelationEdge => ({
  source: safeText(raw?.source),
  target: safeText(raw?.target),
  relation: safeText(raw?.relation),
  weight: toNumber(raw?.weight, 1),
})

const adaptGraph = (raw: any): KnowledgeRelationGraph => ({
  limit: toNumber(raw?.limit, 8),
  nodes: Array.isArray(raw?.nodes) ? raw.nodes.map(adaptNode) : [],
  edges: Array.isArray(raw?.edges) ? raw.edges.map(adaptEdge) : [],
})

export const knowledgeApi = {
  explore: async (query: KnowledgeExploreQuery): Promise<Result<KnowledgeRelationGraph>> => {
    const res = await client.get('/api/v1/knowledge/relations', {
      params: query,
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptGraph(res.data) : null,
    }
  },
}
