import {get} from '@/utils/request'

/** 系统角色 */
export interface SysRole {
  id: string
  name: string
  code: string
  sort: number
  status: 0 | 1
  remark: string
  createTime: string
  isSelected: boolean
}

/**
 * 查询所有角色列表
 */
export const listRoleApi = (userId?: string) => {
  return get<SysRole[]>(`/admin/system/role`, {
    userId,
  })
}