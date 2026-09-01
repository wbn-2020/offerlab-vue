<template>
  <section id="creator-challenges" class="creator-challenge-panel" aria-label="创作者挑战">
    <header class="creator-challenge-header">
      <div>
        <div class="creator-challenge-title">
          <Trophy class="h-5 w-5" />
          <h2>创作者挑战</h2>
        </div>
        <p>自愿加入后，选择一篇在挑战周期内发布的本人公开内容完成挑战。</p>
      </div>
      <button
        type="button"
        class="icon-button"
        title="刷新创作者挑战"
        :disabled="loading || busyKey !== ''"
        @click="loadWorkspace"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <p v-if="workspace?.boundaryCopy" class="creator-challenge-boundary">
      <ShieldCheck class="h-4 w-4" />
      {{ workspace.boundaryCopy }}
    </p>

    <div v-if="loading" class="creator-challenge-state" role="status">
      <Loader2 class="h-4 w-4 animate-spin" />
      正在加载挑战…
    </div>
    <div v-else-if="error" class="creator-challenge-state creator-challenge-error" role="alert">
      <span>{{ error }}</span>
      <button type="button" class="secondary-button compact" @click="loadWorkspace">重试</button>
    </div>

    <template v-else>
      <div v-if="challenges.length" class="creator-challenge-list">
        <article v-for="challenge in challenges" :key="String(challenge.id)" class="creator-challenge-card">
          <div class="creator-challenge-card-head">
            <div class="min-w-0">
              <div class="creator-challenge-card-title">
                <h3>{{ challenge.title }}</h3>
                <span :class="['challenge-status', `challenge-status-${challengeStatusClass(challenge)}`]">
                  {{ challengeStatusLabel(challenge) }}
                </span>
              </div>
              <p>{{ challenge.description }}</p>
            </div>
            <span class="challenge-code">{{ challenge.challengeCode }}</span>
          </div>

          <dl class="creator-challenge-meta">
            <div>
              <dt>挑战周期</dt>
              <dd>{{ formatDateTime(challenge.startsAt) }} 至 {{ formatDateTime(challenge.endsAt) }}</dd>
            </div>
            <div>
              <dt>内容范围</dt>
              <dd>{{ contentScope(challenge) }}</dd>
            </div>
          </dl>

          <div v-if="challenge.participationStatus === 'COMPLETED'" class="creator-challenge-completed">
            <CheckCircle2 class="h-4 w-4" />
            <span>已完成</span>
            <RouterLink
              v-if="challenge.completedPostId != null"
              :to="`/post/${challenge.completedPostId}`"
              class="creator-challenge-inline-link"
            >
              查看公开内容
            </RouterLink>
          </div>

          <div v-else-if="challenge.participationStatus === 'WITHDRAWN'" class="creator-challenge-muted">
            已退出该挑战。退出后不会自动重新加入。
          </div>

          <div v-else-if="challenge.participationStatus === 'JOINED'" class="creator-challenge-workflow">
            <RouterLink :to="editorRoute(challenge)" class="secondary-button compact">
              <FileEdit class="h-4 w-4" />
              开始写作
            </RouterLink>
            <button
              type="button"
              class="text-action danger-action"
              :disabled="isBusy(challenge, 'withdraw')"
              @click="withdraw(challenge)"
            >
              <Loader2 v-if="isBusy(challenge, 'withdraw')" class="h-4 w-4 animate-spin" />
              <Undo2 v-else class="h-4 w-4" />
              退出挑战
            </button>

            <div class="creator-challenge-completion">
              <label>
                <span>选择已发布的公开内容</span>
                <select v-model="selectedPostIds[String(challenge.id)]" :disabled="isBusy(challenge, 'complete')">
                  <option value="">请选择本人符合范围的公开内容</option>
                  <option
                    v-for="post in challenge.eligiblePosts || []"
                    :key="String(post.postId)"
                    :value="String(post.postId)"
                  >
                    {{ post.title || `公开内容 #${post.postId}` }}
                  </option>
                </select>
              </label>
              <button
                type="button"
                class="primary-button compact"
                :disabled="!canComplete(challenge)"
                @click="complete(challenge)"
              >
                <Loader2 v-if="isBusy(challenge, 'complete')" class="h-4 w-4 animate-spin" />
                <CheckCircle2 v-else class="h-4 w-4" />
                确认完成
              </button>
            </div>
            <p v-if="!(challenge.eligiblePosts || []).length" class="creator-challenge-muted">
              当前没有符合范围的公开内容。发布后刷新此处，再由你主动选择完成。
            </p>
          </div>

          <div v-else class="creator-challenge-workflow">
            <button
              v-if="isActive(challenge)"
              type="button"
              class="primary-button compact"
              :disabled="isBusy(challenge, 'join')"
              @click="join(challenge)"
            >
              <Loader2 v-if="isBusy(challenge, 'join')" class="h-4 w-4 animate-spin" />
              <PlusCircle v-else class="h-4 w-4" />
              自愿加入
            </button>
            <p v-else class="creator-challenge-muted">{{ inactiveChallengeCopy(challenge) }}</p>
          </div>
        </article>
      </div>
      <div v-else class="creator-challenge-state">
        <Clock3 class="h-4 w-4" />
        暂无可参与的创作者挑战。新的公开创作主题发布后会在这里出现。
      </div>

      <section class="creator-badge-section" aria-label="我的贡献徽章">
        <div class="creator-badge-heading">
          <div>
            <h3><Award class="h-4 w-4" />我的贡献徽章</h3>
            <p>仅记录已完成的公开创作挑战，不代表认证、排名、收益或额外权益。</p>
          </div>
          <span>{{ badges.length }} 枚</span>
        </div>
        <div v-if="badges.length" class="creator-badge-list">
          <article v-for="badge in badges" :key="badge.badgeCode" class="creator-badge-card">
            <Award class="h-5 w-5" />
            <div>
              <strong>{{ badge.title }}</strong>
              <p>{{ badge.description }}</p>
              <small>{{ badge.requiredCompletedChallengeCount }} 个不同挑战 · {{ formatDateTime(badge.awardedAt) }}</small>
            </div>
          </article>
        </div>
        <p v-else class="creator-challenge-muted">完成第一个不同的公开创作挑战后，会在这里显示事实性贡献记录。</p>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Award,
  CheckCircle2,
  PlusCircle,
  Clock3,
  FileEdit,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Undo2,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import {
  creatorChallengesApi,
  type CreatorChallenge,
  type CreatorChallengeBadge,
  type CreatorChallengeWorkspace,
} from '@/api/creatorChallenges'
import { getContentTypeShortLabel } from '@/utils/contentTypes'
import { getDomainLabelSafe } from '@/utils/domains'

