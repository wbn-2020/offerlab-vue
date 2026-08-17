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
        <RouteLoadingFallback v-else :collaboration="isCollaborationRoute" />
        <template #fallback>
          <RouteLoadingFallback :collaboration="isCollaborationRoute" />
        </template>
      </Suspense>
    </RouterView>
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'
import RouteLoadingFallback from '@/components/layout/RouteLoadingFallback.vue'
import { useRealtime } from '@/composables/useRealtime'

const router = useRouter()
const route = useRoute()
const routeLoadError = ref<unknown>(null)
const isCollaborationRoute = computed(() => (
  route.path === '/collaboration' || route.path.startsWith('/collaboration/')
))
const routeLoadMessage = computed(() => {
  if (routeLoadError.value instanceof Error && routeLoadError.value.message) {
    if (!/__vccOpts|Cannot read properties of undefined|Cannot read properties of null|component instance|hydration/i.test(routeLoadError.value.message)) {
      return '页面资源暂时无法加载，请重试或返回首页。'
    }
  }
  return '页面资源暂时无法加载，请重试或返回首页。'
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
