<template>
  <div class="min-h-screen bg-white dark:bg-slate-950">
    <RouterView />
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
import { useRealtime } from '@/composables/useRealtime'

useRealtime()
</script>
