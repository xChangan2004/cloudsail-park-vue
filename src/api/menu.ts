import {get, del} from '@/utils/request'

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
  status: 0 | 1
  createTime?: string
  children?: MenuSimpleVO[]
}

/**
 * 菜单查询参数（菜单管理搜索用）
 */
export interface MenuQueryParams {
  name?: string
  type?: 1 | 2 | 3
  status?: 0 | 1
}

/**
 * 菜单树：菜单管理表格、角色分配权限树共用
 */
export const menuListApi = (params: MenuQueryParams) => {
  return get<MenuSimpleVO[]>('/admin/system/menu/list', params)
}

/**
 * 删除菜单
 */
export const delMenuApi = (id: string) => {
  return del<null>(`/admin/system/menu/${id}`)
}