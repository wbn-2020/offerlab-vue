<template>
  <section class="panel">
    <h2 class="panel-title">开始一场练习</h2>
    <form class="mt-4 space-y-3" @submit.prevent="$emit('submit')">
      <label class="field-label">
        公司
        <input v-model.trim="model.company" class="field-input" placeholder="例如 字节跳动" />
      </label>
      <label class="field-label">
        岗位
        <input v-model.trim="model.position" class="field-input" placeholder="例如 Java 后端" />
      </label>
      <label class="field-label">
        专项标签
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
      <button type="submit" class="primary-action w-full" :disabled="isStarting">
        {{ isStarting ? '抽题中...' : '开始模拟面试' }}
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

:global(.dark) .panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .panel-title,
:global(.dark) .field-input {
  color: rgb(248 250 252);
}

:global(.dark) .field-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
}
</style>