<script setup lang="ts">
import {computed} from 'vue'
import {useRoute} from 'vue-router'

const route = useRoute()

interface Crumb {
  path: string
  title: string
}

// 面包屑：当前路径经过的所有路由，过滤掉没标题的
const breadcrumbs = computed<Crumb[]>(() =>
  route.matched
    .filter(item => item?.meta.title)
    .map(item => ({path: item.path, title: item.meta.title as string}))
)
</script>

<template>
  <el-breadcrumb separator="/" class="breadcrumb">
    <el-breadcrumb-item
      v-for="(item, index) in breadcrumbs"
      :key="item.path"
      :to="index < breadcrumbs.length - 1 ? item.path : undefined"
    >
      {{ item.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<style scoped lang="scss">
.breadcrumb {
  flex: 1;
  white-space: nowrap; // 面包屑长时不换行
  overflow: hidden;

  // 去掉链接项的默认粗体
  :deep(.el-breadcrumb__inner.is-link),
  :deep(.el-breadcrumb__inner a) {
    font-weight: 400;
    color: #7987A1;
  }

  // 非链接项（含当前页）
  :deep(.el-breadcrumb__inner) {
    color: #7987A1;
  }
}
</style>