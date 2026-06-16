import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import { loadContentTypeOptions } from './utils/contentTypes'
import './styles/globals.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin)

useThemeStore(pinia).initialize()
void useAuthStore(pinia).hydrate()
void loadContentTypeOptions()

app.mount('#app')
