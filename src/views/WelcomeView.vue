<template>
  <div class="welcome-page">
    <main class="welcome-shell">
      <header class="welcome-brand">
        <RouterLink to="/" class="welcome-brand-mark" aria-label="返回闻野首页">闻</RouterLink>
        <div>
          <strong>{{ siteBrand.displayName }}</strong>
          <span>真实经验和有用见闻的综合社区</span>
        </div>
      </header>

      <section class="welcome-surface">
        <div class="welcome-intro">
          <p>欢迎加入 {{ siteBrand.displayName }}</p>
          <h1>先选几个感兴趣的方向</h1>
          <span>
            用来给你的首页推荐更贴近的内容。之后随时能在设置里调整，也可以先跳过。
          </span>
        </div>

        <div class="welcome-sections">
          <section class="welcome-section">
            <div class="welcome-section-heading">
              <h2>感兴趣的频道</h2>
              <small>{{ selectedTopics.length }} 项已选择</small>
            </div>
            <div class="welcome-options">
              <button
                v-for="topic in topicOptions"
                :key="topic"
                type="button"
                class="welcome-chip"
                :class="{ 'welcome-chip--active': selectedTopics.includes(topic) }"
                :aria-pressed="selectedTopics.includes(topic)"
                @click="toggle(selectedTopics, topic)"
              >
                {{ topic }}
              </button>
            </div>
          </section>

          <section class="welcome-section">
            <div class="welcome-section-heading">
              <h2>想多看的内容类型</h2>
              <small>{{ selectedTags.length }} 项已选择</small>
            </div>
            <div class="welcome-options">
              <button
                v-for="tag in tagOptions"
                :key="tag"
                type="button"
                class="welcome-chip"
                :class="{ 'welcome-chip--active': selectedTags.includes(tag) }"
                :aria-pressed="selectedTags.includes(tag)"
                @click="toggle(selectedTags, tag)"
              >
                {{ tag }}
              </button>
            </div>
          </section>
        </div>

        <div class="welcome-actions">
          <button
            type="button"
            class="welcome-primary"
            :disabled="isSaving"
            @click="saveAndContinue"
          >
            {{ isSaving ? '保存中...' : (hasSelection ? '开始逛社区' : '先随便逛逛') }}
          </button>
          <button
            type="button"
            class="welcome-skip"
            :disabled="isSaving"
            @click="skip"
          >
            跳过，稍后再说
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { userApi } from '@/api/user'
import { getErrorMessage } from '@/api/client'
import { safeRedirect } from '@/utils/navigation'
import { siteBrand } from '@/utils/brand'
import { DOMAIN_OPTIONS } from '@/utils/domains'
import { useAuthStore } from '@/stores/auth'
import { clearWelcomeOnboarding } from '@/utils/welcomeOnboarding'
import type { IntentReq } from '@/api/user'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 频道用真实频道目录名，内容标签复用兴趣设置里的标签选项，保持口径一致。
const topicOptions = DOMAIN_OPTIONS.map((d) => d.label)
const tagOptions = ['经验复盘', '避坑指南', '清单推荐', '工具分享', '深度讨论', '新手友好']

const selectedTopics = ref<string[]>([])
const selectedTags = ref<string[]>([])
const isSaving = ref(false)

interface WelcomeOperationOwner {
  uid: string
  sessionGeneration: number
}

class WelcomeOperationSupersededError extends Error {
  constructor() {
    super('欢迎引导操作已被新的登录会话替代')
    this.name = 'WelcomeOperationSupersededError'
  }
}

const captureWelcomeOperationOwner = (): WelcomeOperationOwner => {
  const uid = authStore.user?.uid
  if (!authStore.isLoggedIn || uid == null) {
    throw new Error('当前账号信息不可用，请重新登录。')
  }
  return {
    uid: String(uid),
    sessionGeneration: authStore.getSessionGeneration(),
  }
}

const welcomeOperationOwnerIsCurrent = (owner: WelcomeOperationOwner) => (
  authStore.isLoggedIn
  && owner.uid === String(authStore.user?.uid ?? '')
  && owner.sessionGeneration === authStore.getSessionGeneration()
)

const requireCurrentWelcomeOperation = (owner: WelcomeOperationOwner) => {
  if (!welcomeOperationOwnerIsCurrent(owner)) {
    throw new WelcomeOperationSupersededError()
  }
}

const hasSelection = computed(() => selectedTopics.value.length > 0 || selectedTags.value.length > 0)

const toggle = (list: string[], value: string) => {
  const idx = list.indexOf(value)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(value)
}

