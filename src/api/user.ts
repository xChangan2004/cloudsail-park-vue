import {get, post} from '@/utils/request'
import type {PageDTO, PageParams} from '@/types/api'

/**
 * 用户基本信息
 */
export interface UserInfoVO {
  id: number
  username: string
  nickname: string
  avatar: string
  phone: string
}

/**
 * 菜单类型：1=目录 2=菜单 3=按钮
 */
export type MenuType = 1 | 2 | 3

/**
 * 菜单节点
 */
export interface MenuVO {
  id: number
  parentId: number
  name: string
  type: MenuType
  path: string
  component?: string
  icon?: string
  sort?: string
  children?: MenuVO[]
  visible?: boolean
  keepAlive?: boolean
}

/**
 * 登录响应
 */
export interface LoginResult {
  token: string
  userInfo: UserInfoVO
  roleList: string[]
  permList: string[]
  menus: MenuVO[]
}

/**
 * 登录请求参数
 */
export interface LoginFormDTO {
  username: string
  password: string
}

/**
 * 登录
 * @param data 登录表单数据
 */
export const loginApi = (data: LoginFormDTO) => {
  return post<LoginResult>('/admin/system/user/login', data)
}

/**
 * 登出
 */
export const logoutApi = () => {
  return post<null>('/admin/system/user/logout')
}

/**
 * 后台管理的用户信息（列表用）
 */
export interface UserPageVO {
  id: number
  username: string
  nickname: string
  phone: string
  avatar: string
  status: number
  loginIp: string
  loginDate: string
  createTime: string
}

/**
 * 用户分页查询参数
 */
export interface UserPageParams extends PageParams {
  username?: string
  phone?: string
  status?: number
}

/**
 * 分页查询用户列表
 */
export const pageUserApi = (params: UserPageParams) => {
  return get<PageDTO<UserPageVO>>('/admin/system/user/page', params)
}