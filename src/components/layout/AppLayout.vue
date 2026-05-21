<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <RouterView />
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import { RouterView } from 'vue-router'
import AppHeader from './AppHeader.vue'
</script>

