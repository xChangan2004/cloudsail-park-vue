import {get} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

export interface SysOperateLogVO {
  id: string
  username: string
  type: string
  subType: string
  action?: string
  success: 0 | 1
  errorMsg?: string
  costMs: string
  requestMethod: string
  requestUrl: string
  userIp: string
  createTime: string
}

/**
 * 操作日志分页查询参数
 */
export interface SysOperateLogPageParams extends PageParams {
  userId?: string
  type?: string
  subType?: string
  beginTime?: string
  endTime?: string
  success?: 0 | 1
}

/**
 * 分页查询操作日志
 */
export const pageOperlogApi = (params: SysOperateLogPageParams) => {
  return get<PageDTO<SysOperateLogVO>>('/admin/system/operlog/page', params)
}