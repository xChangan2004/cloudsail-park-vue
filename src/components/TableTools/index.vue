<script setup lang="ts">
import {Operation, Refresh, Setting} from "@element-plus/icons-vue";

defineOptions({name: 'TableTools'})

// 表格密度
const size = defineModel<'small' | 'default' | 'large'>('size', {default: 'default'})

// 列显示：传页面里的 reactive 数组，勾选直接改 visible 生效；不传则隐藏列设置按钮
defineProps<{
  columns?: { prop: string, label: string, visible: boolean }[]
}>()

const emit = defineEmits<{
  refresh: []
}>()

const sizeOptions = [
  {label: '紧凑', value: 'small'},
  {label: '默认', value: 'default'},
  {label: '宽松', value: 'large'}
]
</script>

<template>
  <div class="table-tools">
    <el-button :icon="Refresh" circle @click="emit('refresh')"/>

    <!-- 密度 -->
    <el-dropdown
      trigger="hover"
      @command="(cmd: string) => size = cmd as typeof size"
    >
      <span>
        <el-button :icon="Operation" circle/>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="item in sizeOptions"
            :key="item.value"
            :command="item.value"
            :class="{ 'is-active' : size === item.value }"
          >
            {{ item.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 列设置 -->
    <el-popover v-if="columns?.length">
      <template #reference>
        <span>
          <el-button :icon="Setting" circle/>
        </span>
      </template>
      <div class="column-settings">
        <el-checkbox
          v-for="col in columns"
          :key="col.prop"
          v-model="col.visible"
          :label="col.label"/>
      </div>
    </el-popover>
  </div>
</template>

<style scoped lang="scss">
.table-tools {
  display: flex;
  gap: 8px;
}

.column-settings {
  display: flex;
  flex-direction: column;

  .el-checkbox {
    height: 28px;
  }
}
</style>