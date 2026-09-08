import {get} from '@/utils/request'

/**
 * 菜单节点（菜单管理表格 & 角色分配权限树共用同一接口、同一类型）
 */
export interface MenuSimpleVO {
  id: string
  parentId: string
  name: string
  /** 权限标识，如 system:user:add（目录可能为空） */
  permission?: string
  /** 1=目录 2=菜单 3=按钮 */
  type: 1 | 2 | 3
  sort?: number
  path?: string
  icon?: string
  component?: string
  status?: 0 | 1
  createTime?: string
  children?: MenuSimpleVO[]
}

/**
 * 菜单树：菜单管理表格、角色分配权限树共用
 */
export const menuListApi = () => {
  return get<MenuSimpleVO[]>('/admin/system/menu/list')
}
