import {get} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

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