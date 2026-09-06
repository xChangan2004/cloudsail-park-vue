<script setup lang="ts">
defineOptions({name: 'TablePanel'})

defineProps<{
  // 分页状态
  pagination?: {
    pageNo: number
    pageSize: number
    total: number
  }
}>()

const emit = defineEmits<{
  // 翻页或改变每页条数，需要重新加载
  pageChange: []
}>()
</script>

<template>
  <div class="table-panel">
    <!-- 工具栏：两侧插槽都没内容时整行隐藏 -->
    <div v-if="$slots['toolbar-left'] || $slots['toolbar-right']" class="table-panel__toolbar">
      <div class="table-panel__toolbar-left">
        <slot name="toolbar-left"/>
      </div>
      <div class="table-panel__toolbar-right">
        <slot name="toolbar-right"/>
      </div>
    </div>

    <!-- 表格区：吃满剩余高度，滚动交给 el-table 的 height=100% -->
    <div class="table-panel__body">
      <slot/>
    </div>

    <!-- 分页：底部居中 -->
    <div v-if="pagination" class="table-panel__pagination">
      <el-pagination
        v-model:current-page="pagination.pageNo"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 30, 50, 100]"
        background
        layout="total, prev, pager, next, sizes, jumper"
        @size-change="emit('pageChange')"
        @current-change="emit('pageChange')"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.table-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid #e3e8ee;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  &__toolbar-left,
  &__toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__body {
    flex: 1;
    min-height: 0;
  }

  &__pagination {
    display: flex;
    justify-content: center;
    margin-top: 16px;
    flex-shrink: 0;
  }
}
</style>