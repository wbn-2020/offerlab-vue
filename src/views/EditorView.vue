<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- 顶部导航 -->
    <div class="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            ← 返回
          </button>
          <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">
            {{ isEditing ? '编辑帖子' : '发布新帖子' }}
          </h1>
        </div>
        <div class="flex gap-3">
          <button
            @click="saveDraft"
            class="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            保存草稿
          </button>
          <button
            @click="publishPost"
            :disabled="isPublishing || !form.title.trim() || !form.content.trim()"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {{ isPublishing ? '发布中...' : '发布' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="max-w-6xl mx-auto p-6">
      <div class="space-y-6">
        <!-- 标题输入 -->
        <div class="flex flex-col gap-2">
          <input
            v-model="form.title"
            type="text"
            placeholder="输入标题..."
            class="text-3xl font-bold px-4 py-3 border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          <div class="text-sm text-slate-500 dark:text-slate-400 px-4">
            {{ form.title.length }} / 200 字符
          </div>
        </div>

        <!-- 帖子类型 Tab -->
        <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 px-4">
          <button
            v-for="type in postTypes"
            :key="type.value"
            @click="form.postType = type.value"
            :class="[
              'px-4 py-3 font-medium text-sm transition-colors border-b-2',
              form.postType === type.value
                ? 'text-primary-600 border-primary-600'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            ]"
          >
            {{ type.label }}
          </button>
        </div>

        <!-- 面经元数据 -->
        <div v-if="form.postType === 1" class="px-4">
          <PostMeta v-model="form.extension" :type="form.postType" />
        </div>

        <!-- 标签输入 -->
        <div class="px-4 flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">标签</label>
          <div class="flex gap-2 mb-2">
            <input
              v-model="tagInput"
              type="text"
              placeholder="输入标签，按 Enter 添加"
              @keydown.enter="addTag"
              class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              @click="addTag"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              添加
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(tag, idx) in selectedTags"
              :key="idx"
              class="flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(idx)"
                class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <!-- Markdown 编辑器 -->
        <div class="px-4">
          <MarkdownEditor v-model="form.content" />
        </div>

        <!-- 封面图 -->
        <div class="px-4 flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">封面图（可选）</label>
          <input
            v-model="form.coverUrl"
            type="url"
            placeholder="输入图片 URL..."
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div v-if="form.coverUrl" class="mt-2 rounded-lg overflow-hidden max-h-64">
            <img :src="form.coverUrl" :alt="form.title" class="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MarkdownEditor from '@/components/post/MarkdownEditor.vue'
import PostMeta from '@/components/post/PostMeta.vue'
import { postApi } from '@/api/post'

const router = useRouter()
const route = useRoute()

const postTypes = [
  { value: 1, label: '面经' },
  { value: 2, label: '技术博客' },
  { value: 3, label: '题解' },
  { value: 4, label: '求职问答' }
]

const form = ref({
  postType: 1,
  title: '',
  content: '',
  tags: [] as number[],
  extension: {},
  coverUrl: ''
})

const tagInput = ref('')
const selectedTags = ref<string[]>([])
const isPublishing = ref(false)
const isEditing = ref(false)

const postTypes_map = {
  1: '面经',
  2: '技术博客',
  3: '题解',
  4: '求职问答'
}

onMounted(() => {
  const postId = route.params.id
  if (postId) {
    isEditing.value = true
    // TODO: 加载现有帖子数据
  }

  // 从 localStorage 恢复草稿
  const draft = localStorage.getItem('post_draft')
  if (draft && !isEditing.value) {
    try {
      const draftData = JSON.parse(draft)
      form.value = { ...form.value, ...draftData }
    } catch (e) {
      console.error('Failed to load draft:', e)
    }
  }
})

const addTag = () => {
  if (tagInput.value.trim() && !selectedTags.value.includes(tagInput.value.trim())) {
    selectedTags.value.push(tagInput.value.trim())
    tagInput.value = ''
  }
}

const removeTag = (idx: number) => {
  selectedTags.value.splice(idx, 1)
}

const saveDraft = () => {
  localStorage.setItem('post_draft', JSON.stringify(form.value))
  alert('草稿已保存')
}

const publishPost = async () => {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    alert('请填写标题和内容')
    return
  }

  isPublishing.value = true
  try {
    const req = {
      postType: form.value.postType,
      title: form.value.title,
      content: form.value.content,
      tags: form.value.tags,
      extension: form.value.extension
    }

    const res = await postApi.create(req)
    if (res.code === 0) {
      localStorage.removeItem('post_draft')
      alert('发布成功')
      router.push(`/post/${res.data.postId}`)
    } else {
      alert(`发布失败: ${res.message}`)
    }
  } catch (error) {
    console.error('Publish error:', error)
    alert('发布失败，请重试')
  } finally {
    isPublishing.value = false
  }
}

const goBack = () => {
  router.back()
}
</script>
