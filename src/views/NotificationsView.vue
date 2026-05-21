<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold">通知</h1>
        <button
          @click="markAllAsRead"
          class="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
        >
          全部已读
        </button>
      </div>

      <!-- Tab 切换 -->
      <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="[
            'px-4 py-3 font-medium text-sm transition-colors border-b-2',
            activeTab === tab.value
              ? 'text-primary-600 border-primary-600'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          ]"
        >
          {{ tab.label }}
          <span v-if="tab.value === 'unread'" class="ml-2 text-xs bg-danger text-white px-2 py-0.5 rounded-full">
            5
          </span>
        </button>
      </div>

      <!-- 通知列表 -->
      <div class="space-y-3">
        <div
          v-for="(notif, idx) in notifications"
          :key="idx"
          :class="[
            'p-4 rounded-lg border transition-colors cursor-pointer',
            notif.read
              ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              : 'bg-primary-50 dark:bg-slate-800 border-primary-200 dark:border-slate-700'
          ]"
        >
          <div class="flex items-start gap-4">
            <img
              :src="notif.avatar"
              :alt="notif.author"
              class="w-10 h-10 rounded-full flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-slate-900 dark:text-slate-100">
                <span class="font-medium">{{ notif.author }}</span>
                {{ notif.message }}
              </p>
              <p v-if="notif.postTitle" class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                {{ notif.postTitle }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-500 mt-2">
                {{ notif.time }}
              </p>
            </div>
            <button
              v-if="!notif.read"
              @click.stop="markAsRead(idx)"
              class="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors flex-shrink-0"
            >
              标记已读
            </button>
          </div>
        </div>

        <div v-if="notifications.length === 0" class="text-center py-12">
          <p class="text-slate-500 dark:text-slate-400">这里很安静，发表面经赚点关注吧</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tabs = [
  { value: 'unread', label: '未读' },
  { value: 'all', label: '全部' }
]

const activeTab = ref('unread')

const notifications = ref([
  {
    author: 'Tom',
    avatar: 'https://via.placeholder.com/40',
    message: '赞了你的面经',
    postTitle: '字节后端二面经验分享',
    time: '1 小时前',
    read: false
  },
  {
    author: 'Alice',
    avatar: 'https://via.placeholder.com/40',
    message: '关注了你',
    postTitle: '',
    time: '3 小时前',
    read: false
  },
  {
    author: 'Bob',
    avatar: 'https://via.placeholder.com/40',
    message: '评论了你的帖子',
    postTitle: 'React 性能优化技巧',
    time: '5 小时前',
    read: true
  },
  {
    author: 'Carol',
    avatar: 'https://via.placeholder.com/40',
    message: '赞了你的评论',
    postTitle: '美团面试题解',
    time: '1 天前',
    read: true
  },
  {
    author: 'David',
    avatar: 'https://via.placeholder.com/40',
    message: '关注了你',
    postTitle: '',
    time: '2 天前',
    read: true
  }
])

const markAsRead = (idx: number) => {
  notifications.value[idx].read = true
}

const markAllAsRead = () => {
  notifications.value.forEach(n => n.read = true)
}
</script>
