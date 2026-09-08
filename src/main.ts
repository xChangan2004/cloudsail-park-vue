import {createApp} from 'vue'

import {createPinia} from 'pinia'
import persisted from 'pinia-plugin-persistedstate'

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'

import '@/styles/index.scss'

import {permission} from '@/directives/permission'

// svg图标
// @ts-ignore
import 'virtual:svg-icons-register'
import SvgIcon from './components/SvgIcon/index.vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

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

// 注册SvgIcon组件
app.component('SvgIcon', SvgIcon)
// 全局注册ElementPlus图标
for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(name, component)
}

app.directive('perm', permission)

app.mount('#app')
