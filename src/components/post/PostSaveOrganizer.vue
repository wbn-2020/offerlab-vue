<template>
  <div v-if="favorited || openAfterSave" class="save-organizer" data-phase13-save-organizer>
    <button
      type="button"
      class="save-organizer__trigger"
      :aria-expanded="open"
      :aria-controls="panelId"
      :disabled="disabled"
      @click.prevent.stop="toggleOpen"
    >
      <BookmarkCheck class="h-4 w-4" />
      <span>{{ triggerLabel }}</span>
      <ChevronDown class="h-4 w-4" :class="{ 'rotate-180': open }" />
    </button>

    <div v-if="open" :id="panelId" class="save-organizer__panel" role="dialog" aria-label="移动到收藏夹">
      <div class="save-organizer__head">
        <div>
          <strong>移动到收藏夹</strong>
          <span>不会改变帖子收藏数，只调整你的收藏分组。</span>
        </div>
        <button type="button" class="save-organizer__close" aria-label="关闭" @click.prevent.stop="open = false">
          <X class="h-4 w-4" />
        </button>
      </div>

      <p v-if="errorMessage" class="save-organizer__error" role="alert">{{ errorMessage }}</p>
      <p v-else-if="loading" class="save-organizer__loading">正在读取收藏夹...</p>

      <div class="save-organizer__list" :aria-busy="loading || moving">
        <button
          v-for="target in targets"
          :key="String(target.id ?? 'default')"
          type="button"
          class="save-organizer__target"
          :disabled="loading || moving"
          @click.prevent.stop="moveToFolder(target.id)"
        >
          <span class="save-organizer__target-main">
            <span>{{ target.name }}</span>
            <small>{{ target.description || `${target.postCount} 条内容` }}</small>
          </span>
          <span class="save-organizer__visibility" :class="`save-organizer__visibility--${target.visibility}`">
            {{ target.visibility === 'public' ? '公开' : '私密' }}
          </span>
        </button>
      </div>

      <form class="save-organizer__create" @submit.prevent.stop="createFolder">
        <label>
          <span>新建收藏夹</span>
          <input
            v-model.trim="newFolderName"
            type="text"
            maxlength="30"
            placeholder="例如：面试复盘"
            :disabled="loading || moving || creating"
          />
        </label>
        <button type="submit" :disabled="!newFolderName || loading || moving || creating">
          {{ creating ? '创建中...' : '新建并移动' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BookmarkCheck, ChevronDown, X } from 'lucide-vue-next'
import { interactionApi } from '@/api/interaction'
import { getErrorMessage } from '@/api/client'
import type { ApiId, FavoriteFolder } from '@/api/types'

const props = withDefaults(defineProps<{
  postId: ApiId
  favorited?: boolean
  openAfterSave?: boolean
  disabled?: boolean
  triggerLabel?: string
}>(), {
  triggerLabel: '选择分组',
})

const emit = defineEmits<{
  moved: [postId: ApiId, folderId: ApiId | null, folderName: string]
}>()

type FolderTarget = Omit<Pick<FavoriteFolder, 'id' | 'name' | 'description' | 'visibility' | 'postCount'>, 'id'> & {
  id: ApiId | null
}

const open = ref(false)
const loading = ref(false)
const moving = ref(false)
const creating = ref(false)
const errorMessage = ref('')
const folders = ref<FavoriteFolder[]>([])
const newFolderName = ref('')
const panelId = computed(() => `save-organizer-${String(props.postId).replace(/[^a-zA-Z0-9_-]/g, '-')}`)

const defaultTarget = computed<FolderTarget>(() => ({
  id: null,
  name: '稍后读',
  description: '默认稍后读分组，未整理收藏会先留在这里；只显示本机整理入口时不会跨设备同步。',
  visibility: 'private',
  postCount: 0,
}))

const targets = computed<FolderTarget[]>(() => [
  defaultTarget.value,
  ...folders.value,
])

const loadFolders = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await interactionApi.listFavoriteFolders()
    folders.value = res.data || []
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, '收藏夹列表加载失败')
  } finally {
    loading.value = false
  }
}

const toggleOpen = async () => {
  if (props.disabled) return
  open.value = !open.value
  if (open.value && !folders.value.length) {
    await loadFolders()
  }
}

const folderNameFor = (folderId: ApiId | null) => {
  if (folderId === null) return defaultTarget.value.name
  return folders.value.find((folder) => String(folder.id) === String(folderId))?.name || '收藏夹'
}

