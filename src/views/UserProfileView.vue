<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
    <div class="mx-auto max-w-6xl space-y-6">
      <section v-if="isLoading" class="profile-panel py-20 text-center text-sm text-slate-500 dark:text-slate-400">
        正在加载用户主页...
      </section>

      <section v-else-if="loadError" class="profile-panel py-16 text-center">
        <h1 class="text-xl font-semibold text-slate-950 dark:text-slate-50">主页暂不可用</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ loadError }}</p>
      </section>

      <template v-else-if="user">
        <section class="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div class="h-28 bg-gradient-to-r from-primary-600 via-sky-600 to-emerald-500" />
          <div class="-mt-10 flex flex-col gap-5 px-6 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-2xl font-bold text-white dark:border-slate-900">
                {{ avatarText }}
              </div>
              <div class="pt-1">
                <h1 class="text-2xl font-bold text-slate-950 dark:text-slate-50">
                  {{ user.profileVisible === false ? '受限主页' : user.nickname }}
                </h1>
                <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  {{ profileDescription }}
                </p>
              </div>
            </div>
            <button
              v-if="user.profileVisible !== false"
              type="button"
              class="follow-button"
              @click="toggleFollow"
            >
              {{ user.isFollowing ? '已关注' : '关注' }}
            </button>
          </div>
        </section>

        <section v-if="user.profileVisible === false" class="profile-panel py-14 text-center">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">该用户限制了主页访问</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">资料、帖子和求职意向会按隐私设置隐藏。</p>
        </section>

        <template v-else>
          <section class="grid gap-4 sm:grid-cols-3">
            <article class="stat-card">
              <strong>{{ user.postCount || posts.length }}</strong>
              <span>发帖</span>
            </article>
            <article class="stat-card">
              <strong>{{ user.followingCount || 0 }}</strong>
              <span>关注</span>
            </article>
            <article class="stat-card">
              <strong>{{ user.followerCount || 0 }}</strong>
              <span>粉丝</span>
            </article>
          </section>

          <section v-if="user.intentVisible === false" class="profile-panel text-sm text-slate-500 dark:text-slate-400">
            该用户的求职意向当前不可见。
          </section>
          <section v-else-if="userIntent" class="profile-panel">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">求职意向</h2>
            <div class="mt-4 flex flex-wrap gap-2 text-sm">
              <span v-for="company in userIntent.targetCompanies || []" :key="company" class="tag-pill">公司：{{ company }}</span>
              <span v-for="position in userIntent.targetPositions || []" :key="position" class="tag-pill">岗位：{{ position }}</span>
              <span v-if="userIntent.targetCity" class="tag-pill">城市：{{ userIntent.targetCity }}</span>
              <span v-if="userIntent.yearsOfExp" class="tag-pill">经验：{{ userIntent.yearsOfExp }} 年</span>
            </div>
          </section>

          <section class="profile-panel">
            <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">公开帖子</h2>
            </div>
            <div v-if="posts.length === 0" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              该用户还没有公开帖子。
            </div>
            <div v-else class="space-y-4 pt-5">
              <article v-for="post in posts" :key="post.postId" class="post-row">
                <div class="min-w-0">
                  <h3 class="line-clamp-2 text-base font-semibold text-slate-950 dark:text-slate-50">{{ post.title }}</h3>
                  <p class="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                    {{ post.summary || post.content.slice(0, 100) }}
                  </p>
                </div>
                <router-link :to="`/post/${post.postId}`" class="open-link">查看</router-link>
              </article>
            </div>
          </section>
        </template>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { userApi } from '@/api/user'
import { postApi } from '@/api/post'
import { useAuthStore } from '@/stores/auth'
import type { Post, User, UserIntent } from '@/api/types'

const route = useRoute()
const authStore = useAuthStore()
const user = ref<User | null>(null)
const userIntent = ref<UserIntent | null>(null)
const posts = ref<Post[]>([])
const isLoading = ref(false)
const loadError = ref('')

const avatarText = computed(() => user.value?.nickname?.charAt(0) || '?')
const profileDescription = computed(() => {
  if (!user.value || user.value.profileVisible === false) return '访问范围由该用户的隐私设置决定。'
  return user.value.signature || '这个用户还没有填写简介。'
})

const loadProfile = async () => {
  const uid = route.params.uid as string
  if (!uid) return
  isLoading.value = true
  loadError.value = ''
  try {
    const profile = await userApi.getProfile(uid)
    user.value = profile.data
    if (!profile.data || profile.data.profileVisible === false) {
      posts.value = []
      userIntent.value = null
      return
    }
    const [intent, authoredPosts] = await Promise.all([
      userApi.getIntent(uid),
      postApi.list({ authorId: uid }),
    ])
    userIntent.value = intent.data
    posts.value = authoredPosts.data?.items || []
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '用户资料加载失败')
  } finally {
    isLoading.value = false
  }
}

const toggleFollow = async () => {
  if (!user.value) return
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  try {
    if (user.value.isFollowing) {
      await userApi.unfollow(user.value.uid)
    } else {
      await userApi.follow(user.value.uid)
    }
    user.value.isFollowing = !user.value.isFollowing
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-panel,
.stat-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: white;
  padding: 1.5rem;
}

.stat-card strong {
  display: block;
  color: rgb(15 23 42);
  font-size: 1.75rem;
  font-weight: 800;
}

.stat-card span {
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.follow-button,
.open-link {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(79 70 229);
  padding: 0.625rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.tag-pill {
  border-radius: 0.375rem;
  background: rgb(241 245 249);
  padding: 0.35rem 0.6rem;
  color: rgb(51 65 85);
}

.post-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgb(241 245 249);
  padding-bottom: 1rem;
}

:global(.dark) .profile-panel,
:global(.dark) .stat-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .stat-card strong {
  color: rgb(241 245 249);
}

:global(.dark) .tag-pill {
  background: rgb(30 41 59);
  color: rgb(226 232 240);
}

:global(.dark) .post-row {
  border-bottom-color: rgb(30 41 59);
}

@media (max-width: 640px) {
  .post-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
