import {get, post, put} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

export type OrderStatus = 0 | 1 | 2 | 3

export interface ParkingOrderQuery extends PageParams {
  orderNo?: string
  lotId?: string
  plateNumber?: string
  status?: OrderStatus
  beginTime?: string
  endTime?: string
}

export interface ParkingOrderPageVO {
  id?: string
  orderNo?: string
  lotName?: string
  plateNumber?: string
  customerName?: string
  amount?: number
  discount?: number
  paid?: number
  status?: OrderStatus
  paidTime?: string
  createTime?: string
}

/** 分页查询停车订单 */
export const pageParkingOrderApi = (params: ParkingOrderQuery) => {
  return get<PageDTO<ParkingOrderPageVO>>('/admin/parking/order/page', params)
}

/** 关闭停车订单 */
export const closeOrderApi = (id: string) => {
  return put<null>(`/admin/parking/order/${id}/close`)
}

export interface RefundFormDTO {
  orderNo: string
  reason: string
}

/** 订单退款 */
export const refundOrderApi = (data: RefundFormDTO) => {
  return post<null>('/admin/parking/order/refund', data)
}