import assert from 'node:assert/strict'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { ref } from 'vue'

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const listFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolutePath = path.join(directory, entry.name)
  if (entry.isDirectory()) return listFiles(absolutePath)
  return [absolutePath]
})

const userAvatar = read('src/components/user/UserAvatar.vue')
const avatarRequestState = read('src/components/user/useAvatarRequestState.ts')
const appHeader = read('src/components/layout/AppHeader.vue')
const postCard = read('src/components/post/PostCard.vue')
const userCard = read('src/components/user/UserCard.vue')
const userBadge = read('src/components/user/UserBadge.vue')
const commentTree = read('src/components/post/CommentTree.vue')
const homeView = read('src/views/HomeView.vue')
const postDetailView = read('src/views/PostDetailView.vue')
const searchView = read('src/views/SearchView.vue')
const meProfileView = read('src/views/MeProfileView.vue')
const adminGovernanceView = read('src/views/AdminGovernanceView.vue')
const settingsView = read('src/views/SettingsView.vue')
const userProfileView = read('src/views/UserProfileView.vue')
const demoSeeds = read('src/data/demoSeeds.ts')
const textQualityGate = read('scripts/test-text-quality-gate.mjs')
const pkg = JSON.parse(read('package.json'))

assert.match(userAvatar, /class="user-avatar__fallback"/, 'UserAvatar must always render a local fallback')
assert.match(userAvatar, /v-if="shouldLoadImage"/, 'UserAvatar must stop rendering a failed image source')
assert.match(userAvatar, /@load="handleImageLoad"/, 'UserAvatar must reveal images only after a successful load')
assert.match(userAvatar, /@error="handleImageError"/, 'UserAvatar must handle remote image failures')
assert.match(userAvatar, /referrerpolicy="no-referrer"/, 'UserAvatar must not leak page referrers to remote avatar hosts')
assert.match(userAvatar, /alt\?: string \| null/, 'UserAvatar must accept nullable API alt values')
assert.match(userAvatar, /resolveAvatarAccessibleLabel\(props\.alt, props\.name\)/, 'UserAvatar must centralize nullable alt handling')
assert.match(userAvatar, /useAvatarRequestState\(computed\(\(\) => props\.src\)\)/, 'UserAvatar must use the tested request state machine')
assert.match(avatarRequestState, /const requestGeneration = ref\(0\)/, 'avatar state must version image requests')
assert.match(userAvatar, /:data-avatar-request="requestKey"/, 'UserAvatar must bind each image event to its request generation')
assert.match(avatarRequestState, /attempt !== requestKey\.value/, 'avatar state must ignore stale image events')
assert.match(avatarRequestState, /failedRequest\.value = attempt/, 'avatar state must remember the failed request')
assert.match(avatarRequestState, /watch\(normalizedSrc,[\s\S]*requestGeneration\.value \+= 1/, 'avatar state must advance the request generation when the source changes')
assert.match(avatarRequestState, /watch\(normalizedSrc,[\s\S]*failedRequest\.value = ''/, 'avatar state must retry when the source changes')
assert.match(userAvatar, /\.user-avatar__image\s*\{[\s\S]*opacity: 0;/, 'UserAvatar must hide images before load succeeds')
assert.match(userAvatar, /\.user-avatar__image--loaded\s*\{[\s\S]*opacity: 1;/, 'UserAvatar must reveal only loaded images')
assert.match(
  userAvatar,
  /\.user-avatar__fallback,\s*\.user-avatar__image\s*\{[\s\S]*inset: 0;[\s\S]*width: 100%;[\s\S]*height: 100%;/,
  'UserAvatar image and fallback layers must keep identical dimensions',
)
const fallbackIndex = userAvatar.indexOf('class="user-avatar__fallback"')
const imageIndex = userAvatar.indexOf('<img')
assert.ok(fallbackIndex >= 0, 'UserAvatar must retain its fallback element')
assert.ok(imageIndex >= 0, 'UserAvatar must retain its remote image element')
assert.ok(fallbackIndex < imageIndex, 'UserAvatar fallback must exist underneath the remote image')

for (const [label, source, minimumMounts] of [
  ['AppHeader', appHeader, 1],
  ['PostCard', postCard, 1],
  ['UserCard', userCard, 1],
  ['UserBadge', userBadge, 1],
  ['CommentTree', commentTree, 2],
  ['HomeView', homeView, 2],
  ['PostDetailView', postDetailView, 4],
  ['SearchView', searchView, 1],
  ['MeProfileView', meProfileView, 1],
  ['AdminGovernanceView', adminGovernanceView, 1],
  ['SettingsView', settingsView, 1],
  ['UserProfileView', userProfileView, 1],
]) {
  assert.match(source, /import UserAvatar from '@\/components\/user\/UserAvatar\.vue'/, `${label} must import UserAvatar`)
  const mountCount = source.match(/<UserAvatar\b/g)?.length || 0
  assert.ok(mountCount >= minimumMounts, `${label} must mount UserAvatar at every guarded avatar entry`)
  assert.doesNotMatch(source, /<img[^>]*(?:\.avatar|avatarUrl|\bavatar\b)/i, `${label} must not render a user avatar with a raw img`)
}

for (const [label, source, minimumDecorativeMounts] of [
  ['AppHeader', appHeader, 1],
  ['PostCard', postCard, 1],
  ['UserCard', userCard, 1],
  ['UserBadge', userBadge, 1],
  ['CommentTree', commentTree, 2],
  ['HomeView', homeView, 2],
  ['PostDetailView', postDetailView, 4],
  ['SearchView', searchView, 1],
  ['MeProfileView', meProfileView, 1],
  ['AdminGovernanceView', adminGovernanceView, 1],
  ['UserProfileView', userProfileView, 1],
]) {
  const decorativeMountCount = source.match(/<UserAvatar\b[^>]*\balt=""/g)?.length || 0
  assert.ok(
    decorativeMountCount >= minimumDecorativeMounts,
    `${label} avatars beside visible user names must be decorative`,
  )
}

assert.doesNotMatch(userCard, /via\.placeholder\.com/, 'UserCard must use the local fallback instead of a remote placeholder')
assert.match(settingsView, /头像预览/, 'SettingsView must keep an accessible name for the standalone avatar preview')
assert.match(
  userProfileView,
  /:src="user\.profileVisible === false \? '' : user\.avatar"/,
  'restricted public profiles must not request the hidden user avatar',
)

for (const vueFile of listFiles(path.join(repositoryRoot, 'src')).filter(file => file.endsWith('.vue'))) {
  const source = readFileSync(vueFile, 'utf8')
  for (const imageTag of source.match(/<img\b[\s\S]*?>/gi) || []) {
    assert.doesNotMatch(
      imageTag,
      /(?::src|v-bind:src)\s*=\s*["'][^"']*(?:avatar|avatarUrl|avatar_url)[^"']*["']/i,
      `${path.relative(repositoryRoot, vueFile)} must render user avatars through UserAvatar`,
    )
  }
}

assert.match(appHeader, /\.community-header__avatar\s*\{[\s\S]*width: 44px;/, 'AppHeader avatar control must keep a stable width')
assert.match(postCard, /\.post-author-avatar\s*\{[\s\S]*width: 2\.45rem;[\s\S]*height: 2\.45rem;/, 'PostCard avatar must keep fixed dimensions')
assert.match(userCard, /class="[^"]*\bh-16\b[^"]*\bw-16\b/, 'UserCard avatar must keep fixed dimensions')
assert.match(homeView, /\.home-profile-avatar\s*\{[\s\S]*width: 2\.8rem;[\s\S]*height: 2\.8rem;/, 'Home profile avatar must keep fixed dimensions')
assert.match(homeView, /\.home-author-avatar\s*\{[\s\S]*width: 2rem;[\s\S]*height: 2rem;/, 'Home author avatars must keep fixed dimensions')

const knownFrontendDemoSeedMojibake = /\u93C1\u677F\u74E7\u9422\u71B8\u693F\u6434\u65C0\u20AC\u30E5\u5BD8\u5A13\u546D\u5D1F/
const knownFrontendDemoSeedSample = String.fromCharCode(
  0x93C1, 0x677F, 0x74E7, 0x9422, 0x71B8, 0x693F, 0x6434,
  0x65C0, 0x20AC, 0x30E5, 0x5BD8, 0x5A13, 0x546D, 0x5D1F,
)
assert.match(knownFrontendDemoSeedSample, knownFrontendDemoSeedMojibake, 'V22 guard must recognize the known frontend demo seed mojibake sample')
assert.doesNotMatch(demoSeeds, knownFrontendDemoSeedMojibake, 'frontend demoSeeds must not contain the known mojibake sample')
assert.match(textQualityGate, /'src\/data'/, 'the shared text quality gate must scan frontend data sources')
assert.match(textQualityGate, /KNOWN_FRONTEND_DEMO_SEED_MOJIBAKE/, 'the shared text quality gate must retain the known demo seed regression detector')

assert.equal(
  pkg.scripts?.['test:v22-runtime-reliability'],
  'node scripts/test-v22-runtime-reliability.mjs',
  'package.json must expose the V22 runtime reliability guard',
)
assert.match(
  pkg.scripts?.['pretest:guards'] || '',
  /npm run test:v22-runtime-reliability/,
  'pretest:guards must include the V22 runtime reliability guard',
)

const avatarStateCacheRoot = path.join(repositoryRoot, 'node_modules', '.cache')
mkdirSync(avatarStateCacheRoot, { recursive: true })
const avatarStateTestDirectory = mkdtempSync(path.join(avatarStateCacheRoot, 'offerlab-v22-avatar-'))
try {
  const transpiledAvatarState = ts.transpileModule(avatarRequestState, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: 'useAvatarRequestState.ts',
  }).outputText
  const avatarStateModulePath = path.join(avatarStateTestDirectory, 'useAvatarRequestState.mjs')
  writeFileSync(avatarStateModulePath, transpiledAvatarState, 'utf8')
  const {
    resolveAvatarAccessibleLabel,
    resolveAvatarFallback,
    useAvatarRequestState,
  } = await import(pathToFileURL(avatarStateModulePath).href)

  const source = ref('https://avatars.example/a.png')
  const state = useAvatarRequestState(source)
  const firstARequest = state.requestKey.value
  assert.equal(state.avatarState.value, 'loading')
  assert.equal(state.acceptLoad(firstARequest), true)
  assert.equal(state.avatarState.value, 'loaded')

  source.value = 'https://avatars.example/b.png'
  const bRequest = state.requestKey.value
  assert.notEqual(bRequest, firstARequest)
  assert.equal(state.acceptLoad(firstARequest), false, 'late A load must not affect B')
  assert.equal(state.acceptError(firstARequest), false, 'late A error must not affect B')
  assert.equal(state.avatarState.value, 'loading')
  assert.equal(state.acceptError(bRequest), true)
  assert.equal(state.avatarState.value, 'error')
  assert.equal(state.shouldLoadImage.value, false)

  source.value = 'https://avatars.example/a.png'
  const secondARequest = state.requestKey.value
  assert.notEqual(secondARequest, firstARequest, 'A-B-A must create a new request generation')
  assert.equal(state.acceptLoad(firstARequest), false, 'late first A load must not affect second A')
  assert.equal(state.acceptLoad(secondARequest), true)
  assert.equal(state.avatarState.value, 'loaded')

  source.value = null
  assert.equal(state.avatarState.value, 'empty')
  assert.equal(state.shouldLoadImage.value, false)
  assert.equal(resolveAvatarAccessibleLabel(undefined, 'Ada'), 'Ada的头像')
  assert.equal(resolveAvatarAccessibleLabel(null, 'Ada'), 'Ada的头像')
  assert.equal(resolveAvatarAccessibleLabel('', 'Ada'), '')
  assert.equal(resolveAvatarAccessibleLabel(undefined, null), '用户头像')
  assert.equal(resolveAvatarFallback('闻野', '?'), '闻')
  assert.equal(resolveAvatarFallback('', 'O'), 'O')
} finally {
  rmSync(avatarStateTestDirectory, { recursive: true, force: true })
}

console.log('V22 runtime reliability guard passed')