const workspace = ref<CreatorChallengeWorkspace | null>(null)
const loading = ref(false)
const error = ref('')
const busyKey = ref('')
const selectedPostIds = reactive<Record<string, string>>({})

const challenges = computed(() => Array.isArray(workspace.value?.challenges) ? workspace.value.challenges : [])
const badges = computed<CreatorChallengeBadge[]>(() => Array.isArray(workspace.value?.badges) ? workspace.value.badges : [])

const timestampOf = (value?: string | null) => {
  if (!value) return Number.NaN
  return Date.parse(String(value).replace(' ', 'T'))
}

const formatDateTime = (value?: string | null) => {
  const timestamp = timestampOf(value)
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
    : '时间未返回'
}

const isActive = (challenge: CreatorChallenge) => {
  const now = Date.now()
  const startsAt = timestampOf(challenge.startsAt)
  const endsAt = timestampOf(challenge.endsAt)
  return challenge.status === 'PUBLISHED'
    && Number.isFinite(startsAt)
    && Number.isFinite(endsAt)
    && startsAt <= now
    && now < endsAt
}

const challengeStatusLabel = (challenge: CreatorChallenge) => {
  if (challenge.participationStatus === 'COMPLETED') return '已完成'
  if (challenge.participationStatus === 'WITHDRAWN') return '已退出'
  if (isActive(challenge)) return challenge.participationStatus === 'JOINED' ? '进行中' : '可加入'
  if (challenge.status === 'DRAFT') return '草稿'
  if (challenge.status === 'OFFLINE') return '已下线'
  const startsAt = timestampOf(challenge.startsAt)
  const endsAt = timestampOf(challenge.endsAt)
  if (Number.isFinite(startsAt) && Date.now() < startsAt) return '即将开始'
  if (Number.isFinite(endsAt) && Date.now() >= endsAt) return '已结束'
  return challenge.status || '未开放'
}

const challengeStatusClass = (challenge: CreatorChallenge) => {
  const label = challengeStatusLabel(challenge)
  if (label === '已完成' || label === '进行中' || label === '可加入') return 'ok'
  if (label === '即将开始') return 'pending'
  return 'muted'
}

