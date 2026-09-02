import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router'
import {useTagsViewStore, useUserStore} from '@/stores'
import {buildRoutesFromMenus} from '@/utils/menu'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录'
    }
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 动态路由是否已注册（登出时重置）
let isRoutesAdded = false
// addRoute 返回的移除函数，登出时统一调用，确保路由表彻底清干净
let routeRemovers: Array<() => void> = []

/**
 * 彻底清理动态路由（含父级 Layout 路由、兜底路由、/ 重定向）并复位标记
 * 登出、401 过期统一走这里
 */
export function resetRouteState() {
  routeRemovers.forEach(remove => remove())
  routeRemovers = []
  isRoutesAdded = false
}

// 前置路由守卫
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  // 1.未登录，跳转至 /login
  if (!userStore.token && to.path !== '/login') {
    return {
      path: '/login',
      replace: true
    }
  }

  // 2.已登录访问登录页，跳转首页（防止重复登录）
  if (userStore.token && to.path === '/login') {
    return {
      path: '/dashboard'
    }
  }

  // 3.注册动态路由（登录后首次导航/F5刷新）。必须已登录才注册，
  // 否则登录页会把空菜单注册进去并置位标记，登录后真实路由永远不注册 → 兜底路由死循环爆栈
  if (userStore.token && !isRoutesAdded) {
    const first = userStore.menus[0]?.path

    buildRoutesFromMenus(userStore.menus).forEach(r => routeRemovers.push(router.addRoute(r)))
    // 兜底路由最后补（必须在动态路由之后注册），指向第一个菜单
    routeRemovers.push(router.addRoute({path: '/:pathMatch(.*)*', redirect: first ?? '/dashboard'}))
    // '/' 指向第一个菜单
    if (first) routeRemovers.push(router.addRoute({path: '/', redirect: first}))

    isRoutesAdded = true
    // 重新导航一次，让本次 to 能匹配新路由表
    await router.replace(to.fullPath)
    return false
  }
})

// 后置路由守卫
router.afterEach((to) => {
  // 设置页面标题
  document.title = to.meta?.title ? `${to.meta.title} - 云帆智泊` : '云帆智泊'

  // 记录标签（登录页不进标签栏）
  if (to.meta?.title && to.name !== 'Login') {
    useTagsViewStore().addTag({
      path: to.fullPath,
      title: to.meta.title as string,
      name: to.name as string,
      keepAlive: to.meta.keepAlive
    })
  }
})

export default router
