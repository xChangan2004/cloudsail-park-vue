import {useUserStore} from '@/stores'

/**
 * 权限判断（按钮/页面/菜单）
 * @param code 权限编码，如 'system:user:add'：数组表示"满足其一即可"
 */
export const hasPerm = (code: string | string[]): boolean => {
  const userStore = useUserStore()

  // 超级管理员直接放行
  if (userStore.isSuperAdmin) return true

  if (!code) return true // 没配权限要求的，直接放行

  const required = Array.isArray(code) ? code : [code]
  // 用户权限列表
  const perms = userStore.permList

  return required.some(c => {
    // 全局通配符 *
    if (perms.includes('*')) return true
    // 精确匹配
    if (perms.includes(c)) return true
    // 生成多级通配候选集合
    const parts = c.split(':')
    for (let i = 1; i < parts.length; i++) {
      const wildCard = [...parts.slice(0, i), '*'].join(':')
      if (perms.includes(wildCard)) {
        return true
      }
    }

    return false
  })
}