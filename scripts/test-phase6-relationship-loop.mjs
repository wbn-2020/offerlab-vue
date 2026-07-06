import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const userCard = read('src/components/user/UserCard.vue')
const meProfile = read('src/views/MeProfileView.vue')
const home = read('src/views/HomeView.vue')
const userProfile = read('src/views/UserProfileView.vue')
const topicDetail = read('src/views/TopicDetailView.vue')
const search = read('src/views/SearchView.vue')
const explore = read('src/views/ExploreView.vue')

assert.match(userCard, /defineEmits/, 'UserCard must emit follow changes to parent lists')
assert.match(userCard, /'follow-change': \[uid: User\['uid'\], following: boolean, followerCount: number\]/, 'UserCard follow-change payload must include uid, state, and follower count')
assert.match(userCard, /emit\('follow-change', props\.user\.uid, isFollowing\.value, followerCount\.value\)/, 'UserCard must emit after successful follow updates')

assert.match(meProfile, /@follow-change="handleFollowingUserChange"/, 'my following list must react to UserCard follow changes')
assert.match(meProfile, /@follow-change="handleFollowerUserChange"/, 'my followers list must react to UserCard follow changes')
assert.match(meProfile, /syncUserFollowState/, 'my profile must sync follow state across visible relation lists and posts')
assert.match(meProfile, /following\.items = following\.items\.filter/, 'unfollowing from my following list must remove the user locally')
assert.match(meProfile, /adjustMyRelationCount\('followingCount', -1\)/, 'unfollowing must update my following count locally')
assert.match(meProfile, /to: `\/topics\/\$\{topic\.slug\}`/, 'followed topic cards must revisit the topic detail page')

assert.match(home, /useQueryClient/, 'home must be able to invalidate cached following feed data')
assert.match(home, /invalidateQueries\(\{ queryKey: \['feed', 'following'\] \}\)/, 'following feed cache must be invalidated after author follow changes')
assert.match(home, /handlePostAuthorFollowChange/, 'home must sync post author follow changes across visible cards')
assert.match(search, /handlePostAuthorFollowChange/, 'search must sync post author follow changes across visible cards')
assert.match(explore, /toggleFollowUser/, 'explore recommended authors must keep follow actions available')
assert.match(topicDetail, /handlePostAuthorFollowChange/, 'topic detail must sync post author follow changes across visible cards')
assert.match(userProfile, /isFollowBusy/, 'public author profile follow button must have a busy guard')
assert.match(userProfile, /followerCount: Math\.max\(0, Number\(user\.value\.followerCount \?\? 0\)/, 'public author profile must update follower count locally')

console.log('phase6 relationship loop guard passed')
