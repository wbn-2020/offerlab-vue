<template>
  <div class="action-center-page">
    <AppHeader />
    <main class="action-center-shell">
      <CollaborationActionCenter />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationActionCenter from '@/components/collaboration/CollaborationActionCenter.vue'
</script>

<style scoped>
.action-center-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.action-center-shell {
  width: min(980px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 4rem;
}

@media (max-width: 560px) {
  .action-center-shell {
    width: min(100% - 1.5rem, 980px);
    padding-top: 1rem;
  }
}
</style>
