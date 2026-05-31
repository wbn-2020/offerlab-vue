import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')
const postCard = readFileSync(resolve(sourceRoot, 'components/post/PostCard.vue'), 'utf8')
const home = readFileSync(resolve(sourceRoot, 'views/HomeView.vue'), 'utf8')
const search = readFileSync(resolve(sourceRoot, 'views/SearchView.vue'), 'utf8')
const tagDetail = readFileSync(resolve(sourceRoot, 'views/TagDetailView.vue'), 'utf8')
const meProfile = readFileSync(resolve(sourceRoot, 'views/MeProfileView.vue'), 'utf8')

const failures = []

if (/props\.post\.author\.isFollowing\s*=/.test(postCard)) {
  failures.push('PostCard must not mutate props.post.author.isFollowing directly')
}

if (!postCard.includes("'follow-change'")) {
  failures.push('PostCard must emit follow-change after follow/unfollow succeeds')
}

if (!postCard.includes("emit('follow-change', props.post.author.uid, false)")
  || !postCard.includes("emit('follow-change', props.post.author.uid, true)")) {
  failures.push('PostCard must emit both follow and unfollow state changes')
}

for (const [name, text] of [
  ['HomeView.vue', home],
  ['SearchView.vue', search],
  ['TagDetailView.vue', tagDetail],
  ['MeProfileView.vue', meProfile],
]) {
  if (!text.includes('@follow-change="handlePostAuthorFollowChange"') && !text.includes('onFollowChange')) {
    failures.push(`${name} must listen for PostCard follow-change and sync parent state`)
  }
  if (!text.includes('handlePostAuthorFollowChange')) {
    failures.push(`${name} must define handlePostAuthorFollowChange`)
  }
}

if (failures.length > 0) {
  console.error('post card follow-state guard failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('post card follow-state guard passed')
