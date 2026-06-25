<template>
  <section class="panel">
    <div class="flex items-center justify-between gap-3">
      <h2 class="panel-title">复盘统计</h2>
      <span v-if="stats" class="score-badge">{{ stats.averageScorePercent }}%</span>
    </div>

    <div v-if="isLoading" class="mt-4 grid gap-3">
      <div class="skeleton-line w-2/3" />
      <div class="grid grid-cols-2 gap-3">
        <div v-for="item in 4" :key="item" class="skeleton-tile" />
      </div>
    </div>

    <div v-else-if="errorMessage" class="state-box">
      <p>{{ errorMessage }}</p>
      <button type="button" class="retry-button" @click="$emit('retry')">重试</button>
    </div>

    <div v-else-if="!stats || stats.sessionCount === 0" class="state-box">
      <p>还没有知识复盘记录，完成一场后这里会展示平均分、最高分和主题趋势。</p>
    </div>

    <template v-else-if="stats">
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="stat-tile"><span>总场次</span><strong>{{ stats.sessionCount }}</strong></div>
        <div class="stat-tile"><span>已完成</span><strong>{{ stats.completedCount }}</strong></div>
        <div class="stat-tile"><span>最佳分</span><strong>{{ stats.bestScorePercent }}%</strong></div>
        <div class="stat-tile"><span>平均用时</span><strong>{{ formatDuration(stats.averageDurationSeconds) }}</strong></div>
      </div>
      <div v-if="stats.recentSessions.length" class="mt-4">
        <div class="mb-2 text-xs font-black tracking-normal text-slate-400">最近趋势</div>
        <div class="trend-bars">
          <span
            v-for="session in stats.recentSessions"
            :key="session.id"
            class="trend-bar"
            :style="{ height: `${trendHeight(session)}%` }"
            :title="`${sessionTitle(session)} ${scorePercent(session)}%`"
          />
        </div>
      </div>
      <div v-if="stats.weakAnswers.length" class="weak-answer-group">
        <div class="weak-answer-head">
          <div>
            <div class="insight-heading">低分题追踪</div>
            <p>近 {{ stats.insightWindowSize }} 场中 0-2 分且已作答的题</p>
          </div>
          <button type="button" class="weak-answer-action" :disabled="isMarkingWeakAnswers" @click="$emit('mark-weak-answers-review')">
            {{ isMarkingWeakAnswers ? '加入中...' : '加入待复习' }}
          </button>
        </div>
        <div class="weak-answer-list">
          <div v-for="answer in stats.weakAnswers" :key="`${answer.sessionId}-${answer.questionId}`" class="weak-answer-row">
            <span>{{ answerQuestionText(answer) }}</span>
            <strong>{{ answer.score }} 分</strong>
            <small>{{ answerMetaParts(answer)[0] || '\u7efc\u5408\u9898\u5e93' }} · Q{{ answer.sequenceNo }}</small>
          </div>
        </div>
      </div>
      <div v-if="hasInsights" class="mt-5 space-y-3">
        <div class="mb-1 text-xs font-black uppercase tracking-wide text-slate-400">近 {{ stats.insightWindowSize }} 场洞察</div>
        <div v-if="visibleFocusTagInsights.length" class="insight-group">
          <div class="insight-heading">主题表现</div>
          <div v-for="item in visibleFocusTagInsights" :key="`tag-${item.name}`" class="insight-row">
            <span>{{ item.name }}</span>
            <strong>{{ item.averageScorePercent }}%</strong>
            <small>{{ item.sessionCount }} 场 · 最佳 {{ item.bestScorePercent }}%</small>
          </div>
        </div>
        <div v-if="visibleCompanyInsights.length" class="insight-group">
          <div class="insight-heading">公司表现</div>
          <div v-for="item in visibleCompanyInsights" :key="`company-${item.name}`" class="insight-row">
            <span>{{ item.name }}</span>
            <strong>{{ item.averageScorePercent }}%</strong>
            <small>{{ item.sessionCount }} 场 · {{ formatDuration(item.averageDurationSeconds) }}</small>
          </div>
        </div>
        <div v-if="visiblePositionInsights.length" class="insight-group">
          <div class="insight-heading">岗位表现</div>
          <div v-for="item in visiblePositionInsights" :key="`position-${item.name}`" class="insight-row">
            <span>{{ item.name }}</span>
            <strong>{{ item.averageScorePercent }}%</strong>
            <small>{{ item.sessionCount }} 场 · 最佳 {{ item.bestScorePercent }}%</small>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MockInterviewStats } from '@/api/question'
import { answerMetaParts, answerQuestionText, formatDuration, scorePercent, sessionTitle, trendHeight } from '@/utils/mockInterviewFormat'
import { isSyntheticVisibleText } from '@/utils/textQuality'

