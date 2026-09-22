import {del, get, post, put} from '@/utils/request'
import type {PageDTO, PageParams} from "@/types/api";

export type FeeRuleType = 1 | 2 | 3

/** 分页查询参数 */
export interface FeeRuleQuery extends PageParams {
  lotId?: string
  ruleName?: string
  ruleType?: FeeRuleType
  status?: 0 | 1
}

/** 时段 */
export interface TimeSegment {
  start?: string
  end?: string
  rate?: number
}

/** 阶梯 */
export interface Tier {
  endMinutes?: number | null
  rate?: number
}

/** 计费规则实体 */
export interface FeeRule {
  id: string
  lotId: string
  ruleName: string
  ruleType: FeeRuleType
  freeMinutes?: number
  firstHourRate?: number
  additionalRate?: number
  dailyCap?: number
  timeSegments?: TimeSegment[]
  tiers?: Tier[]
  status: 0 | 1
  createTime: string
}

/** 计费规则表单实体 */
export interface FeeRuleFormDTO {
  id?: string | null
  lotId: string
  ruleName: string
  ruleType: FeeRuleType
  freeMinutes?: number
  firstHourRate?: number
  additionalRate?: number
  dailyCap?: number
  timeSegments?: TimeSegment[]
  tiers?: Tier[]
  status: 0 | 1
}

/** 分页查询计费规则 */
export const pageFeeRuleApi = (params: FeeRuleQuery) => {
  return get<PageDTO<FeeRule>>('/admin/parking/fee-rule/page', params)
}

/** 修改计费规则状态 */
export const updateFeeRuleStatusApi = (id: string, status: 0 | 1) => {
  return put<null>(`/admin/parking/fee-rule/${id}/status?status=${status}`)
}

/** 删除计费规则 */
export const delFeeRuleApi = (id: string) => {
  return del<null>(`/admin/parking/fee-rule/${id}`)
}

/** 查询计费详情 */
export const getFeeRuleApi = (id: string) => {
  return get<FeeRule>(`/admin/parking/fee-rule/${id}`)
}

/** 新增计费规则 */
export const addFeeRuleApi = (data: FeeRuleFormDTO) => {
  return post<null>('/admin/parking/fee-rule', data)
}

/** 编辑计费规则 */
export const editFeeRuleApi = (data: FeeRuleFormDTO) => {
  return put<null>(`/admin/parking/fee-rule`, data)
}