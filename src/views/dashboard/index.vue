<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {Loading, Refresh} from '@element-plus/icons-vue'
import {
  getDashboardCardsApi,
  getDashboardPlatformApi,
  getDashboardTrendApi,
  getOrderDistributionApi,
  getPayMethodStatApi,
  type DashboardCards,
  type DashboardPlatform,
  type DashboardTrend,
  type OrderDistribution,
  type PayMethodStat
} from '@/api/dashboard'
import {pageParkingLotApi} from '@/api/parkingLot'
import {useDashboardPolling} from '@/hooks/useDashboardPolling'
import TrendChart from './components/TrendChart.vue'
import OrderDonutChart from './components/OrderDonutChart.vue'
import RegisterTrendChart from './components/RegisterTrendChart.vue'

/**
 * 组件名必须与「路由 name」一致，否则 keep-alive 的 include 匹配不上（tagsView.cachedViews 存的是路由 name）。
 * 路由 name 由菜单 path 推导（见 src/utils/menu.ts 的 toRouteName）：
 * 菜单种子 docs/rbac.sql 是「目录 /dashboard」+「菜单 index」，故 fullPath = /dashboard/index → name = DashboardIndex。
 * ⚠️ 改这里之前先确认 sys_menu 里看板菜单的层级，改错不会报错，只会静默失去缓存。
 */
defineOptions({name: 'DashboardIndex'})

/** 当前所选停车场，空字符串表示全部 */
const lotId = ref('')
const lotOptions = ref<{ id: string; name: string }[]>([])

const cards = ref<DashboardCards>()
const trend = ref<DashboardTrend[]>([])
const distribution = ref<OrderDistribution[]>([])
const payStat = ref<PayMethodStat>()

/** 平台指标：全局数据，与 lotId 无关 */
const platform = ref<DashboardPlatform>()
/** 平台趋势窗口天数，后端会 clamp 到 7~90 */
const platformDays = ref(30)

/**
 * 拉取全部看板数据
 *
 * 四个接口并发；用 allSettled 而不是 all —— 单个接口挂了只保留它上一次的数据，
 * 不会整页闪空（失败提示由 request 拦截器统一弹）。
 */
const loadAll = async () => {
  const lot = lotId.value || undefined
  const results = await Promise.allSettled([
    getDashboardCardsApi(lot),
    getDashboardTrendApi(lot),
    getOrderDistributionApi(lot),
    getPayMethodStatApi(lot)
  ])

  // allSettled 的结果是「不同类型 PromiseSettledResult 的联合」，直接下标访问无法收窄，
  // 这里按调用方的期望类型断言一次，拿到 undefined 就说明该项失败
  const pick = <T,>(index: number): T | undefined => {
    const result = results[index] as PromiseSettledResult<T> | undefined
    return result?.status === 'fulfilled' ? result.value : undefined
  }

  const nextCards = pick<DashboardCards>(0)
  const nextTrend = pick<DashboardTrend[]>(1)
  const nextDistribution = pick<OrderDistribution[]>(2)
  const nextPayStat = pick<PayMethodStat>(3)

  if (nextCards) cards.value = nextCards
  if (nextTrend) trend.value = nextTrend
  if (nextDistribution) distribution.value = nextDistribution
  if (nextPayStat) payStat.value = nextPayStat
}

const {loading, refreshing, updatedAt, refresh} = useDashboardPolling(loadAll)

/**
 * 平台指标单独轮询
 *
 * - 不带 lotId：切换停车场不会重拉，这正是把它拆成独立接口的收益；
 * - 间隔 5 分钟而不是 60 秒：注册数是慢变量，跟着业务指标高频刷没有意义。
 *   代价是它的刷新时刻和上方业务区不同，所以时间戳分开显示（挂在趋势卡片上）。
 */
const loadPlatform = async () => {
  try {
    platform.value = await getDashboardPlatformApi(platformDays.value)
  } catch {
    // 失败时保留上一次数据，错误提示由 request 拦截器统一弹出。
    // 注意：后端 /platform 接口尚未实现时这里会 404，页面显示 -- 而不是 0
  }
}

const {
  loading: platformLoading,
  refreshing: platformRefreshing,
  updatedAt: platformUpdatedAt,
  refresh: platformRefresh
} = useDashboardPolling(loadPlatform, 5 * 60 * 1000)

/** 切换停车场：只重拉业务区，平台区不动 */
const handleLotChange = () => {
  void refresh()
}

/** 手动刷新：两个区都拉，避免「点了刷新但下面没动」的观感 */
const handleRefresh = async () => {
  await Promise.all([refresh(), platformRefresh()])
}

/** 切换趋势窗口：只影响平台区，立即重拉不等下一个轮询周期 */
const handleDaysChange = () => {
  void platformRefresh()
}

