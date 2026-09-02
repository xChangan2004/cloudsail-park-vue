import type {RouteRecordRaw} from 'vue-router'
import Layout from '@/layout/index.vue'
import type {MenuVO} from '@/api/user'

// views 下所有页面组件的懒加载映射：{ '../views/dashboard/index.vue': () => import(...) }
const viewModules = import.meta.glob('../views/**/*.vue')

export const joinPath = (parent: string, child: string) => {
  return `${parent}/${child}`.replace(/\/{2,}/g, '/')
}

// 首字母大写：'user' -> 'User'
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

/**
 * 路由 name：'/system/user' -> 'SystemUser'，'/park/space-manage' -> 'ParkSpaceManage'
 * keep-alive 按它匹配组件的 defineOptions name，页面里要写一样的
 */
export const toRouteName = (path: string) => {
  const segments = path.split('/').filter(Boolean)        // ['park', 'space-manage']
  return segments
    .map(seg => seg.split('-').map(capitalize).join(''))   // ['Park', 'SpaceManage']
    .join('')                                              // 'ParkSpaceManage'
}

/**
 * 查找组件加载器，找不到返回 null
 */
const resolveLoader = (component?: string) => {
  if (!component) return null
  const loader = viewModules[`../views/${component}.vue`]
  if (!loader) {
    console.warn(`[menu] 找不到组件：${component}`)
    return null
  }
  return loader
}

/**
 * menu转路由表
 */
const menuToRoutes = (menus: MenuVO[], parentPath: string): RouteRecordRaw[] => {
  return menus
    .filter((m: MenuVO) => m.component)
    .map((m: MenuVO) => {
      const loader = resolveLoader(m.component)
      const fullPath = joinPath(parentPath, m.path)
      return {
        path: fullPath,
        name: toRouteName(fullPath), // 如 SystemUser，登出时按名移除
        component: loader,
        meta: {
          title: m.name,
          icon: m.icon,
          keepAlive: m.keepAlive ?? false
        }
      } as RouteRecordRaw
    })
    .filter(Boolean) as RouteRecordRaw[]
}

/**
 * 顶级菜单树
 */
export const buildRoutesFromMenus = (menus: MenuVO[]): RouteRecordRaw[] => {
  return menus.map((m: MenuVO) => {
    if (m.type === 2 && m.component) {
      const loader = resolveLoader(m.component)
      return {
        path: m.path,
        component: Layout,
        children: [{
          path: '', // 空路径 = 访问父路径本身时渲染此页面
          name: toRouteName(m.path),
          component: loader,
          meta: {
            title: m.name,
            icon: m.icon,
            keepAlive: m.keepAlive ?? false
          }
        }]
      }
    }
    // 目录
    return {
      path: m.path,
      component: Layout,
      children: menuToRoutes(m.children ?? [], m.path),
    }
  }) as RouteRecordRaw[]
}
