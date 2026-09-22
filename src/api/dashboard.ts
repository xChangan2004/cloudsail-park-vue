import {get} from '@/utils/request'

/** 订单状态，对应后端 OrderStatus 枚举 */
export type OrderStatusValue = 0 | 1 | 2 | 3

/** 支付方式，对应后端 PayMethod 枚举 */
export type PayMethodValue = 1 | 2

/**
 * 看板卡片汇总指标
 *
 * 注意口径：
 * - todayIncome 按 paid_time 落在今天统计
 * - totalSpaces 是 COUNT(*)，包含「预留」「维修」车位；freeSpaces/occupiedSpaces 只统计 status=1/2
 *   所以 freeSpaces + occupiedSpaces 可能小于 totalSpaces，算占用率时别硬凑
 */
export interface DashboardCards {
  /** 今日收入 */
  todayIncome: number
  /** 今日入场数 */
  todayEntryCount: number
  /** 今日出场数 */
  todayExitCount: number
  /** 车位总数 */
  totalSpaces: number
  /** 占用车位数 */
  occupiedSpaces: number
  /** 空闲车位数 */
  freeSpaces: number
}

/** 趋势单日数据（后端已补齐近 7 天骨架，无数据的天各字段为 0） */
export interface DashboardTrend {
  /** 日期，格式 yyyy-MM-dd */
  date: string
  /** 当天收入 */
  income: number
  /** 当天入场数 */
  entryCount: number
  /** 当天出场数 */
  exitCount: number
}

/** 订单状态分布（后端按 OrderStatus 枚举补齐全部状态，count 可能为 0） */
export interface OrderDistribution {
  status: OrderStatusValue
  statusDesc: string
  count: number
}

/** 支付方式单项统计 */
export interface PayMethodItem {
  method: PayMethodValue
  methodDesc: string
  /** 支付笔数 */
  count: number
  /** 支付总额 */
  amount: number
}

/**
 * 支付方式统计
 *
 * 注意口径：后端此接口（含 totalRefund）没有时间窗口，返回的是**累计全量**，
 * 与卡片区的「今日」指标口径不同，页面上必须标注清楚。
 */
export interface PayMethodStat {
  methods: PayMethodItem[]
  /** 累计退款金额 */
  totalRefund: number
}

/** 平台指标趋势单日数据（后端已补齐 N 天骨架，没有注册的天为 0） */
export interface RegisterTrendPoint {
  /** 日期，格式 yyyy-MM-dd */
  date: string
  /** 当天注册数 */
  registerCount: number
}

/**
 * 平台级指标（全局，不受停车场筛选影响）
 *
 * 口径说明：
 * - 数据源是 `customer` 表（C 端车主），它**没有 lot_id**，所以这些数字与「业务指标」不同，不随车场变化；
 * - `todayRegisterCount` / `yesterdayRegisterCount` 由后端从 `registerTrend` 骨架派生，
 *   与折线同源，不会出现「卡片说今日 5 人、折线最后一点是 4」的矛盾；
 * - 注意本项目「用户」有歧义：这里统计的是车主 `Customer`，**不是**后台账号 `SysUser`。
 */
export interface DashboardPlatform {
  /** 今日注册数 */
  todayRegisterCount: number
  /** 昨日注册数，用于算「较昨日 +N」 */
  yesterdayRegisterCount: number
  /** 累计注册数（与趋势窗口无关） */
  totalRegisterCount: number
  /** 趋势实际窗口天数：请求的 days 会被后端 clamp 到 7~90，这里回显真实值 */
  trendDays: number
  /** 注册趋势（近 N 天） */
  registerTrend: RegisterTrendPoint[]
}

/**
 * 平台级指标
 *
 * ⚠️ 与其它四个接口不同，这个接口**没有 lotId 参数**（刻意的）：
 * 注册是平台级事件，跟随停车场筛选没有意义。
 * 因此切换停车场时**不要**重新请求它，否则拆接口的收益就白费了。
 */
export const getDashboardPlatformApi = (days = 30) => {
  return get<DashboardPlatform>('/admin/dashboard/platform', {days})
}

/** 获取看板卡片汇总指标 */
export const getDashboardCardsApi = (lotId?: string) => {
  return get<DashboardCards>('/admin/dashboard/cards', {lotId})
}

/** 近 7 天收入与车流趋势 */
export const getDashboardTrendApi = (lotId?: string) => {
  return get<DashboardTrend[]>('/admin/dashboard/trend', {lotId})
}

/** 订单状态分布 */
export const getOrderDistributionApi = (lotId?: string) => {
  return get<OrderDistribution[]>('/admin/dashboard/distribution', {lotId})
}

/** 支付方式统计 */
export const getPayMethodStatApi = (lotId?: string) => {
  return get<PayMethodStat>('/admin/dashboard/pay-method', {lotId})
}
