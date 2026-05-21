import type { User } from './types'

export function adaptUser(raw: any): User {
  return {
    uid: Number(raw?.uid ?? raw?.id ?? 0),
    email: raw?.email,
    nickname: raw?.nickname ?? '',
    avatar: raw?.avatar ?? raw?.avatarUrl ?? '',
    signature: raw?.signature ?? raw?.bio ?? '',
    createdAt: Number(raw?.createdAt ?? raw?.createTime ?? Date.now()),
    isFollowing: raw?.isFollowing ?? false,
    isBigV: raw?.isBigV ?? false,
    followerCount: Number(raw?.followerCount ?? 0),
    followingCount: Number(raw?.followingCount ?? 0),
    postCount: Number(raw?.postCount ?? 0),
  }
}
