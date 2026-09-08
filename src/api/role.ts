import {del, get, post, put} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

/** 系统角色 */
export interface SysRole {
  id?: string | null
  name: string
  code: string
  sort?: number
  status?: 0 | 1
  remark: string
  createTime?: string
}

/**
 * 查询所有角色列表
 */
export const listRoleApi = (userId?: string) => {
  return get<SysRole[]>(`/admin/system/role`, {
    userId,
  })
}

/**
 * 角色分页查询参数
 */
export interface RolePageParams extends PageParams {
  name?: string
  code?: string
  status?: 0 | 1
}

/**
 * 分页查询角色列表
 */
export const pageRoleApi = (params: RolePageParams) => {
  return get<PageDTO<SysRole>>('/admin/system/role/page', params)
}

/**
 * 新增角色
 */
export const addRoleApi = (data: SysRole) => {
  return post<null>('/admin/system/role', data)
}

/**
 * 更新角色
 */
export const editRoleApi = (data: SysRole) => {
  return put<null>('/admin/system/role', data)
}

/**
 * 删除角色
 */
export const delRoleApi = (id: string) => {
  return del<null>(`/admin/system/role/${id}`)
}

/**
 * 查询角色已分配的菜单 id 列表
 */
export const getRoleMenuIdsApi = (id: string) => {
  return get<string[]>(`/admin/system/role/${id}/menus`)
}

// 分配角色菜单载荷
export interface AssignRoleMenuDTO {
  roleId: string
  menuIds: string[]
}

/**
 * 给角色分配菜单
 */
export const assignRoleMenusApi = (data: AssignRoleMenuDTO) => {
  return post<null>(`/admin/system/role/assign`, data)
}