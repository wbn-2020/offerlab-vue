<template>
  <div class="min-h-screen bg-white dark:bg-slate-950">
    <RouterView v-slot="{ Component }">
      <main v-if="routeLoadError" class="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <section class="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900/60 dark:bg-slate-900">
          <p class="text-sm font-black text-amber-600 dark:text-amber-300">页面加载失败</p>
          <h1 class="mt-2 text-xl font-black text-slate-950 dark:text-slate-50">这次没有白屏，但页面资源没有加载成功</h1>
          <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ routeLoadMessage }}</p>
          <div class="mt-5 flex flex-wrap gap-3">
            <button type="button" class="route-error-action route-error-action-primary" @click="retryRouteLoad">重新加载</button>
            <RouterLink to="/" class="route-error-action route-error-action-secondary" @click="clearRouteLoadError">返回首页</RouterLink>
          </div>
        </section>
      </main>
      <Suspense v-else>
        <component :is="Component" v-if="Component" />
        <template #fallback>
          <main class="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Loader2 class="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400" aria-hidden="true" />
              <span class="text-sm font-semibold">正在加载页面</span>
            </div>
          </main>
        </template>
      </Suspense>
    </RouterView>
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { computed, onErrorCaptured, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'
import { useRealtime } from '@/composables/useRealtime'

const router = useRouter()
const route = useRoute()
const routeLoadError = ref<unknown>(null)
const routeLoadMessage = computed(() => {
  if (routeLoadError.value instanceof Error && routeLoadError.value.message) {
    return routeLoadError.value.message
  }
  return '请检查本地 dev server 或刷新页面后重试。'
})

const clearRouteLoadError = () => {
  routeLoadError.value = null
}

const retryRouteLoad = () => {
  clearRouteLoadError()
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

router.onError((error) => {
  routeLoadError.value = error
})

onErrorCaptured((error) => {
  routeLoadError.value = error
  return false
})

watch(() => route.fullPath, clearRouteLoadError)

useRealtime()
</script>

<style scoped>
.route-error-action {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.55rem 0.95rem;
  font-size: 0.875rem;
  font-weight: 800;
}

.route-error-action-primary {
  background: rgb(37 99 235);
  color: white;
}

.route-error-action-primary:hover {
  background: rgb(29 78 216);
}

.route-error-action-secondary {
  border: 1px solid rgb(226 232 240);
  color: rgb(51 65 85);
}

.dark .route-error-action-secondary {
  border-color: rgb(51 65 85);
  color: rgb(203 213 225);
}
</style>
