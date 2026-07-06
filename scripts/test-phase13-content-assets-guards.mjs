import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const interactionApi = source('../src/api/interaction.ts')
const contentSeriesApi = source('../src/api/contentSeries.ts')
const postApi = source('../src/api/post.ts')
const adapters = source('../src/api/adapters.ts')
const postCard = source('../src/components/post/PostCard.vue')
const organizer = source('../src/components/post/PostSaveOrganizer.vue')
const demoSeeds = source('../src/data/demoSeeds.ts')
const demoContentListsBlock = demoSeeds.match(/export const demoContentLists[\s\S]*?\n]\n/)?.[0] || ''

assert.match(interactionApi, /favoriteToReadLater/, 'favorite API must keep one-click save and expose a read-later organization result')
assert.match(interactionApi, /server_favorite_only|local_demo_only/, 'favorite organization must disclose that list organization is not cross-device sync')
assert.match(postApi, /getMyUnorganizedFavorites/, 'post API must expose the unorganized favorites/read-later entry')

assert.match(adapters, /ContentListVisibility\s*=\s*'public'\s*\|\s*'private'/, 'content lists must model public/private visibility')
assert.match(adapters, /isPublicAssetPostVisible/, 'public content-list assets must use a governance visibility filter')
assert.match(adapters, /discoverable:\s*visibility\s*===\s*'public'/, 'only public content lists may be discoverable')
assert.match(adapters, /searchable:\s*visibility\s*===\s*'public'/, 'private lists must not be marked searchable')

assert.match(contentSeriesApi, /isPublicContentSeriesAssetVisible/, 'public content series assets must expose a governance guard')
assert.match(contentSeriesApi, /filter\(isPublicContentSeriesAssetVisible\)/, 'public series listings must be filtered before display')

assert.match(postCard, /PostSaveOrganizer/, 'post cards must expose a lightweight save organization entry')
assert.match(organizer, /稍后读/, 'save organizer must expose the read-later default')
assert.match(organizer, /未整理收藏/, 'save organizer must expose unorganized favorites')
assert.match(organizer, /本机整理入口|不会跨设备同步/, 'fallback UI must disclose local-only organization boundary')
assert.match(organizer, /公开|私密/, 'save organizer must express public/private visibility')
assert.doesNotMatch(organizer, /课程|会员|订阅|付费|广告|收益|专家|权威|专业背书|CodeCoachAI/, 'save organizer must not introduce commercial or professional endorsement wording')

assert.match(demoContentListsBlock, /demoContentLists/, 'demo seeds must include lightweight content-list examples')
assert.match(demoContentListsBlock, /local_demo_only/, 'demo content lists must disclose demo/local-only source')
assert.doesNotMatch(demoContentListsBlock, /课程|会员|订阅|付费|广告|收益|CodeCoachAI/, 'demo content lists must not introduce forbidden commercialization wording')

console.log('phase13 content asset guards passed')
