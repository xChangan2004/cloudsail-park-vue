<script setup lang="ts">
import {computed} from 'vue'
import type {EChartsCoreOption} from 'echarts/core'
import BaseChart from './BaseChart.vue'
import type {DashboardTrend} from '@/api/dashboard'

const props = withDefaults(defineProps<{
  data: DashboardTrend[]
  height?: string
}>(), {
  height: '280px'
})

/** Element Plus 语义色，和后台整体配色保持一致 */
const C = {
  income: '#409EFF',
  entry: '#67C23A',
  exit: '#E6A23C'
}

const list = computed(() => props.data ?? [])

/** 列表里的金额，带千分位和两位小数 */
const money = (v: number) => `¥${Number(v || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`

/** 坐标轴上的金额，压到 k 以免刻度太长 */
const axisMoney = (v: number) => {
  if (v >= 1000) return `¥${Number((v / 1000).toFixed(1))}k`
  return `¥${Math.round(v || 0)}`
}

const option = computed<EChartsCoreOption>(() => {
  const rows = list.value
  // 后端返回 yyyy-MM-dd，轴上只留 MM-dd
  const dates = rows.map(r => (r.date ? r.date.slice(5) : ''))
  const income = rows.map(r => Number(r.income ?? 0))
  const entry = rows.map(r => Number(r.entryCount ?? 0))
  const exit = rows.map(r => Number(r.exitCount ?? 0))

  return {
    color: [C.income, C.entry, C.exit],
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
    legend: {
      top: 0,
      left: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 18,
      textStyle: {color: '#606266', fontSize: 12}
    },
    grid: {top: 44, left: 0, right: 0, bottom: 0, containLabel: true},
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {lineStyle: {color: '#e3e8ee'}},
      axisTick: {show: false},
      axisLabel: {color: '#909399', fontSize: 12}
    },
    yAxis: [
      {
        type: 'value',
        name: '收入',
        nameTextStyle: {color: '#909399', fontSize: 12, align: 'right'},
        splitLine: {lineStyle: {color: '#f0f2f5'}},
        axisLine: {show: false},
        axisTick: {show: false},
        axisLabel: {color: '#909399', fontSize: 12, formatter: (v: number) => axisMoney(v)}
      },
      {
        type: 'value',
        name: '车流',
        nameTextStyle: {color: '#909399', fontSize: 12, align: 'left'},
        splitLine: {show: false},
        axisLine: {show: false},
        axisTick: {show: false},
        axisLabel: {color: '#909399', fontSize: 12}
      }
    ],
    series: [
      {
        name: '收入',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: {width: 2},
        areaStyle: {color: 'rgba(64, 158, 255, .10)'},
        data: income,
        tooltip: {valueFormatter: (v: number) => money(v)}
      },
      {
        name: '入场',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'triangle',
        symbolSize: 8,
        lineStyle: {width: 2},
        data: entry,
        tooltip: {valueFormatter: (v: number) => `${v ?? 0} 辆次`}
      },
      {
        name: '出场',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'rect',
        symbolSize: 7,
        lineStyle: {width: 2},
        data: exit,
        tooltip: {valueFormatter: (v: number) => `${v ?? 0} 辆次`}
      }
    ]
  }
})

/** 空态文案里的区间，帮运营确认后端到底给了哪几天 */
const rangeText = computed(() => {
  const rows = list.value
  if (!rows.length) return ''
  const first = rows[0]?.date ?? ''
  const last = rows[rows.length - 1]?.date ?? ''
  return `${first} 至 ${last}`
})
</script>

<template>
  <div class="trend-chart">
    <BaseChart v-if="list.length" :option="option" :height="height"/>
    <div v-else class="trend-chart__empty">
      <p>暂无趋势数据</p>
      <p class="trend-chart__empty-sub" v-if="rangeText">统计区间 {{ rangeText }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.trend-chart {
  width: 100%;
}

.trend-chart__empty {
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