const goNext = async () => {
  clearWelcomeOnboarding()
  await router.replace(safeRedirect(route.query.redirect))
}

const mergeIntent = async (owner: WelcomeOperationOwner): Promise<IntentReq> => {
  const existing = (await userApi.getIntent(owner.uid)).data
  requireCurrentWelcomeOperation(owner)
  const mergeValues = (current: string[] | undefined, selected: string[]) =>
    Array.from(new Set([...(current ?? []), ...selected]))
  return {
    targetCompanies: existing?.targetCompanies ?? [],
    targetPositions: existing?.targetPositions ?? [],
    targetPosition: existing?.targetPosition,
    yearsOfExp: existing?.yearsOfExp ?? 0,
    expectedCity: existing?.expectedCity ?? existing?.targetCity ?? '',
    techStack: existing?.techStack ?? [],
    interestTopics: mergeValues(existing?.interestTopics, selectedTopics.value),
    interestTags: mergeValues(existing?.interestTags, selectedTags.value),
    contentPreferences: existing?.contentPreferences ?? [],
  }
}

const saveAndContinue = async () => {
  if (isSaving.value) return
  if (!hasSelection.value) {
    await goNext()
    return
  }
  isSaving.value = true
  try {
    const owner = captureWelcomeOperationOwner()
    const intent = await mergeIntent(owner)
    requireCurrentWelcomeOperation(owner)
    await userApi.updateIntent(intent)
    requireCurrentWelcomeOperation(owner)
    toast.success('已记录你的兴趣，首页会据此推荐')
    await goNext()
  } catch (error: unknown) {
    if (error instanceof WelcomeOperationSupersededError) return
    toast.error(getErrorMessage(error, '兴趣保存失败，可稍后在设置里补充'))
  } finally {
    isSaving.value = false
  }
}

const skip = async () => {
  await goNext()
}
</script>

<style scoped>
.welcome-page {
  min-height: 100dvh;
  background: var(--surface-2);
  padding: clamp(1rem, 4vw, 3.5rem) 1rem;
}

.welcome-shell {
  width: min(42rem, 100%);
  margin: 0 auto;
}

.welcome-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.welcome-brand-mark {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--primary-600);
  color: white;
  font-weight: 900;
}

.welcome-brand > div {
  display: grid;
  gap: 0.05rem;
}

.welcome-brand strong {
  color: var(--text-strong);
  font-size: 1rem;
}

.welcome-brand span {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.welcome-surface {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.welcome-intro {
  padding: 1.75rem 1.75rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.welcome-intro p {
  margin: 0;
  color: var(--primary-600);
  font-size: 0.8125rem;
  font-weight: 800;
}

.welcome-intro h1 {
  margin: 0.35rem 0 0;
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 900;
  text-wrap: balance;
}

.welcome-intro span {
  display: block;
  max-width: 60ch;
  margin-top: 0.55rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.welcome-sections {
  display: grid;
}

.welcome-section {
  padding: 1.4rem 1.75rem;
}

.welcome-section + .welcome-section {
  border-top: 1px solid var(--border-subtle);
}

.welcome-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.welcome-section-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 800;
}

.welcome-section-heading small {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.welcome-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.welcome-chip {
  min-height: 40px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  padding: 0.4rem 0.9rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-primary);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.welcome-chip:hover {
  border-color: rgb(169 216 195);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.welcome-chip--active {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.welcome-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.75rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.welcome-primary {
  min-height: 44px;
  border-radius: var(--radius-control);
  background: var(--primary-600);
  padding: 0.65rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 800;
}

.welcome-primary:hover:not(:disabled) {
  background: var(--primary-700);
}

.welcome-primary:disabled,
.welcome-skip:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.welcome-skip {
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.welcome-skip:hover:not(:disabled) {
  color: var(--text-primary);
}

.dark .welcome-chip {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .welcome-chip:hover {
  border-color: rgb(18 99 74);
  background: rgb(7 31 24 / 0.5);
  color: rgb(169 216 195);
}

.dark .welcome-chip--active {
  border-color: rgb(18 99 74);
  background: rgb(26 127 90);
  color: rgb(255 255 255);
}

@media (max-width: 640px) {
  .welcome-page {
    padding-top: 1rem;
  }

  .welcome-brand {
    margin-bottom: 0.9rem;
  }

  .welcome-intro,
  .welcome-section,
  .welcome-actions {
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .welcome-actions {
    grid-template-columns: 1fr;
  }

  .welcome-skip {
    width: 100%;
  }
}
</style>
