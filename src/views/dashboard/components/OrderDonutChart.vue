<script setup lang="ts">
import {computed} from 'vue'
import type {EChartsCoreOption} from 'echarts/core'
import BaseChart from './BaseChart.vue'
import type {OrderDistribution, OrderStatusValue} from '@/api/dashboard'

const props = withDefaults(defineProps<{
  data: OrderDistribution[]
  height?: string
}>(), {
  height: '280px'
})

/** 按订单状态的业务含义取 Element Plus 语义色 */
const STATUS_COLOR: Record<OrderStatusValue, string> = {
  0: '#E6A23C', // 待支付
  1: '#67C23A', // 已支付
  2: '#909399', // 已关闭
  3: '#F56C6C'  // 已退款
}

const list = computed(() => props.data ?? [])

const total = computed(() => list.value.reduce((sum, item) => sum + Number(item.count ?? 0), 0))

const option = computed<EChartsCoreOption>(() => {
  const rows = list.value
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>{c} 单（{d}%）',
      backgroundColor: '#fff',
      borderColor: '#e3e8ee',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {color: '#303133', fontSize: 12},
      extraCssText: 'box-shadow: 0 2px 12px rgba(0, 0, 0, .08); border-radius: 6px;'
    },
    // 环心显示订单总数，环下是带笔数的图例
    title: {
      text: String(total.value),
      subtext: '订单总数',
      left: '50%',
      top: '32%',
      textAlign: 'center',
      textStyle: {fontSize: 22, fontWeight: 600, color: '#303133'},
      subtextStyle: {fontSize: 12, color: '#909399'}
    },
    legend: {
      bottom: 0,
      left: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 14,
      textStyle: {color: '#606266', fontSize: 12},
      formatter: (name: string) => {
        const hit = rows.find(r => r.statusDesc === name)
        return `${name} ${hit ? hit.count : 0}`
      }
    },
    series: [
      {
        name: '订单状态',
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: {show: false},
        labelLine: {show: false},
        itemStyle: {borderColor: '#fff', borderWidth: 2},
        data: rows.map(r => ({
          name: r.statusDesc,
          value: Number(r.count ?? 0),
          itemStyle: {color: STATUS_COLOR[r.status] ?? '#909399'}
        }))
      }
    ]
  }
})
</script>

<template>
  <div class="order-chart">
    <BaseChart v-if="total > 0" :option="option" :height="height"/>
    <div v-else class="order-chart__empty" :style="{height}">暂无订单数据</div>
  </div>
</template>

<style scoped lang="scss">
.order-chart {
  width: 100%;
}

.order-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #a8abb2;
}
</style>
