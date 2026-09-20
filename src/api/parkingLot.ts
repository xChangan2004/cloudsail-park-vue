import {get, post, put, del} from '@/utils/request'
import type {PageDTO, PageParams} from '@/types/api'

export interface ParkingLot {
  id?: string
  name: string
  address?: string
  totalSpaces: number
  longitude?: number
  latitude?: number
  contact?: string
  status: 0 | 1
  createTime: string
  usedSpaces: number
}

export interface ParkingLotPageParams extends PageParams {
  name?: string
  address?: string
  status?: 0 | 1
}

/**
 * 分页查询停车场信息
 */
export const pageParkingLotApi = (params: ParkingLotPageParams) => {
  return get<PageDTO<ParkingLot>>('/admin/parking/lot/page', params)
}

/**
 * 修改停车场状态
 */
export const updateParkingLotStatusApi = (id: string, status: 0 | 1) => {
  return put<null>(`/admin/parking/lot/${id}/status?status=${status}`)
}

export interface ParkingLotFormDTO {
  id: string | null
  name?: string
  address?: string
  longitude?: number
  latitude?: number
  contact?: string
  status?: 0 | 1
}

/**
 * 新增停车场
 */
export const addParkingLotApi = (data: ParkingLotFormDTO) => {
  return post<null>('/admin/parking/lot', data)
}

/**
 * 编辑停车场
 */
export const editParkingLotApi = (data: ParkingLotFormDTO) => {
  return put<null>('/admin/parking/lot', data)
}

/**
 * 查询停车场详情
 */
export const getParkingLotApi = (id: string) => {
  return get<ParkingLotFormDTO>('/admin/parking/lot/' + id)
}

/**
 * 删除停车场
 */
export const delParkingLotApi = (id: string) => {
  return del<null>('/admin/parking/lot/' + id)
}