const moveToFolder = async (folderId: ApiId | null) => {
  if (loading.value || moving.value) return
  moving.value = true
  errorMessage.value = ''
  try {
    await interactionApi.moveFavoriteToFolder({ postId: props.postId, folderId })
    emit('moved', props.postId, folderId, folderNameFor(folderId))
    open.value = false
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, '移动收藏失败')
  } finally {
    moving.value = false
  }
}

const createFolder = async () => {
  if (!newFolderName.value || creating.value || moving.value) return
  creating.value = true
  errorMessage.value = ''
  try {
    const res = await interactionApi.createFavoriteFolder({
      name: newFolderName.value,
      visibility: 'private',
    })
    if (res.data) {
      folders.value = [res.data, ...folders.value.filter((folder) => String(folder.id) !== String(res.data?.id))]
      newFolderName.value = ''
      await moveToFolder(res.data.id)
    }
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, '新建收藏夹失败')
  } finally {
    creating.value = false
  }
}

watch(() => props.favorited, (favorited) => {
  if (!favorited) open.value = false
})
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

.save-organizer__trigger:hover:not(:disabled) {
  border-color: rgb(251 191 36);
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.save-organizer__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.58;
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
  width: min(22rem, calc(100vw - 2rem));
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  box-shadow: 0 18px 45px rgb(15 23 42 / 0.16);
}

.save-organizer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem;
}

.save-organizer__head strong,
.save-organizer__head span {
  display: block;
}

.save-organizer__head strong {
  font-size: 0.875rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.save-organizer__head span {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.45;
  color: rgb(71 85 105);
}

.save-organizer__close {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: rgb(71 85 105);
}

.save-organizer__close:hover {
  background: rgb(226 232 240);
}

.save-organizer__error,
.save-organizer__loading {
  margin: 0.75rem 0.75rem 0;
  border-radius: 0.5rem;
  padding: 0.55rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.45;
}

.save-organizer__error {
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.save-organizer__loading {
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.save-organizer__list {
  max-height: 15rem;
  overflow-y: auto;
  padding: 0.45rem 0;
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

.save-organizer__target:hover:not(:disabled) {
  background: rgb(248 250 252);
}

.save-organizer__target:disabled {
  cursor: not-allowed;
  opacity: 0.62;
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

.save-organizer__create {
  display: grid;
  gap: 0.55rem;
  border-top: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem;
}

.save-organizer__create label,
.save-organizer__create label span {
  display: block;
}

.save-organizer__create label span {
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: rgb(71 85 105);
}

.save-organizer__create input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  background: white;
  padding: 0.5rem 0.6rem;
  font-size: 0.8125rem;
  color: rgb(15 23 42);
  outline: none;
}

.save-organizer__create input:focus {
  border-color: rgb(37 99 235);
  box-shadow: 0 0 0 3px rgb(191 219 254 / 0.7);
}

.save-organizer__create button {
  min-height: 2.25rem;
  border-radius: 0.5rem;
  background: rgb(37 99 235);
  padding: 0.45rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 900;
  color: white;
}

.save-organizer__create button:disabled,
.save-organizer__create input:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 420px) {
  .save-organizer,
  .save-organizer__trigger {
    width: 100%;
  }

  .save-organizer__trigger {
    min-height: 44px;
    justify-content: center;
    padding: 0.25rem 0.55rem;
  }
}

.dark .save-organizer__trigger {
  border-color: rgb(146 64 14 / 0.75);
  background: rgb(69 26 3 / 0.45);
  color: rgb(253 186 116);
}

.dark .save-organizer__trigger:hover:not(:disabled) {
  border-color: rgb(217 119 6);
  background: rgb(120 53 15 / 0.5);
  color: rgb(254 215 170);
}

.dark .save-organizer__panel {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  box-shadow: 0 18px 45px rgb(0 0 0 / 0.34);
}

.dark .save-organizer__head,
.dark .save-organizer__create {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
}

.dark .save-organizer__head strong,
.dark .save-organizer__target-main span {
  color: rgb(248 250 252);
}

.dark .save-organizer__head span,
.dark .save-organizer__create label span {
  color: rgb(203 213 225);
}

.dark .save-organizer__close {
  color: rgb(203 213 225);
}

.dark .save-organizer__close:hover,
.dark .save-organizer__target:hover:not(:disabled) {
  background: rgb(51 65 85);
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

.dark .save-organizer__create input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(248 250 252);
}

.dark .save-organizer__error {
  border-color: rgb(127 29 29);
  background: rgb(127 29 29 / 0.25);
  color: rgb(254 202 202);
}

.dark .save-organizer__loading {
  border-color: rgb(30 64 175);
  background: rgb(30 64 175 / 0.25);
  color: rgb(191 219 254);
}
</style>