onMounted(async () => {
  try {
    const page = await pageParkingLotApi({pageNo: 1, pageSize: 200})
    lotOptions.value = page.list.map(lot => ({id: lot.id as string, name: lot.name}))
  } catch {
    // 停车场下拉加载失败不影响看板主流程
  }
})

/** 金额：带千分位和两位小数 */
const money = (v?: number) => `¥${Number(v ?? 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`

/** 整数：带千分位 */
const int = (v?: number) => Number(v ?? 0).toLocaleString('zh-CN')

/**
 * 平台指标的数字渲染
 *
 * 取不到数据时显示 -- 而不是 0：「接口挂了」和「今天真的没人注册」是两件事，
 * 渲染成 0 会让运营误判。
 */
const pNum = (v?: number) => (platform.value ? int(v) : '--')

/** 今日相对昨日的增减：纯展示逻辑，由前端算，后端只给两个原始值 */
const delta = computed(() => {
  if (!platform.value) return undefined
  return Number(platform.value.todayRegisterCount ?? 0) - Number(platform.value.yesterdayRegisterCount ?? 0)
})

const deltaText = computed(() => {
  if (delta.value === undefined) return ''
  if (delta.value === 0) return '持平'
  return delta.value > 0 ? `+${int(delta.value)}` : `-${int(Math.abs(delta.value))}`
})

const deltaClass = computed(() => {
  if (delta.value === undefined || delta.value === 0) return ''
  return delta.value > 0 ? 'metric__hint--up' : 'metric__hint--down'
})

/**
 * 车位统计
 *
 * 后端口径有个需要注意的地方：totalSpaces 是 COUNT(*)，包含「预留(3)」「维修(4)」车位，
 * 而 freeSpaces / occupiedSpaces 只统计 status=1 / 2。所以 free + occupied 可能小于 total，
 * 差额要显式暴露出来，不能拿它去凑总数，否则占用率会算不准。
 */
const space = computed(() => {
  const total = Number(cards.value?.totalSpaces ?? 0)
  const free = Number(cards.value?.freeSpaces ?? 0)
  const occupied = Number(cards.value?.occupiedSpaces ?? 0)
  const other = Math.max(total - free - occupied, 0)
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0
  return {total, free, occupied, other, rate}
})

/** 支付方式配色，贴近各自品牌色 */
const PAY_COLOR: Record<number, string> = {
  1: '#1677FF', // 支付宝
  2: '#07C160'  // 微信
}

/**
 * 支付方式对比条
 *
 * PayMethod 只有「支付宝 / 微信」两个取值，双扇区饼图信息量太低，用横向对比条更易读。
 * 百分比以支付总额为分母，两条加起来是 100%。
 */
const payRows = computed(() => {
  const methods = payStat.value?.methods ?? []
  const sum = methods.reduce((total, item) => total + Number(item.amount ?? 0), 0)
  return methods.map(item => {
    const amount = Number(item.amount ?? 0)
    return {
      method: item.method,
      label: item.methodDesc,
      count: Number(item.count ?? 0),
      amount,
      percent: sum > 0 ? Math.round((amount / sum) * 100) : 0,
      color: PAY_COLOR[item.method] ?? '#409EFF'
    }
  })
})

/** 支付合计，用于卡片底部说明 */
const payTotal = computed(() => {
  const methods = payStat.value?.methods ?? []
  return {
    count: methods.reduce((total, item) => total + Number(item.count ?? 0), 0),
    amount: methods.reduce((total, item) => total + Number(item.amount ?? 0), 0)
  }
})
</script>

