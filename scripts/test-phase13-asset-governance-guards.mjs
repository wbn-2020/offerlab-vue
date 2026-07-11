import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const adapters = read('src/api/adapters.ts')
const contentSeriesApi = read('src/api/contentSeries.ts')

has(adapters, /export type ContentListVisibility\s*=\s*'public'\s*\|\s*'private'/, 'content-list assets must model public/private visibility.')
has(adapters, /export interface ContentListSummary/, 'adapters must expose the content-list asset structure.')
has(adapters, /export type ContentListAsset\s*=\s*ContentListSummary/, 'adapters must preserve the content-list asset contract alias.')
has(adapters, /export const isPublicAssetPostVisible[\s\S]*isPublicPostVisible/, 'content-list item visibility must reuse the shared public post governance filter.')
has(adapters, /export const isPublicContentListVisible[\s\S]*isPublicCollectionVisible/, 'content lists must reuse the shared public collection governance filter.')
has(adapters, /items:\s*items\.filter\(isPublicAssetPostVisible\)/, 'public content-list assets must filter every item before display.')
has(adapters, /ownerVisible:\s*visibility\s*===\s*'private'\s*\|\|\s*visibility\s*===\s*'public'/, 'private lists may only stay visible through owner-scoped views.')

for (const flag of ['discoverable', 'searchable', 'recommendable', 'rankable', 'operable']) {
  has(
    adapters,
    new RegExp(`${flag}:\\s*visibility\\s*===\\s*'public'\\s*&&\\s*isPublicContentListVisible`),
    `private lists must not be ${flag} by search/recommendation/ranking/ops entry points.`,
  )
}

has(adapters, /neutralizeHighRiskAssetEntryCopy/, 'high-risk asset entries must pass through neutral copy normalization.')
has(adapters, /ASSET_ENTRY_BLOCKED_COPY_PATTERNS[\s\S]*权威[\s\S]*专家[\s\S]*专业建议[\s\S]*认证资料库/, 'asset entry copy guard must block authority, expert, professional-advice, and certification-database wording.')
has(adapters, /ASSET_ENTRY_BLOCKED_COPY_PATTERNS[\s\S]*支付[\s\S]*会员[\s\S]*订阅[\s\S]*课程[\s\S]*广告[\s\S]*收益[\s\S]*CodeCoachAI/, 'asset entry copy guard must block payment, membership, subscription, course, ad, revenue, and CodeCoachAI drift.')

has(contentSeriesApi, /export const isPublicContentSeriesAssetVisible[\s\S]*isPublicCollectionVisible/, 'public content-series records must reuse the shared collection governance filter.')
has(contentSeriesApi, /export const isPublicContentSeriesPostVisible[\s\S]*isPublicPostVisible/, 'public content-series posts must reuse the shared post governance filter.')
has(contentSeriesApi, /listPublicByUser[\s\S]*filter\(isPublicContentSeriesAssetVisible\)/, 'public user series listings must be filtered before display.')
has(contentSeriesApi, /getPublicDetail[\s\S]*isPublicContentSeriesAssetVisible/, 'public series detail must fail closed for private or restricted series.')
has(contentSeriesApi, /listPublicPosts[\s\S]*filter\(isPublicContentSeriesPostVisible\)/, 'public series posts must be filtered before display.')
has(contentSeriesApi, /visibility:\s*'public'/, 'public content-series guard must require public visibility.')

for (const [name, source] of [
  ['adapters.ts', adapters],
  ['contentSeries.ts', contentSeriesApi],
]) {
  missing(source, /paidExposure|membershipAsset|subscriptionAsset|courseAsset|adSlot|sponsorSlot|revenueShare|commercialKnowledgeBase|privateTraining/i, `${name} must not introduce monetization or private-training asset surfaces.`)
}

console.log('Phase 13 asset governance guards passed.')
