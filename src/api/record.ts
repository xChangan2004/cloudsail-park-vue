import {get, post} from '@/utils/request'
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
  /** 停车时长（分钟）。后端 Long → 字符串（JacksonConfig 统一 Long 转 String） */
  duration?: string
  createTime?: string
}

/** 分页查询出入场记录 */
export const pageRecordApi = (params: EntryExitRecordQuery) => {
  return get<PageDTO<EntryExitRecordPageVO>>('/admin/record/page', params)
}

/** 离场表单实体 */
export interface ExitFormDTO {
  id: string
  exitTime: string
}

/** 离场账单 */
export interface ExitBillVO {
  recordId: string
  plateNumber: string
  entryTime: string
  exitTime: string
  duration: string
  ruleName: string
  ruleDesc: string
  amount: number
  orderNo: string
}

/** 手动离场 */
export const manualExitApi = (data: ExitFormDTO) => {
  return post<ExitBillVO>('/admin/record/exit', data)
}

/** 入场表单实体 */
export interface EntryFormDTO {
  lotId: string
  spaceId: string
  plateNumber: string
  entryTime: string
}

/** 手动入场 */
export const manualEntryApi = (data: EntryFormDTO) => {
  return post<null>('/admin/record/entry', data)
}