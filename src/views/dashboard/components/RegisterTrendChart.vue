<script setup lang="ts">
import {computed} from 'vue'
import type {EChartsCoreOption} from 'echarts/core'
import BaseChart from './BaseChart.vue'
import type {RegisterTrendPoint} from '@/api/dashboard'

const props = withDefaults(defineProps<{
  data: RegisterTrendPoint[]
  /** 后端回显的实际窗口天数，只用于空态文案；别用它去推 X 轴长度 */
  days?: number
  height?: string
}>(), {
  height: '260px'
})

/**
 * 注册是增长类指标，用绿色，与「业务指标」的蓝色系在视觉上区分开
 */
const COLOR = '#67C23A'

const list = computed(() => props.data ?? [])

const option = computed<EChartsCoreOption>(() => {
  const rows = list.value
  // 后端返回 yyyy-MM-dd，轴上只留 MM-dd；30/90 天时靠 hideOverlap 自动抽稀
  const dates = rows.map(r => (r.date ? r.date.slice(5) : ''))
  const counts = rows.map(r => Number(r.registerCount ?? 0))

  return {
    color: [COLOR],
    tooltip: {
      trigger: 'axis',
      axisPointer: {type: 'line', lineStyle: {color: '#c0c4cc', type: 'dashed'}},
      backgroundColor: '#fff',
      borderColor: '#e3e8ee',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {color: '#303133', fontSize: 12},
      extraCssText: 'box-shadow: 0 2px 12px rgba(0, 0, 0, .08); border-radius: 6px;'
    },
    grid: {top: 16, left: 0, right: 0, bottom: 0, containLabel: true},
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {lineStyle: {color: '#e3e8ee'}},
      axisTick: {show: false},
      axisLabel: {color: '#909399', fontSize: 12, hideOverlap: true}
    },
    yAxis: {
      type: 'value',
      // 注册数只能是整数，否则会出现「0.5 人」这种刻度
      minInterval: 1,
      splitLine: {lineStyle: {color: '#f0f2f5'}},
      axisLine: {show: false},
      axisTick: {show: false},
      axisLabel: {color: '#909399', fontSize: 12}
    },
    series: [
      {
        name: '新增注册',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {width: 2},
        areaStyle: {color: 'rgba(103, 194, 58, .12)'},
        data: counts,
        tooltip: {valueFormatter: (v: number) => `${v ?? 0} 人`}
      }
    ]
  }
})

/** 空态里回显后端实际给的区间，方便确认到底取到了哪几天 */
const rangeText = computed(() => {
  const rows = list.value
  if (!rows.length) return ''
  const first = rows[0]?.date ?? ''
  const last = rows[rows.length - 1]?.date ?? ''
  return `${first} 至 ${last}`
})
</script>

<template>
  <div class="register-chart">
    <BaseChart v-if="list.length" :option="option" :height="height"/>
    <div v-else class="register-chart__empty">
      <p>暂无注册趋势数据</p>
      <p v-if="days" class="register-chart__empty-sub">请求窗口 {{ days }} 天</p>
      <p v-if="rangeText" class="register-chart__empty-sub">统计区间 {{ rangeText }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register-chart {
  width: 100%;
}

.register-chart__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 200px;
  font-size: 13px;
  color: #a8abb2;

  p {
    margin: 0;
  }

  &-sub {
    font-size: 12px;
    color: #c0c4cc;
  }
}
</style>
