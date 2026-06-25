<template>
  <section class="panel">
    <h2 class="panel-title">历史练习入口</h2>
    <p class="panel-note">该入口仅用于把旧练习内容沉淀为个人知识卡，不作为社区主路径。</p>
    <form class="mt-4 space-y-3" @submit.prevent="$emit('submit')">
      <label class="field-label">
        主题方向
        <input v-model.trim="model.company" class="field-input" placeholder="例如 Redis 排障 / 网关鉴权" />
      </label>
      <label class="field-label">
        应用场景
        <input v-model.trim="model.position" class="field-input" placeholder="例如 性能优化 / 部署运维" />
      </label>
      <label class="field-label">
        复盘标签
        <input v-model.trim="model.focusTag" class="field-input" placeholder="例如 Redis / JVM" />
      </label>
      <label class="field-label">
        难度
        <select v-model="model.difficulty" class="field-input">
          <option value="">不限</option>
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
      </label>
      <label class="field-label">
        题数
        <select v-model.number="model.questionCount" class="field-input">
          <option :value="3">3 题</option>
          <option :value="5">5 题</option>
          <option :value="8">8 题</option>
        </select>
      </label>
      <p v-if="serviceUnavailable" class="service-warning">
        {{ unavailableMessage || '知识复盘服务暂时不可用，请稍后重试。' }}
      </p>
      <button type="submit" class="primary-action w-full" :disabled="isStarting || serviceUnavailable">
        {{ isStarting ? '生成中...' : serviceUnavailable ? '服务暂不可用' : '开始知识复盘' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
type StartFormModel = {
  company: string
  position: string
  difficulty: string
  focusTag: string
  questionCount: number
}

defineProps<{
  isStarting: boolean
  serviceUnavailable?: boolean
  unavailableMessage?: string
}>()

defineEmits<{
  submit: []
}>()

const model = defineModel<StartFormModel>({ required: true })
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

.panel-note {
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(100 116 139);
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(71 85 105);
}

.field-input {
  margin-top: 0.45rem;
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid rgb(203 213 225);
  background: rgb(248 250 252);
  padding: 0.75rem 0.85rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
}

.primary-action {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: rgb(37 99 235);
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: white;
}

.service-warning {
  border-radius: 0.65rem;
  border: 1px solid rgb(254 215 170);
  background: rgb(255 247 237);
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.5;
  color: rgb(154 52 18);
}

.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.dark .panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .panel-title,
.dark .field-input {
  color: rgb(248 250 252);
}

.dark .panel-note {
  color: rgb(148 163 184);
}

.dark .field-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
}

.dark .service-warning {
  border-color: rgb(124 45 18);
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
}
</style>
