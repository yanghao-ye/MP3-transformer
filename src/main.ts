import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err)
  console.error('Component:', instance?.$options?.name || 'Anonymous')
  console.error('Info:', info)

  // 显示用户友好的错误提示
  const message = err instanceof Error ? err.message : '应用发生错误'
  alert(`错误: ${message}\n\n如果问题持续出现，请刷新页面或提交反馈。`)
}

app.use(createPinia())
app.use(router)

app.mount('#app')
