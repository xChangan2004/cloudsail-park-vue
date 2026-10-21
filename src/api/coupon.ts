import {get, put, post, del} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

export interface CouponTemplatePageVO {
  id: string
  name: string
  threshold: number
  amount: number
  totalCount: number
  issuedCount: number
  receivedRate: number
  perLimit: number
  validDays: number
  status: number
  createTime: string
}

export interface CouponTemplatePageParams extends PageParams {
  name?: string
  status?: number
}

/** 分页查询优惠券模板 */
export const pageTemplateApi = (params: CouponTemplatePageParams) => {
  return get<PageDTO<CouponTemplatePageVO>>('/admin/coupon/template/page', params)
}

/** 切换模板状态 */
export const updateTemplateStatusApi = (id: string, status: number) => {
  return put(`/admin/coupon/template/status/${id}?status=${status}`)
}

export interface CouponTemplateFormDTO {
  id: string | null
  name?: string
  threshold?: number
  amount?: number
  totalCount?: number
  perLimit?: number
  validDays?: number
}

/** 保存优惠券模板 */
export const saveTemplateApi = (data: CouponTemplateFormDTO) => {
  return post('/admin/coupon/template', data)
}

/** 编辑优惠券模板 */
export const editTemplateApi = (data: CouponTemplateFormDTO) => {
  return put('/admin/coupon/template', data)
}

/** 删除优惠券模板 */
export const delTemplateApi = (id: string) => {
  return del(`/admin/coupon/template/${id}`)
}