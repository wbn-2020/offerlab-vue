import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import { loadContentTypeOptions } from './utils/contentTypes'
import { registerSessionExpiredHandler } from './utils/sessionExpiry'
import { queryClient } from './lib/queryClient'
import './styles/globals.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin, { queryClient })

// 会话过期时优先走 SPA 软导航 + 提示，避免整页硬刷新丢掉正在输入的评论 / 联系请求。
registerSessionExpiredHandler(async ({ redirect }) => {
  toast.error('登录状态已过期，请重新登录')
  await router.push({
    path: '/login',
    query: { reason: 'session_expired', ...(redirect ? { redirect } : {}) },
  })
  if (router.currentRoute.value.path !== '/login') {
    throw new Error('Session expiry navigation did not reach the login route')
  }
})

useThemeStore(pinia).initialize()
void useAuthStore(pinia).hydrate()
void loadContentTypeOptions()

app.mount('#app')
