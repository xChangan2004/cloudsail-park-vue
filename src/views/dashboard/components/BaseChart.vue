<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue'
import * as echarts from 'echarts/core'
import type {EChartsCoreOption, EChartsType} from 'echarts/core'
import {LineChart, PieChart} from 'echarts/charts'
import {GridComponent, LegendComponent, TooltipComponent, TitleComponent} from 'echarts/components'
import {CanvasRenderer} from 'echarts/renderers'

// 按需注册，避免把整个 echarts 打进包里
echarts.use([LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, TitleComponent, CanvasRenderer])

const props = withDefaults(defineProps<{
  /** echarts 配置。用 notMerge 整体替换，切换指标时不会残留上一份 series */
  option: EChartsCoreOption
  /** 图表高度，宽度自适应容器 */
  height?: string
}>(), {
  height: '280px'
})

const chartEl = ref<HTMLDivElement>()
const chart = shallowRef<EChartsType>()
let resizeObserver: ResizeObserver | null = null

const render = () => {
  if (!chartEl.value) return
  if (!chart.value) {
    chart.value = echarts.init(chartEl.value)
  }
  chart.value.setOption(props.option, true)
}

onMounted(() => {
  render()
  // 侧边栏折叠、窗口缩放都会改变容器宽度，ResizeObserver 比监听 window resize 更准
  resizeObserver = new ResizeObserver(() => chart.value?.resize())
  if (chartEl.value) {
    resizeObserver.observe(chartEl.value)
  }
})

watch(() => props.option, render, {deep: true})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart.value?.dispose()
  chart.value = undefined
})
</script>

<template>
  <div ref="chartEl" class="base-chart" :style="{height}"></div>
</template>

<style scoped lang="scss">
.base-chart {
  width: 100%;
}
</style>
