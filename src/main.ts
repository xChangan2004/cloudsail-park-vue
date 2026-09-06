import {createApp} from 'vue'
import {createPinia} from 'pinia'
import persisted from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import '@/styles/index.scss'
import {permission} from '@/directives/permission'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
pinia.use(persisted)
app.use(pinia)
app.use(ElementPlus, {
  locale: zhCn
})
app.use(router)

app.directive('perm', permission)

app.mount('#app')
