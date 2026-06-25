import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const taskApi = readFileSync(new URL('../src/api/tasks.ts', import.meta.url), 'utf8')
const homeView = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')

assert.match(taskApi, /\/api\/v1\/me\/onboarding-tasks/, 'task api must expose onboarding task endpoint')
assert.match(taskApi, /\/api\/v1\/me\/daily-tasks/, 'task api must expose daily task endpoint')
assert.match(taskApi, /completeOnboardingTask/, 'task api must expose onboarding completion request')
assert.match(taskApi, /completeDailyTask/, 'task api must expose daily completion request')

assert.match(homeView, /taskSections/, 'HomeView must compute visible task sections')
assert.match(homeView, /refreshTaskPanels/, 'HomeView must be able to refresh task panel state')
assert.match(homeView, /handleTaskAction/, 'HomeView must handle task action clicks')
assert.match(homeView, /task-progress-pill/, 'HomeView must render task progress pill')
assert.match(homeView, /新人任务链|每日任务 Lite/, 'HomeView must surface stage 2 task panel copy')

console.log('stage2 task panel guard passed')
