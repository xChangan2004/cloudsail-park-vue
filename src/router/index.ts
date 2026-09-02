import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router'
import {useTagsViewStore, useUserStore} from '@/stores'
import Layout from '@/layout/index.vue'
import {hasPerm} from "@/utils/permission"

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '仪表盘',
          icon: 'PieChart'
        }
      },
      {
        path: 'system',
        name: 'System',
        redirect: '/system/user',
        meta: {
          title: '系统管理',
          icon: 'Setting'
        },
        children: [
          {
            path: 'user',
            name: 'User',
            component: () => import('@/views/system/user/index.vue'),
            meta: {
              title: '用户管理',
              icon: 'User',
            }
          },
          {
            path: 'role',
            name: 'Role',
            component: () => import('@/views/system/role/index.vue'),
            meta: {
              title: '角色管理',
              icon: 'User',
            }
          }
        ]
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录'
    }
  },
  // 404兜底，放最后
  {path: '/:pathMatch(.*)*', redirect: '/dashboard'}
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
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

  // 3.页面权限校验，无权限返回首页
  if (to.meta?.perms && !hasPerm(to.meta.perms)) {
    return {
      path: '/dashboard',
      replace: true
    }
  }
})

router.afterEach((to) => {
  // 设置页面标题
  document.title = to.meta?.title ? `${to.meta.title} - 云帆智泊` : '云帆智泊'

  // 记录标签
  if (to.meta?.title) {
    useTagsViewStore().addTag({
      path: to.fullPath,
      title: to.meta.title as string,
      name: to.name as string,
    })
  }
})

export default router
