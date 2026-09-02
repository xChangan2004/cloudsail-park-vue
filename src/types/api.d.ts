// 后端统一响应结构
export interface Result<T = any> {
  code: number
  data: T
  msg: string
}

// 分页参数
export interface PageParams {
  pageNo: number
  pageSize: number
  isAsc?: boolean
  sortBy?: string
}

// 分页响应
export interface PageDTO<T = any> {
  total: number
  pages: number
  list: T[]
}