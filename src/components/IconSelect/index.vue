<script setup lang="ts">
import {computed, ref} from "vue";
import {customSvgNames} from "@/utils/icons.ts";

defineOptions({name: 'iconSelect'})

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const visible = ref(false)
const keyword = ref('')

/**
 * 搜索过滤
 */
const filterNames = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return k ? customSvgNames.filter(c => c!.toLowerCase().includes(k)) : customSvgNames
})

const handleSelect = (name: string) => {
  emit('update:modelValue', name)
  keyword.value = ''
  visible.value = false
}

const handleClear = () => {
  emit('update:modelValue', '')
}
</script>

<template>
  <el-popover v-model:visible="visible" :width="380" trigger="click">
    <template #reference>
      <el-input :model-value="modelValue" readonly placeholder="点击选择图标">
        <template #prefix>
          <SvgIcon v-if="modelValue" :name="modelValue"/>
        </template>
        <template #suffix>
          <el-icon
            v-if="modelValue"
            class="clear-btn"
            @click.stop="handleClear"
          >
            <CircleClose/>
          </el-icon>
        </template>
      </el-input>
    </template>

    <div class="icon-picker">
      <el-input v-model="keyword" prefix-icon="Search" placeholder="搜索图标名，如 dashboard"/>
      <el-scrollbar max-height="240px">
        <div class="icon-grid" v-if="filterNames.length">
          <div
            v-for="name in filterNames"
            :key="name"
            class="icon-item"
            :class="{active: name === modelValue}"
            @click="handleSelect(name!)"
          >
            <SvgIcon :name="name"/>
          </div>
        </div>
        <el-empty v-else description="无匹配图标" :image-size="60"/>
      </el-scrollbar>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
.clear-btn {
  cursor: pointer;

  &:hover {
    color: var(--el-text-color-secondary);
  }
}

.icon-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.icon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  cursor: pointer;
  transition: all .2s;

  &.active {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}
</style>