const contentScope = (challenge: CreatorChallenge) => {
  const parts = [
    challenge.domain == null ? '' : getDomainLabelSafe(challenge.domain),
    challenge.postType == null ? '' : getContentTypeShortLabel(challenge.postType),
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '任意公开内容类型'
}

const inactiveChallengeCopy = (challenge: CreatorChallenge) => {
  const label = challengeStatusLabel(challenge)
  if (label === '即将开始') return '挑战尚未开始，开始后可由你主动加入。'
  if (label === '已结束') return '挑战周期已结束，不能再加入或完成。'
  if (label === '已下线') return '该挑战已停止开放，不影响已完成的事实记录。'
  return '挑战当前不开放加入。'
}

const actionKey = (challenge: CreatorChallenge, action: string) => `${action}:${challenge.id}`
const isBusy = (challenge: CreatorChallenge, action: string) => busyKey.value === actionKey(challenge, action)

const canComplete = (challenge: CreatorChallenge) => (
  !busyKey.value
  && Boolean(selectedPostIds[String(challenge.id)])
  && isActive(challenge)
  && challenge.participationStatus === 'JOINED'
)

const editorRoute = (challenge: CreatorChallenge) => ({
  path: '/editor',
  query: {
    source: 'creator_challenge',
    action: 'template',
    contextType: 'template',
    contextSource: 'creator_challenge',
    challengeId: String(challenge.id),
    ...(challenge.domain == null ? {} : { domain: String(challenge.domain) }),
    ...(challenge.postType == null ? {} : { postType: String(challenge.postType) }),
    ...(challenge.assistTemplateCode ? { templateCode: challenge.assistTemplateCode } : {}),
    returnHref: '/me#creator-challenges',
  },
})

const normalizeWorkspace = (data: CreatorChallengeWorkspace | null | undefined): CreatorChallengeWorkspace => ({
  challenges: Array.isArray(data?.challenges) ? data.challenges : [],
  badges: Array.isArray(data?.badges) ? data.badges : [],
  boundaryCopy: data?.boundaryCopy || '',
})

const loadWorkspace = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await creatorChallengesApi.getWorkspace()
    workspace.value = normalizeWorkspace(response.data)
    const eligibleChallengeIds = new Set(
      workspace.value.challenges.map((challenge) => String(challenge.id)),
    )
    Object.keys(selectedPostIds).forEach((challengeId) => {
      if (!eligibleChallengeIds.has(challengeId)) delete selectedPostIds[challengeId]
    })
  } catch (requestError) {
    error.value = getErrorMessage(requestError, '创作者挑战加载失败')
  } finally {
    loading.value = false
  }
}

const runAction = async (
  challenge: CreatorChallenge,
  action: 'join' | 'withdraw' | 'complete',
  task: () => Promise<void>,
  success: string,
) => {
  if (busyKey.value) return
  busyKey.value = actionKey(challenge, action)
  try {
    await task()
    await loadWorkspace()
    toast.success(success)
  } catch (requestError) {
    toast.error(getErrorMessage(requestError, '创作者挑战操作失败'))
  } finally {
    busyKey.value = ''
  }
}

const join = (challenge: CreatorChallenge) => runAction(
  challenge,
  'join',
  async () => { await creatorChallengesApi.join(challenge.id) },
  '已加入挑战；发布后请回到这里主动选择公开内容完成。',
)

const withdraw = (challenge: CreatorChallenge) => runAction(
  challenge,
  'withdraw',
  async () => { await creatorChallengesApi.withdraw(challenge.id) },
  '已退出挑战。',
)

const complete = (challenge: CreatorChallenge) => {
  const postId = selectedPostIds[String(challenge.id)]
  if (!postId) return
  return runAction(
    challenge,
    'complete',
    async () => {
      const response = await creatorChallengesApi.complete(challenge.id, postId)
      const badgesAwarded = response.data?.newlyAwardedBadges?.length || 0
      if (badgesAwarded > 0) {
        toast.success(`挑战已完成，并新增 ${badgesAwarded} 枚贡献徽章。`)
      }
    },
    '挑战已完成。',
  )
}

onMounted(loadWorkspace)
</script>

<style scoped>
.creator-challenge-panel {
  border: 1px solid rgb(169 216 195);
  background: rgb(248 252 255);
  padding: 1.25rem;
}

.creator-challenge-header,
.creator-challenge-card-head,
.creator-challenge-card-title,
.creator-challenge-workflow,
.creator-challenge-completed,
.creator-badge-heading,
.creator-badge-card {
  display: flex;
  gap: 0.75rem;
}

.creator-challenge-header,
.creator-challenge-card-head,
.creator-badge-heading {
  align-items: flex-start;
  justify-content: space-between;
}

.creator-challenge-title,
.creator-badge-heading h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.creator-challenge-title {
  color: rgb(10 52 39);
}

.creator-challenge-title h2,
.creator-badge-heading h3,
.creator-challenge-card h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.creator-challenge-header p,
.creator-challenge-card p,
.creator-badge-heading p,
.creator-badge-card p,
.creator-challenge-muted {
  margin: 0.35rem 0 0;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.55;
}

