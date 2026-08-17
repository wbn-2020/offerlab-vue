import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expectMatch = (source, pattern, message) => assert.match(source, pattern, message)
const expectText = (source, text, message) => assert.ok(source.includes(text), message)

const register = read('src/views/RegisterView.vue')
const search = read('src/views/SearchView.vue')
const topic = read('src/views/TopicDetailView.vue')
const explore = read('src/views/ExploreView.vue')
const me = read('src/views/MeProfileView.vue')
const creatorFeedback = read('src/api/creatorFeedback.ts')
const questions = read('src/views/QuestionsView.vue')
const editor = read('src/views/EditorView.vue')
const maintenance = read('src/composables/useParticipationHub.ts')
const tagDetail = read('src/views/TagDetailView.vue')
const home = read('src/views/HomeView.vue')
const authApi = read('src/api/auth.ts')
const authStore = read('src/stores/auth.ts')

expectText(register, '<form class="space-y-4" novalidate', 'registration must own all validation states')
for (const field of ['nickname', 'email', 'password', 'confirmPassword']) {
  expectText(register, `aria-invalid="Boolean(errors.${field})"`, `${field} must expose aria-invalid`)
  const errorId = field === 'confirmPassword' ? 'register-confirm-password-error' : `register-${field}-error`
  expectText(register, errorId, `${field} must expose aria-describedby`)
}
expectText(register, 'superRefine', 'registration must report password confirmation independently')
expectText(register, 'await focusFirstInvalidField()', 'registration must focus the first invalid field after rendering all errors')

expectText(search, 'class="mobile-search-disclosure"', 'mobile search controls must be collapsible')
expectText(search, 'class="mobile-result-summary"', 'mobile search must show the result summary before the result list')
expectText(search, '{{ item.postCount ?? 0 }} 篇', 'tag search must display public post count')
expectText(search, 'const appliedQuery', 'search results must be tied to the submitted query snapshot')
expectText(search, 'const advancedFiltersOpen', 'advanced filters must have an explicit open state')

expectText(home, '{{ authStore.user.postCount ?? 0 }}', 'home profile count must use the hydrated current-user summary')
expectText(authApi, "client.get('/api/v1/users/me'", 'authentication hydration must load the shared current-user summary')
expectText(authStore, 'user.value = me.data', 'session hydration must replace the home user summary with the current /me response')

expectText(topic, 'const isDisplayCountPending', 'topic count must remain unknown while metadata is loading')
expectText(topic, "isDisplayCountPending.value ? '读取中'", 'topic must not render a determined zero during loading')
expectText(topic, 'topic.value?.virtualTopic', 'topic detail must retain the virtual topic contract')
expectText(topic, 'postApi.resolveTopic(slug)', 'unknown topics must use the non-404 resolver contract')
expectText(topic, 'v-if="topicReady" class="identity-banner"', 'topic identity must wait for a resolved topic')

expectMatch(explore, /hasItems[\s\S]*当前没有可展示的公开内容/, 'explore must distinguish empty content from a healthy populated state')
expectText(explore, '部分入口仍在恢复中', 'explore empty degraded copy must stay truthful')
expectMatch(explore, /error && !hasItems[\s\S]*state-banner-error[\s\S]*@click="reload"/, 'explore failures must remain isolated with a retry action')
expectText(explore, 'ModuleEmpty', 'explore modules must keep independent empty/degraded states')

assert.doesNotMatch(me, />继续发布</, 'the personal profile must not duplicate the continue-publishing CTA')
expectMatch(me, /管理公开内容|查看全部内容/, 'the personal profile must keep one focused content-management action')
assert.doesNotMatch(me, /Profile display only, not platform endorsement or commercial placement\./, 'the profile must not render the legacy English boundary copy')
expectText(creatorFeedback, 'adaptRepresentativeBoundaryCopy', 'creator feedback must normalize legacy boundary copy')
expectText(creatorFeedback, '仅用于作者主页展示，不代表平台背书或商业推荐。', 'legacy representative copy must normalize to Chinese')
expectText(maintenance, '维护任务暂时无法读取', 'maintenance degradation must expose a user-facing error state')
expectText(maintenance, '其他个人主页功能不受影响', 'maintenance failure must not blank the whole profile')

expectText(questions, 'LoadingSkeleton', 'knowledge base must expose loading state')
expectText(questions, 'listError', 'knowledge base must expose request failure state')
expectText(questions, '知识库加载失败', 'knowledge base failure must be explicit')
expectText(questions, '当前还没有可见题目', 'knowledge base must distinguish a real empty state')
expectText(questions, '@click="fetchQuestions(false)"', 'knowledge base failure must offer retry')

expectText(editor, 'const railQualityChecks', 'editor rail must derive the complete blocking checklist')
expectText(editor, 'blockingQualityIssues.value.length', 'editor must prioritize all blocking checks')
expectText(editor, '@click="focusQualityCheck(item.key)"', 'editor blocking checks must be actionable')
assert.doesNotMatch(editor, /qualityChecks\.slice\(0,\s*5\)/, 'editor must not hide blocking checks after five items')

expectText(tagDetail, 'postCount', 'tag detail must consume the public post-count field')

console.log('OfferLab 2026-08-17 frontend acceptance guard passed.')
