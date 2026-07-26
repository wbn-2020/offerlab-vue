<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-lg">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <div class="text-center mb-6">
          <p class="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">欢迎加入 {{ siteBrand.displayName }}</p>
          <h1 class="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">先选几个感兴趣的方向</h1>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            用来给你的首页推荐更贴近的内容。之后随时能在设置里调整，也可以先跳过。
          </p>
        </div>

        <section class="space-y-5">
          <div>
            <h2 class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">感兴趣的频道</h2>
            <div class="flex flex-wrap gap-2">
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
          </div>

          <div>
            <h2 class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">想多看的内容类型</h2>
            <div class="flex flex-wrap gap-2">
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
          </div>
        </section>

        <div class="mt-8 flex flex-col gap-3">
          <button
            type="button"
            class="welcome-primary w-full rounded-lg bg-primary-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSaving"
            @click="saveAndContinue"
          >
            {{ isSaving ? '保存中...' : (hasSelection ? '开始逛社区' : '先随便逛逛') }}
          </button>
          <button
            type="button"
            class="w-full py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            :disabled="isSaving"
            @click="skip"
          >
            跳过，稍后再说
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
.welcome-chip {
  min-height: 40px;
  border-radius: 9999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgb(71 85 105);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.welcome-chip:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.welcome-chip--active {
  border-color: rgb(147 197 253);
  background: rgb(37 99 235);
  color: rgb(255 255 255);
}

.welcome-primary {
  min-height: 44px;
}

.dark .welcome-chip {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .welcome-chip:hover {
  border-color: rgb(29 78 216);
  background: rgb(23 37 84 / 0.5);
  color: rgb(191 219 254);
}

.dark .welcome-chip--active {
  border-color: rgb(29 78 216);
  background: rgb(37 99 235);
  color: rgb(255 255 255);
}
</style>
