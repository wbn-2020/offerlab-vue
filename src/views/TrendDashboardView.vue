<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">趋势看板</h1>
        <div class="flex gap-2">
          <button
            v-for="period in periods"
            :key="period.value"
            @click="activePeriod = period.value"
            :class="[
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              activePeriod === period.value
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            ]"
          >
            {{ period.label }}
          </button>
        </div>
      </div>

      <!-- 图表网格 -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        <!-- 热门公司 -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">热门公司 Top 10</h2>
          <div class="space-y-3">
            <div v-for="(company, idx) in topCompanies" :key="idx" class="flex items-center gap-3">
              <div class="text-sm font-medium text-slate-600 dark:text-slate-400 w-6">{{ idx + 1 }}</div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ company.name }}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">{{ company.count }} 篇</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div
                    class="bg-primary-600 h-2 rounded-full"
                    :style="{ width: (company.count / 100) * 100 + '%' }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 高频技术栈 -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">高频技术栈</h2>
          <div class="space-y-3">
            <div v-for="(tech, idx) in topTechs" :key="idx" class="flex items-center gap-3">
              <div class="text-sm font-medium text-slate-600 dark:text-slate-400 w-6">{{ idx + 1 }}</div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ tech.name }}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">{{ tech.count }} 次</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full"
                    :style="{ width: (tech.count / 80) * 100 + '%' }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 发布趋势 -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">面经发布趋势</h2>
        <div class="h-64 flex items-end justify-around gap-2">
          <div v-for="(day, idx) in trendData" :key="idx" class="flex-1 flex flex-col items-center gap-2">
            <div
              class="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all hover:opacity-80"
              :style="{ height: (day.value / 100) * 100 + '%' }"
            />
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <!-- 岗位分布和通过率 -->
      <div class="grid grid-cols-2 gap-6">
        <!-- 岗位分布 -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">岗位分布</h2>
          <div class="space-y-3">
            <div v-for="(position, idx) in positionDistribution" :key="idx" class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: colors[idx % colors.length] }" />
              <span class="text-sm text-slate-700 dark:text-slate-300">{{ position.name }}</span>
              <span class="text-sm font-medium text-slate-900 dark:text-slate-100 ml-auto">{{ position.percentage }}%</span>
            </div>
          </div>
        </div>

        <!-- 公司面试通过率 -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">公司面试通过率</h2>
          <div class="space-y-3">
            <div v-for="(company, idx) in companyPassRate" :key="idx" class="flex items-center gap-3">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300 w-20">{{ company.name }}</span>
              <div class="flex-1 flex gap-1">
                <div class="flex-1 bg-success/20 rounded h-6 flex items-center justify-center text-xs font-medium text-success">
                  {{ company.offer }}
                </div>
                <div class="flex-1 bg-warning/20 rounded h-6 flex items-center justify-center text-xs font-medium text-warning">
                  {{ company.pending }}
                </div>
                <div class="flex-1 bg-danger/20 rounded h-6 flex items-center justify-center text-xs font-medium text-danger">
                  {{ company.reject }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const periods = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' }
]

const activePeriod = ref('30d')

const topCompanies = [
  { name: '字节跳动', count: 98 },
  { name: '美团', count: 87 },
  { name: '阿里巴巴', count: 76 },
  { name: '腾讯', count: 65 },
  { name: '百度', count: 54 },
  { name: '快手', count: 43 },
  { name: '抖音', count: 32 },
  { name: '小红书', count: 28 },
  { name: '拼多多', count: 24 },
  { name: '滴滴', count: 19 }
]

const topTechs = [
  { name: 'Java', count: 78 },
  { name: 'Python', count: 65 },
  { name: 'Go', count: 54 },
  { name: 'C++', count: 43 },
  { name: 'JavaScript', count: 38 },
  { name: 'Rust', count: 28 },
  { name: 'SQL', count: 76 },
  { name: 'Redis', count: 62 }
]

const trendData = [
  { label: '周一', value: 45 },
  { label: '周二', value: 52 },
  { label: '周三', value: 48 },
  { label: '周四', value: 61 },
  { label: '周五', value: 55 },
  { label: '周六', value: 38 },
  { label: '周日', value: 42 }
]

const positionDistribution = [
  { name: 'Java 后端', percentage: 28 },
  { name: 'Go 后端', percentage: 18 },
  { name: '前端', percentage: 22 },
  { name: 'Python 后端', percentage: 15 },
  { name: '其他', percentage: 17 }
]

const companyPassRate = [
  { name: '字节跳动', offer: 32, pending: 28, reject: 38 },
  { name: '美团', offer: 35, pending: 25, reject: 40 },
  { name: '阿里巴巴', offer: 30, pending: 32, reject: 38 },
  { name: '腾讯', offer: 28, pending: 30, reject: 42 }
]

const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
</script>