<template>
  <div class="dashboard" v-loading="loading && !updatedAt">
    <div class="dash-toolbar">
      <div class="dash-toolbar__left">
        <span class="dash-toolbar__title">数据看板</span>
        <el-select
          v-model="lotId"
          placeholder="全部停车场"
          style="width: 220px"
          @change="handleLotChange"
        >
          <el-option label="全部停车场" value=""/>
          <el-option v-for="lot in lotOptions" :key="lot.id" :label="lot.name" :value="lot.id"/>
        </el-select>
      </div>
      <div class="dash-toolbar__right">
        <span class="dash-toolbar__meta">
          <template v-if="refreshing || platformRefreshing">
            <el-icon class="is-loading">
              <Loading/>
            </el-icon>
            刷新中
          </template>
          <template v-else-if="updatedAt">更新于 {{ updatedAt }}</template>
          <template v-else>尚未加载</template>
        </span>
        <el-button :icon="Refresh" :loading="loading || platformLoading" @click="handleRefresh">刷新</el-button>
      </div>
    </div>

    <!-- 业务指标分区：所有指标都受顶部停车场筛选影响，分区标题把这件事写死，避免运营误读 -->
    <section class="dash-group">
      <div class="dash-group__head">
        <span class="dash-group__title">业务指标</span>
        <span class="dash-group__tag">随所选停车场变化</span>
      </div>

      <div class="dash-metrics">
        <div class="metric">
          <div class="metric__label">今日收入</div>
          <div class="metric__value metric__value--income">{{ money(cards?.todayIncome) }}</div>
          <div class="metric__hint">按支付时间统计</div>
        </div>
        <div class="metric">
          <div class="metric__label">今日入场</div>
          <div class="metric__value">
            {{ int(cards?.todayEntryCount) }}<span class="metric__suffix">辆次</span>
          </div>
          <div class="metric__hint">今日已入场车辆</div>
        </div>
        <div class="metric">
          <div class="metric__label">今日出场</div>
          <div class="metric__value">
            {{ int(cards?.todayExitCount) }}<span class="metric__suffix">辆次</span>
          </div>
          <div class="metric__hint">今日已出场车辆</div>
        </div>
        <div class="metric">
          <div class="metric__label">车位占用</div>
          <div class="metric__value">
            {{ int(space.occupied) }}<span class="metric__suffix">/ {{ int(space.total) }}</span>
          </div>
          <div class="metric__bar">
            <div class="metric__bar-inner" :style="{width: space.rate + '%'}"></div>
          </div>
          <div class="metric__hint">
            空闲 {{ int(space.free) }}
            <template v-if="space.other > 0">· 预留/维修 {{ int(space.other) }}</template>
          </div>
        </div>
      </div>

      <div class="dash-row dash-row--main">
        <div class="card">
          <div class="card__head">
            <span class="card__title">近 7 天收入与车流趋势</span>
            <span class="card__sub">左轴收入 · 右轴车流</span>
          </div>
          <TrendChart :data="trend" height="280px"/>
        </div>
        <div class="card">
          <div class="card__head">
            <span class="card__title">订单状态分布</span>
          </div>
          <OrderDonutChart :data="distribution" height="280px"/>
        </div>
      </div>

      <div class="dash-row dash-row--bottom">
        <div class="card">
          <div class="card__head">
            <span class="card__title">支付方式构成</span>
            <span class="card__sub">累计</span>
          </div>
          <div v-if="payRows.length" class="pay">
            <div v-for="row in payRows" :key="row.method" class="pay__row">
              <span class="pay__name">{{ row.label }}</span>
              <span class="pay__track">
                <span class="pay__fill" :style="{width: row.percent + '%', background: row.color}"></span>
              </span>
              <span class="pay__value">{{ money(row.amount) }} · {{ int(row.count) }} 笔 · {{ row.percent }}%</span>
            </div>
          </div>
          <div v-else class="card__empty">暂无支付数据</div>
          <p v-if="payRows.length" class="card__note">
            累计支付 {{ int(payTotal.count) }} 笔，合计 {{ money(payTotal.amount) }}。
          </p>
        </div>
        <div class="card">
          <div class="card__head">
            <span class="card__title">累计退款</span>
          </div>
          <div class="refund">
            <span class="refund__value">{{ money(payStat?.totalRefund) }}</span>
          </div>
          <p class="card__note">
            为历史累计值，与上方卡片区的「今日」指标口径不同，注意区分。
          </p>
        </div>
      </div>
    </section>

    <!-- 平台指标分区 -->
    <section
      class="dash-group dash-group--platform"
      v-loading="platformLoading && !platformUpdatedAt"
    >
      <div class="dash-group__head">
        <span class="dash-group__title">平台指标</span>
        <span class="dash-group__tag">全平台通用，不随停车场筛选</span>
      </div>

      <div class="dash-metrics dash-metrics--3">
        <div class="metric">
          <div class="metric__label">今日注册车主</div>
          <div class="metric__value">
            {{ pNum(platform?.todayRegisterCount) }}<span class="metric__suffix">人</span>
          </div>
          <div class="metric__hint" :class="deltaClass">
            <template v-if="deltaText">较昨日 {{ deltaText }}</template>
            <template v-else>较昨日 —</template>
          </div>
        </div>
        <div class="metric">
          <div class="metric__label">昨日注册车主</div>
          <div class="metric__value">
            {{ pNum(platform?.yesterdayRegisterCount) }}<span class="metric__suffix">人</span>
          </div>
          <div class="metric__hint">昨日全天新增</div>
        </div>
        <div class="metric">
          <div class="metric__label">累计注册车主</div>
          <div class="metric__value">
            {{ pNum(platform?.totalRegisterCount) }}<span class="metric__suffix">人</span>
          </div>
          <div class="metric__hint">历史累计，与趋势窗口无关</div>
        </div>
      </div>

      <div class="dash-row dash-row--full">
        <div class="card">
          <div class="card__head">
            <span class="card__title">车主注册趋势</span>
            <div class="card__actions">
              <span class="card__sub">
                <template v-if="platform">近 {{ platform.trendDays }} 天</template>
                <template v-else>窗口未知</template>
                ·
                <template v-if="platformRefreshing">刷新中</template>
                <template v-else>更新于 {{ platformUpdatedAt || '--:--:--' }}</template>
              </span>
              <el-radio-group v-model="platformDays" size="small" @change="handleDaysChange">
                <el-radio-button :value="7">7 天</el-radio-button>
                <el-radio-button :value="30">30 天</el-radio-button>
                <el-radio-button :value="90">90 天</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <RegisterTrendChart
            :data="platform?.registerTrend ?? []"
            :days="platform?.trendDays"
            height="260px"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

