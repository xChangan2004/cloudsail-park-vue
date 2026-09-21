import {get, post, put, del} from '@/utils/request'
import type {PageDTO, PageParams} from '@/types/api'

/** 车位类型：普通 | 新能源 */
export type SpaceType = 1 | 2

/** 车位状态：空闲 | 占用 | 已预约 | 维护中 */
export type SpaceStatus = 1 | 2 | 3 | 4

/** 车位（后端 Long 全局序列化为 string，id 声明为 string；type 以获得隐式索引签名，兼容 el-table slot 标注） */
export type ParkingSpace = {
  id: string
  lotId: string
  spaceCode: string
  spaceType: SpaceType
  status: SpaceStatus
  createTime: string
  updateTime: string
}

/** 分页查询参数（lotId 必传） */
export interface ParkingSpacePageParams extends PageParams {
  lotId: string
  spaceCode?: string
  spaceType?: SpaceType
  status?: SpaceStatus
}

/** 表单提交 DTO（lotId 由页面当前选中场带入，不进表单） */
export interface ParkingSpaceFormDTO {
  id: string | null
  spaceCode: string
  spaceType: SpaceType
  status: SpaceStatus
}

/**
 * 分页查询车位列表
 */
export const pageParkingSpaceApi = (params: ParkingSpacePageParams) => {
  return get<PageDTO<ParkingSpace>>('/admin/parking/space/page', params)
}

/**
 * 查询车位详情
 */
export const getParkingSpaceApi = (id: string) => {
  return get<ParkingSpace>('/admin/parking/space/' + id)
}

/**
 * 新增车位（status 由调用方传，新增传 1 空闲）
 */
export const addParkingSpaceApi = (data: ParkingSpaceFormDTO & { lotId: string }) => {
  return post<null>('/admin/parking/space', data)
}

/** 批量新增条目（lotId 提交时统一带上） */
export interface SpaceBatchItem {
  spaceCode: string
  spaceType: SpaceType
}

/**
 * 批量新增车位（每条固定传 1 空闲）
 */
export const saveParkingSpaceBatchApi = (items: SpaceBatchItem[], lotId: string) => {
  return post<null>('/admin/parking/space/batch', items.map(item => ({...item, lotId, status: 1})))
}

/**
 * 编辑车位（status 传原状态，编辑不改状态）
 */
export const editParkingSpaceApi = (data: ParkingSpaceFormDTO & { lotId: string }) => {
  return put<null>('/admin/parking/space', data)
}

/**
 * 切换车位状态（管理端仅允许 空闲 ↔ 维护中）
 */
export const updateParkingSpaceStatusApi = (id: string, status: SpaceStatus) => {
  return put<null>(`/admin/parking/space/${id}/status?status=${status}`)
}

/**
 * 删除车位
 */
export const delParkingSpaceApi = (id: string) => {
  return del<null>('/admin/parking/space/' + id)
}
