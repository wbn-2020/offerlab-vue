import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'

export type CollaborationResourceKind =
  | 'need'
  | 'series'
  | 'activity'
  | 'discussion'
  | 'office-hour'

export type CollaborationHubTab =
  | 'needs'
  | 'my-collaborations'
  | 'series'
  | 'activities'
  | 'curation'
  | 'discussions'
  | 'office-hours'
  | 'manage'
  | 'cases'

export type CollaborationHubSort = 'latest' | 'updated' | 'LATEST' | 'UPDATED' | 'STALLED_FIRST'

export interface CollaborationHubQueryState {
  tab: CollaborationHubTab
  domain: number | ''
  status: string
  sort: CollaborationHubSort | ''
  needId: string
  seriesId: string
  activityId: string
  discussionId: string
  officeHourId: string
  reservationId: string
}

const HUB_TABS: readonly CollaborationHubTab[] = [
  'needs',
  'my-collaborations',
  'series',
  'activities',
  'curation',
  'discussions',
  'office-hours',
  'manage',
  'cases',
]

const RESOURCE_SEGMENTS: Record<CollaborationResourceKind, string> = {
  need: 'needs',
  series: 'series',
  activity: 'activities',
  discussion: 'discussions',
  'office-hour': 'office-hours',
}

const LEGACY_RESOURCE_QUERY: Array<{
  tab: CollaborationHubTab
  queryKey: keyof Pick<CollaborationHubQueryState, 'needId' | 'seriesId' | 'activityId' | 'discussionId' | 'officeHourId'>
  resource: CollaborationResourceKind
}> = [
  { tab: 'needs', queryKey: 'needId', resource: 'need' },
  { tab: 'series', queryKey: 'seriesId', resource: 'series' },
  { tab: 'activities', queryKey: 'activityId', resource: 'activity' },
  { tab: 'discussions', queryKey: 'discussionId', resource: 'discussion' },
  { tab: 'office-hours', queryKey: 'officeHourId', resource: 'office-hour' },
]

const KNOWN_STATUSES = new Set([
  'OPEN',
  'CLAIMED',
  'SUBMITTED',
  'COMPLETED',
  'CLOSED',
  'MERGED',
  'DRAFT',
  'REVIEWING',
  'SUMMARIZED',
  'ARCHIVED',
  'CANCELLED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ALL',
])

const firstQueryValue = (value: LocationQuery[string] | undefined) => (
  Array.isArray(value) ? value[0] || '' : value || ''
)

export const isPositiveCollaborationId = (value: unknown): value is string => (
  /^[1-9]\d*$/.test(String(value ?? '').trim())
)

export const normalizeCollaborationId = (value: unknown) => {
  const normalized = String(value ?? '').trim()
  return isPositiveCollaborationId(normalized) ? normalized : ''
}

export const collaborationResourcePath = (
  resource: CollaborationResourceKind,
  id: unknown,
) => {
  const normalizedId = normalizeCollaborationId(id)
  if (!normalizedId) return null
  return `/collaboration/${RESOURCE_SEGMENTS[resource]}/${encodeURIComponent(normalizedId)}`
}

export const collaborationHubPath = () => '/collaboration'

export const collaborationHubLocation = (
  tab: CollaborationHubTab,
): RouteLocationRaw => ({
  path: collaborationHubPath(),
  query: { tab },
})

export const collaborationHubResourceLocation = (
  resource: Exclude<CollaborationResourceKind, 'need'>,
  id: unknown,
): RouteLocationRaw | null => {
  const normalizedId = normalizeCollaborationId(id)
  if (!normalizedId) return null
  const tab = resource === 'series'
    ? 'series'
    : resource === 'activity'
      ? 'activities'
      : resource === 'discussion'
        ? 'discussions'
        : 'office-hours'
  const queryKey = resource === 'series'
    ? 'seriesId'
    : resource === 'activity'
      ? 'activityId'
      : resource === 'discussion'
        ? 'discussionId'
        : 'officeHourId'
  return {
    path: collaborationHubPath(),
    query: { tab, [queryKey]: normalizedId },
  }
}

export const parseCollaborationHubQuery = (query: LocationQuery): CollaborationHubQueryState => {
  const rawTab = firstQueryValue(query.tab)
  const rawDomain = firstQueryValue(query.domain)
  const rawStatus = firstQueryValue(query.status)
  const rawSort = firstQueryValue(query.sort)

  return {
    tab: HUB_TABS.includes(rawTab as CollaborationHubTab) ? rawTab as CollaborationHubTab : 'needs',
    domain: isPositiveCollaborationId(rawDomain) ? Number(rawDomain) : '',
    status: KNOWN_STATUSES.has(rawStatus) ? rawStatus : '',
    sort: (
      rawSort === 'latest'
      || rawSort === 'updated'
      || rawSort === 'LATEST'
      || rawSort === 'UPDATED'
      || rawSort === 'STALLED_FIRST'
    ) ? rawSort as CollaborationHubSort : '',
    needId: normalizeCollaborationId(firstQueryValue(query.needId)),
    seriesId: normalizeCollaborationId(firstQueryValue(query.seriesId)),
    activityId: normalizeCollaborationId(firstQueryValue(query.activityId)),
    discussionId: normalizeCollaborationId(firstQueryValue(query.discussionId)),
    officeHourId: normalizeCollaborationId(firstQueryValue(query.officeHourId)),
    reservationId: normalizeCollaborationId(firstQueryValue(query.reservationId)),
  }
}

export const buildCollaborationHubQuery = (
  state: Partial<CollaborationHubQueryState> & Pick<CollaborationHubQueryState, 'tab'>,
): LocationQueryRaw => {
  const query: LocationQueryRaw = { tab: state.tab }
  const domain = state.domain === '' || state.domain == null ? '' : String(state.domain)
  const status = String(state.status || '').trim()
  const sort = state.sort || ''
  const needId = normalizeCollaborationId(state.needId)
  const seriesId = normalizeCollaborationId(state.seriesId)
  const activityId = normalizeCollaborationId(state.activityId)
  const discussionId = normalizeCollaborationId(state.discussionId)
  const officeHourId = normalizeCollaborationId(state.officeHourId)
  const reservationId = normalizeCollaborationId(state.reservationId)

  if (isPositiveCollaborationId(domain)) query.domain = domain
  if (KNOWN_STATUSES.has(status)) query.status = status
  if (
    sort === 'latest'
    || sort === 'updated'
    || sort === 'LATEST'
    || sort === 'UPDATED'
    || sort === 'STALLED_FIRST'
  ) query.sort = sort
  if (needId) query.needId = needId
  if (seriesId) query.seriesId = seriesId
  if (activityId) query.activityId = activityId
  if (discussionId) query.discussionId = discussionId
  if (officeHourId) query.officeHourId = officeHourId
  if (officeHourId && reservationId) query.reservationId = reservationId
  return query
}

export const legacyCollaborationDetailPath = (query: LocationQuery) => {
  if (normalizeCollaborationId(firstQueryValue(query.reservationId))) return null
  const requestedTab = firstQueryValue(query.tab)
  for (const candidate of LEGACY_RESOURCE_QUERY) {
    if (requestedTab && requestedTab !== candidate.tab) continue
    const path = collaborationResourcePath(candidate.resource, firstQueryValue(query[candidate.queryKey]))
    if (path) return path
  }
  return null
}

export const collaborationHubQueryFromState = (
  state: CollaborationHubQueryState,
): LocationQueryRaw => buildCollaborationHubQuery(state)