/* ---------- 顶部工具栏 ---------- */
.dash-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 14px 20px;
  background: var(--el-bg-color);
  border: 1px solid #e3e8ee;
  border-radius: 8px;

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  &__meta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #909399;
  }
}

/* ---------- 指标分区标题 ---------- */
.dash-group {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    position: relative;
    padding-left: 11px;
    font-size: 15px;
    font-weight: 600;
    color: #303133;

    /* 左侧竖条：和卡片标题拉开层级，一眼看出这是分区 */
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 14px;
      border-radius: 2px;
      background: #409eff;
    }
  }

  &__tag {
    padding: 1px 8px;
    font-size: 12px;
    line-height: 18px;
    color: #409eff;
    background: #ecf5ff;
    border: 1px solid #d9ecff;
    border-radius: 10px;
  }
}

/* 平台指标分区：琥珀色标题条 + 中性色标签，和蓝色系的业务区形成区分 */
.dash-group--platform {
  margin-top: 8px;

  .dash-group__title::before {
    background: #e6a23c;
  }

  .dash-group__tag {
    color: #909399;
    background: #f4f4f5;
    border-color: #e9e9eb;
  }
}

/* ---------- 指标卡片 ---------- */
.dash-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 平台区只有 3 张卡 */
.dash-metrics--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.metric {
  padding: 18px 20px;
  background: #f7f9fb;
  border: 1px solid #e3e8ee;
  border-radius: 8px;

  &__label {
    font-size: 13px;
    color: #909399;
  }

  &__value {
    margin-top: 10px;
    font-size: 26px;
    font-weight: 600;
    line-height: 1.2;
    color: #303133;
    font-variant-numeric: tabular-nums;

    &--income {
      color: #409eff;
    }
  }

  &__suffix {
    margin-left: 4px;
    font-size: 14px;
    font-weight: 400;
    color: #909399;
  }

  &__hint {
    margin-top: 8px;
    font-size: 12px;
    color: #a8abb2;
  }

  &__bar {
    margin-top: 12px;
    height: 6px;
    border-radius: 3px;
    background: #e9edf2;
    overflow: hidden;

    &-inner {
      height: 100%;
      border-radius: 3px;
      background: #409eff;
      transition: width 0.4s;
    }
  }
}

/* 今日较昨日的增减：上升为绿（正向），下降为红。注意这不是股票涨跌色，别按红涨绿跌来理解 */
.metric__hint--up {
  color: #67c23a;
}

.metric__hint--down {
  color: #f56c6c;
}

/* ---------- 图表区栅格 ---------- */
.dash-row {
  display: grid;
  gap: 16px;

  &--main {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }

  &--bottom {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }

  /* 单列整行，目前给平台区的注册趋势用 */
  &--full {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: 1200px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.card {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  background: var(--el-bg-color);
  border: 1px solid #e3e8ee;
  border-radius: 8px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  &__sub {
    font-size: 12px;
    color: #a8abb2;
  }

  /* 卡片标题右侧的一组操作（时间戳 + 窗口切换） */
  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 96px;
    font-size: 13px;
    color: #a8abb2;
  }

  &__note {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed #ebeef5;
    font-size: 12px;
    line-height: 1.7;
    color: #a8abb2;
  }
}

/* ---------- 支付方式对比条 ---------- */
.pay {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__name {
    flex: none;
    width: 56px;
    font-size: 13px;
    color: #606266;
  }

  &__track {
    flex: 1;
    height: 14px;
    border-radius: 7px;
    background: #f0f2f5;
    overflow: hidden;
  }

  &__fill {
    display: block;
    height: 100%;
    border-radius: 7px;
    transition: width 0.4s;
  }

  &__value {
    flex: none;
    min-width: 200px;
    text-align: right;
    font-size: 13px;
    color: #303133;
    font-variant-numeric: tabular-nums;
  }
}

/* ---------- 累计退款 ---------- */
.refund {
  display: flex;
  align-items: baseline;

  &__value {
    font-size: 26px;
    font-weight: 600;
    color: #f56c6c;
    font-variant-numeric: tabular-nums;
  }
}
</style>
