import {del, get, post, put} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

export const PLATE_NUMBER_REGEX =
  /^(?:[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z](?:[0-9]{5}[ABCDEFGHJK]|[ABCDEFGHJK][A-HJ-NP-Z0-9][0-9]{4})|[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]\d{3}\d{1,3}领|[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳使领])$/;

/** 客户信息分页查询参数 */
export interface CustomerQuery extends PageParams {
  phone?: string
  nickname?: string
  status?: 0 | 1
}

/** 客户信息实体 */
export interface Customer {
  id: string
  openid?: string
  phone?: string
  nickname?: string
  avatar?: string
  status?: 0 | 1
  createTime?: string
}

/** 分页查询客户信息 */
export const pageCustomerApi = (params: CustomerQuery) => {
  return get<PageDTO<Customer>>('/admin/customer/page', params)
}

/** 切换客户状态 */
export const updateCustomerStatusApi = (id: string, status: 0 | 1) => {
  return put<null>(`/admin/customer/${id}/status?status=${status}`)
}

/** 新增/编辑客户表单（不含 status / openid） */
export interface CustomerFormDTO {
  id?: string | null
  phone: string
  nickname: string
  avatar?: string
}

/** 新增客户 */
export const addCustomerApi = (data: CustomerFormDTO) => {
  return post<null>('/admin/customer', data)
}

/** 编辑客户 */
export const editCustomerApi = (data: CustomerFormDTO) => {
  return put<null>('/admin/customer', data)
}

/** 取消微信关联 */
export const unbindWechatApi = (id: string) => {
  return del<null>(`/admin/customer/${id}/wechat/unbind`)
}

/** 能源类型：1 燃油车，2 新能源 */
export type EnergyType = 1 | 2

/** 客户车牌实体 */
export interface CustomerPlate {
  id: string
  customerId: string
  plateNumber: string
  energyType: EnergyType
  /** 后端是 Boolean，不是 0/1 */
  isDefault?: boolean
}

/** 查询某客户的全部车牌（不分页，专为主从表格准备） */
export const listCustomerPlateApi = (customerId: string) => {
  return get<CustomerPlate[]>(`/admin/customer/plate/list/${customerId}`)
}

/** 解绑客户车牌 */
export const unbindCustomerPlateApi = (plateId: string) => {
  return del<null>(`/admin/customer/plate/${plateId}`)
}

/** 绑定车牌 */
export const bindCustomerPlateApi = (data: Omit<CustomerPlate, 'id'>) => {
  return post<null>('/admin/customer/plate', data)
}