.creator-challenge-boundary {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 1rem 0 0;
  color: rgb(18 99 74);
  font-size: 0.78rem;
  line-height: 1.55;
}

.creator-challenge-state {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 4.25rem;
  margin-top: 1rem;
  border: 1px dashed rgb(169 216 195);
  padding: 0.9rem;
  color: var(--text-primary);
  font-size: 0.84rem;
}

.creator-challenge-error {
  justify-content: space-between;
  border-color: rgb(253 186 116);
  color: rgb(154 52 18);
}

.creator-challenge-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.creator-challenge-card {
  border: 1px solid var(--border-subtle);
  background: rgb(255 255 255);
  padding: 1rem;
}

.creator-challenge-card-title {
  align-items: center;
  flex-wrap: wrap;
}

.challenge-status,
.challenge-code {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  border: 1px solid var(--border-subtle);
  padding: 0.1rem 0.45rem;
  color: var(--text-primary);
  font-size: 0.7rem;
  font-weight: 800;
}

.challenge-status-ok {
  border-color: rgb(134 239 172);
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.challenge-status-pending {
  border-color: rgb(169 216 195);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.challenge-status-muted,
.challenge-code {
  background: var(--surface-soft);
}

.challenge-code {
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-challenge-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0.9rem 0;
}

.creator-challenge-meta div {
  min-width: 0;
}

.creator-challenge-meta dt {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.creator-challenge-meta dd {
  margin: 0.2rem 0 0;
  color: var(--text-strong);
  font-size: 0.78rem;
  line-height: 1.45;
}

.creator-challenge-workflow {
  align-items: center;
  flex-wrap: wrap;
}

.creator-challenge-completed {
  align-items: center;
  color: rgb(22 101 52);
  font-size: 0.8rem;
  font-weight: 800;
}

.creator-challenge-inline-link,
.text-action {
  border: 0;
  background: transparent;
  color: rgb(18 99 74);
  font-size: 0.78rem;
  font-weight: 800;
}

.text-action {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 2.25rem;
  cursor: pointer;
}

.text-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.danger-action {
  color: rgb(190 24 93);
}

.creator-challenge-completion {
  display: flex;
  align-items: end;
  flex: 1 1 28rem;
  gap: 0.65rem;
  min-width: min(100%, 18rem);
}

.creator-challenge-completion label {
  display: grid;
  flex: 1;
  gap: 0.3rem;
  min-width: 0;
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 800;
}

.creator-challenge-completion select {
  width: 100%;
  min-height: 2.4rem;
  border: 1px solid var(--border-subtle);
  background: rgb(255 255 255);
  padding: 0.4rem 0.55rem;
  color: var(--text-strong);
  font-size: 0.82rem;
}

.creator-badge-section {
  margin-top: 1rem;
  border-top: 1px solid rgb(169 216 195);
  padding-top: 1rem;
}

.creator-badge-heading > span {
  color: rgb(18 99 74);
  font-size: 0.78rem;
  font-weight: 900;
}

.creator-badge-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  margin-top: 0.8rem;
}

.creator-badge-card {
  align-items: flex-start;
  border: 1px solid rgb(169 216 195);
  background: rgb(232 243 237);
  padding: 0.75rem;
  color: rgb(18 99 74);
}

.creator-badge-card strong {
  display: block;
  color: rgb(10 52 39);
  font-size: 0.84rem;
}

.creator-badge-card small {
  display: block;
  margin-top: 0.4rem;
  color: var(--text-primary);
  font-size: 0.72rem;
}

.dark .creator-challenge-panel {
  border-color: rgb(26 127 90);
  background: rgb(7 31 24);
}

.dark .creator-challenge-card,
.dark .creator-challenge-completion select {
  border-color: rgb(14 74 55);
  background: var(--surface-1);
}

.dark .creator-challenge-title,
.dark .creator-challenge-card h3,
.dark .creator-badge-heading h3,
.dark .creator-badge-card strong {
  color: rgb(205 232 220);
}

.dark .creator-challenge-header p,
.dark .creator-challenge-card p,
.dark .creator-badge-heading p,
.dark .creator-badge-card p,
.dark .creator-challenge-muted,
.dark .creator-challenge-meta dd,
.dark .creator-challenge-completion label,
.dark .creator-challenge-completion select {
  color: var(--text-muted);
}

.dark .challenge-status-muted,
.dark .challenge-code {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .creator-badge-card {
  border-color: rgb(18 99 74);
  background: rgb(7 31 24);
}

@media (max-width: 640px) {
  .creator-challenge-meta,
  .creator-badge-list {
    grid-template-columns: 1fr;
  }

  .creator-challenge-completion {
    align-items: stretch;
    flex-direction: column;
  }

  .challenge-code {
    max-width: 100%;
  }
}
</style>
