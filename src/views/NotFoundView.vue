<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="flex min-h-[calc(100vh-4.25rem)] items-center justify-center p-8">
    <div class="text-center">
      <div class="text-8xl font-bold text-primary-600 mb-4">404</div>
      <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">页面走丢了</h1>
      <p class="text-lg text-slate-600 dark:text-slate-400 mb-8">
        抱歉，你访问的页面不存在或已被删除
      </p>
      <div class="flex gap-4 justify-center">
        <router-link
          to="/"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          返回首页
        </router-link>
        <router-link
          to="/explore"
          class="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
        >
          去发现
        </router-link>
      </div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>