const props = defineProps<{
  stats: MockInterviewStats | null
  isLoading?: boolean
  errorMessage?: string
  isMarkingWeakAnswers?: boolean
}>()

defineEmits<{
  retry: []
  'mark-weak-answers-review': []
}>()

const visibleFocusTagInsights = computed(() => props.stats?.focusTagInsights.filter((item) => !isSyntheticVisibleText(item.name)) || [])
const visibleCompanyInsights = computed(() => props.stats?.companyInsights.filter((item) => !isSyntheticVisibleText(item.name)) || [])
const visiblePositionInsights = computed(() => props.stats?.positionInsights.filter((item) => !isSyntheticVisibleText(item.name)) || [])
const hasInsights = computed(() => Boolean(visibleFocusTagInsights.value.length || visibleCompanyInsights.value.length || visiblePositionInsights.value.length))
</script>

<style scoped>
.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.panel-title {
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.score-badge {
  border-radius: 999px;
  background: rgb(220 252 231);
  padding: 0.25rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(21 128 61);
}

.stat-tile {
  border-radius: 0.65rem;
  background: rgb(248 250 252);
  padding: 0.75rem;
}

.stat-tile span {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.stat-tile strong {
  margin-top: 0.2rem;
  display: block;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.state-box {
  margin-top: 1rem;
  border-radius: 0.75rem;
  border: 1px dashed rgb(203 213 225);
  background: rgb(248 250 252);
  padding: 1rem;
  font-size: 0.82rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.retry-button {
  margin-top: 0.75rem;
  min-height: 34px;
  border-radius: 0.6rem;
  background: rgb(37 99 235);
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 900;
  color: white;
}

.skeleton-line,
.skeleton-tile {
  border-radius: 0.65rem;
  background: linear-gradient(90deg, rgb(241 245 249), rgb(226 232 240), rgb(241 245 249));
  background-size: 200% 100%;
  animation: pulse 1.2s ease-in-out infinite;
}

.skeleton-line {
  height: 0.8rem;
}

.skeleton-tile {
  height: 4.4rem;
}

.trend-bars {
  display: grid;
  height: 72px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  gap: 0.35rem;
}

.trend-bar {
  min-height: 10px;
  border-radius: 999px 999px 0 0;
  background: linear-gradient(180deg, rgb(59 130 246), rgb(37 99 235));
}

.weak-answer-group {
  margin-top: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(254 205 211);
  background: rgb(255 241 242);
  padding: 0.9rem;
}

.weak-answer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.weak-answer-head p {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  line-height: 1.5;
  color: rgb(136 19 55);
}

.weak-answer-action {
  min-height: 32px;
  flex: 0 0 auto;
  border-radius: 0.55rem;
  background: rgb(225 29 72);
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: white;
}

.weak-answer-list {
  margin-top: 0.7rem;
  display: grid;
  gap: 0.45rem;
}

.weak-answer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.12rem 0.5rem;
  border-radius: 0.6rem;
  background: white;
  padding: 0.65rem;
}

.weak-answer-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.weak-answer-row strong {
  font-size: 0.78rem;
  font-weight: 900;
  color: rgb(225 29 72);
}

.weak-answer-row small {
  grid-column: 1 / -1;
  font-size: 0.7rem;
  color: rgb(136 19 55);
}

.insight-group {
  display: grid;
  gap: 0.45rem;
}

.insight-heading {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(51 65 85);
}

.insight-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.15rem 0.5rem;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.65rem 0.75rem;
}

.insight-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.insight-row strong {
  font-size: 0.82rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.insight-row small {
  grid-column: 1 / -1;
  font-size: 0.72rem;
  color: rgb(100 116 139);
}

.dark .panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .panel-title,
.dark .stat-tile strong,
.dark .insight-row span,
.dark .insight-heading {
  color: rgb(248 250 252);
}

.dark .score-badge {
  background: rgb(20 83 45);
  color: rgb(187 247 208);
}

.dark .weak-answer-group {
  border-color: rgb(136 19 55);
  background: rgb(76 5 25);
}

.dark .weak-answer-head p,
.dark .weak-answer-row small {
  color: rgb(253 164 175);
}

.dark .weak-answer-row {
  background: rgb(15 23 42);
}

.dark .weak-answer-row span {
  color: rgb(248 250 252);
}

.dark .stat-tile,
.dark .insight-row {
  background: rgb(2 6 23);
}

.dark .state-box {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(203 213 225);
}

.dark .skeleton-line,
.dark .skeleton-tile {
  background: linear-gradient(90deg, rgb(15 23 42), rgb(30 41 59), rgb(15 23 42));
  background-size: 200% 100%;
}

@keyframes pulse {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}
</style>
