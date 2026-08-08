import client, { type Result } from './client'
import type { ApiId } from './types'

export type CreatorChallengeStatus = 'DRAFT' | 'PUBLISHED' | 'OFFLINE' | string
export type CreatorChallengeParticipationStatus = 'JOINED' | 'COMPLETED' | 'WITHDRAWN' | string

export interface CreatorChallengeEligiblePost {
  postId: ApiId
  title: string
  domain?: number | null
  postType?: number | null
  publishedAt?: string | null
}

export interface CreatorChallenge {
  id: ApiId
  challengeCode: string
  title: string
  description: string
  domain?: number | null
  postType?: number | null
  assistTemplateCode?: string | null
  status: CreatorChallengeStatus
  startsAt: string
  endsAt: string
  participationStatus?: CreatorChallengeParticipationStatus | null
  joinedAt?: string | null
  completedAt?: string | null
  completedPostId?: ApiId | null
  eligiblePosts?: CreatorChallengeEligiblePost[]
}

export interface CreatorChallengeBadge {
  badgeCode: string
  title: string
  description: string
  requiredCompletedChallengeCount: number
  awardedAt?: string | null
  boundaryCopy?: string | null
}

export interface CreatorChallengeWorkspace {
  challenges: CreatorChallenge[]
  badges: CreatorChallengeBadge[]
  boundaryCopy?: string | null
}

export interface CreatorChallengeCompletionResult {
  challenge: CreatorChallenge
  newlyAwardedBadges: CreatorChallengeBadge[]
  replayed: boolean
}

export interface CreatorChallengeAdminCommand {
  id?: ApiId
  challengeCode: string
  title: string
  description: string
  domain?: number | null
  postType?: number | null
  assistTemplateCode?: string | null
  startsAt: string
  endsAt: string
  reason: string
}

export interface CreatorChallengeAdminActionCommand {
  reason: string
}

export const creatorChallengesApi = {
  getWorkspace: (): Promise<Result<CreatorChallengeWorkspace>> =>
    client.get('/api/v1/creator-growth/challenges/workspace'),

  join: (challengeId: ApiId): Promise<Result<CreatorChallenge>> =>
    client.post(`/api/v1/creator-growth/challenges/${challengeId}/join`),

  withdraw: (challengeId: ApiId): Promise<Result<CreatorChallenge>> =>
    client.post(`/api/v1/creator-growth/challenges/${challengeId}/withdraw`),

  complete: (
    challengeId: ApiId,
    postId: ApiId,
  ): Promise<Result<CreatorChallengeCompletionResult>> =>
    client.post(`/api/v1/creator-growth/challenges/${challengeId}/complete`, { postId }),

  listAdminChallenges: (): Promise<Result<CreatorChallenge[]>> =>
    client.get('/api/v1/creator-growth/admin/challenges'),

  upsert: (command: CreatorChallengeAdminCommand): Promise<Result<CreatorChallenge>> =>
    client.post('/api/v1/creator-growth/admin/challenges', command),

  publish: (
    challengeId: ApiId,
    command: CreatorChallengeAdminActionCommand,
  ): Promise<Result<CreatorChallenge>> =>
    client.post(`/api/v1/creator-growth/admin/challenges/${challengeId}/publish`, command),

  offline: (
    challengeId: ApiId,
    command: CreatorChallengeAdminActionCommand,
  ): Promise<Result<CreatorChallenge>> =>
    client.post(`/api/v1/creator-growth/admin/challenges/${challengeId}/offline`, command),
}
