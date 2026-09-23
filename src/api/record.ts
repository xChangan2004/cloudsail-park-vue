import {get} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

/** 入场类型 */
export type EntryType = 1 | 2

/** 状态 */
export type EntryExitStatus = 0 | 1 | 2

/** 出入场记录分页查询参数 */
export interface EntryExitRecordQuery extends PageParams {
  lotId?: string
  customerId?: string
  plateNumber?: string
  entryType?: EntryType
  status?: EntryExitStatus
  beginTime?: string
  endTime?: string
}

/** 出入场记录分页实体 */
export interface EntryExitRecordPageVO {
  id?: string
  lotName?: string
  spaceCode?: string
  customerName?: string
  plateNumber?: string
  entryType?: EntryType
  status?: EntryExitStatus
  entryTime?: string
  exitTime?: string
  duration?: string
  createTime?: string
}

/** 分页查询出入场记录 */
export const pageRecordApi = (params: EntryExitRecordQuery) => {
  return get<PageDTO<EntryExitRecordPageVO>>('/admin/record/page', params)
}