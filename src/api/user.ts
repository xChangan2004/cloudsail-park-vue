import {post} from '@/utils/request'

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