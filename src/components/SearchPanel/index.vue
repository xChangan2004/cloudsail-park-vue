<script setup lang="ts">
import {computed, ref, useSlots} from "vue";
import {ArrowDown} from "@element-plus/icons-vue";

defineOptions({name: 'SearchPanel'})

const props = withDefaults(defineProps<{
  // 收起时显示的搜索个数
  collapsedCount?: number
}>(), {
  collapsedCount: 3
})

const emit = defineEmits<{
  // 点击查询（含输入框回车提交）
  search: []
  // 点击重置
  reset: []
}>()

const slots = useSlots()

// 是否展开全部搜索项
const expanded = ref(false)

// 搜索项总数超过收起个数，才显示展开/收起按钮
const showToggle = computed(() => (slots.default?.().length ?? 0) > props.collapsedCount)

// 实际渲染的搜索项
const visibleItems = computed(() => {
  const items = slots.default?.() ?? []
  return expanded.value ? items : items.slice(0, props.collapsedCount)
})
</script>

<template>
  <div class="search-panel" :class="{ 'is-expanded': expanded }">
    <el-form label-width="70px" class="search-panel__form" @submit.prevent="emit('search')">
      <component :is="item" v-for="(item, index) in visibleItems" :key="index"/>
      <div class="search-panel__actions">
        <el-button @click="emit('reset')">重置</el-button>
        <el-button type="primary" native-type="submit">查询</el-button>
        <el-button v-if="showToggle" link type="primary" @click="expanded = !expanded">
          {{ expanded ? '收起' : '展开' }}
          <el-icon class="search-panel__toggle-icon" :class="{ 'is-expanded': expanded }">
            <ArrowDown/>
          </el-icon>
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.search-panel {
  padding: 18px 18px 0;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid #e3e8ee;

  &__form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;

    :deep(.el-form-item) {
      margin-right: 32px;
      margin-bottom: 18px;
    }
  }

  // 收起时：按钮区挤在最后一个搜索项右侧、整体靠右
  &__actions {
    display: flex;
    align-items: center;
    margin-left: auto;
    margin-bottom: 18px;
  }

  // 展开时：width:100% 让按钮区强制换到新行独占一行，行内右对齐（右下角）
  &.is-expanded &__actions {
    width: 100%;
    justify-content: flex-end;
    margin-left: 0;
  }

  &__toggle-icon {
    margin-left: 4px;
    transition: transform 0.3s;

    &.is-expanded {
      transform: rotate(180deg);
    }
  }
}
</style>