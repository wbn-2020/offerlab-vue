<template>
  <div v-if="favorited || openAfterSave" class="save-organizer" data-phase13-save-organizer>
    <button
      type="button"
      class="save-organizer__trigger"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click.prevent="open = !open"
    >
      <BookmarkCheck class="h-4 w-4" />
      <span>稍后读</span>
      <ChevronDown class="h-4 w-4" :class="{ 'rotate-180': open }" />
    </button>

    <div v-if="open" :id="panelId" class="save-organizer__panel" role="menu">
      <div class="save-organizer__boundary">
        本机整理入口；独立内容清单后端未接入时，不会跨设备同步。
      </div>
      <button
        v-for="target in targets"
        :key="target.id"
        type="button"
        class="save-organizer__target"
        role="menuitem"
        @click.prevent="selectTarget(target.id)"
      >
        <span class="save-organizer__target-main">
          <span>{{ target.title }}</span>
          <small>{{ target.description }}</small>
        </span>
        <span class="save-organizer__visibility" :class="`save-organizer__visibility--${target.visibility}`">
          {{ target.visibilityLabel }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookmarkCheck, ChevronDown } from 'lucide-vue-next'
import type { ApiId } from '@/api/types'

const props = defineProps<{
  postId: ApiId
  favorited?: boolean
  openAfterSave?: boolean
}>()

const emit = defineEmits<{
  organize: [postId: ApiId, targetId: 'read_later' | 'unorganized_favorites' | 'public_demo_list']
}>()

const open = ref(false)
const panelId = computed(() => `save-organizer-${String(props.postId).replace(/[^a-zA-Z0-9_-]/g, '-')}`)

const targets = [
  {
    id: 'read_later',
    title: '稍后读',
    description: '默认保存在未整理收藏里，之后可以回来处理。',
    visibility: 'private',
    visibilityLabel: '私密',
  },
  {
    id: 'unorganized_favorites',
    title: '未整理收藏',
    description: '保留一键收藏体验，不要求马上分类。',
    visibility: 'private',
    visibilityLabel: '私密',
  },
  {
    id: 'public_demo_list',
    title: '公开清单示例',
    description: '仅展示公开且治理通过的内容；当前为本机示例。',
    visibility: 'public',
    visibilityLabel: '公开',
  },
] as const

const selectTarget = (targetId: typeof targets[number]['id']) => {
  emit('organize', props.postId, targetId)
  open.value = false
}
</script>

<style scoped>
.save-organizer {
  position: relative;
  display: inline-flex;
}

.save-organizer__trigger {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid rgb(254 215 170);
  background: rgb(255 251 235);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(180 83 9);
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.save-organizer__trigger:hover {
  border-color: rgb(251 191 36);
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.save-organizer__trigger svg {
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.save-organizer__panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.45rem);
  z-index: 25;
  width: min(19rem, calc(100vw - 2rem));
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  box-shadow: 0 18px 45px rgb(15 23 42 / 0.16);
}

.save-organizer__boundary {
  border-bottom: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.65rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.45;
  color: rgb(71 85 105);
}

.save-organizer__target {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  text-align: left;
  transition: background-color 0.15s ease;
}

.save-organizer__target:hover {
  background: rgb(248 250 252);
}

.save-organizer__target-main {
  min-width: 0;
}

.save-organizer__target-main span,
.save-organizer__target-main small {
  display: block;
}

.save-organizer__target-main span {
  font-size: 0.84rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.save-organizer__target-main small {
  margin-top: 0.12rem;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgb(100 116 139);
}

.save-organizer__visibility {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0.18rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 900;
}

.save-organizer__visibility--private {
  background: rgb(241 245 249);
  color: rgb(51 65 85);
}

.save-organizer__visibility--public {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

@media (max-width: 420px) {
  .save-organizer__trigger {
    min-height: 44px;
    padding: 0.25rem 0.55rem;
  }
}

.dark .save-organizer__trigger {
  border-color: rgb(146 64 14 / 0.75);
  background: rgb(69 26 3 / 0.45);
  color: rgb(253 186 116);
}

.dark .save-organizer__trigger:hover {
  border-color: rgb(217 119 6);
  background: rgb(120 53 15 / 0.5);
  color: rgb(254 215 170);
}

.dark .save-organizer__panel {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  box-shadow: 0 18px 45px rgb(0 0 0 / 0.34);
}

.dark .save-organizer__boundary {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .save-organizer__target:hover {
  background: rgb(30 41 59);
}

.dark .save-organizer__target-main span {
  color: rgb(248 250 252);
}

.dark .save-organizer__target-main small {
  color: rgb(148 163 184);
}

.dark .save-organizer__visibility--private {
  background: rgb(51 65 85);
  color: rgb(203 213 225);
}

.dark .save-organizer__visibility--public {
  background: rgb(20 83 45 / 0.55);
  color: rgb(134 239 172);
}
</style>
