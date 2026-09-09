<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {onMounted, reactive, ref} from "vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {pageOperlogApi, type SysOperateLogVO} from "@/api/operlog";
import {pageUserApi} from "@/api/user";

defineOptions({name: 'SystemOperlog'})

/**
 * 搜索条件
 */
const query = reactive({
  userId: undefined,
  type: '',
  subType: '',
  success: undefined
})

// 记录日期范围
const dateRange = ref<string[]>([])

/** 操作人下拉选项（聚焦预加载 + 远程搜索） */
const userOptions = ref<{ id: string; label: string }[]>([])
const userLoading = ref(false)

const loadUserOptions = async (keyword?: string) => {
  userLoading.value = true
  try {
    const page = await pageUserApi({ pageNo: 1, pageSize: 20, username: keyword || undefined })
    userOptions.value = page.list.map(u => ({ id: u.id, label: `${u.username}（${u.nickname}）` }))
  } finally {
    userLoading.value = false
  }
}

const {pagination, tableData, loading, load, search} = usePaginationTable<SysOperateLogVO>(
  pageOperlogApi,
  () => ({
    ...query,
    beginTime: dateRange.value?.[0] ? dateRange.value[0] + ' 00:00:00' : undefined,
    endTime: dateRange.value?.[1] ? dateRange.value[1] + ' 23:59:59' : undefined
  })
)

/**
 * 重置查询条件
 */
const handleReset = () => {
  query.userId = undefined
  query.type = ''
  query.subType = ''
  query.success = undefined
  dateRange.value = []
  userOptions.value = []
  search()
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')
/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'type', label: '操作模块', visible: true},
  {prop: 'subType', label: '操作名', visible: true},
  {prop: 'username', label: '操作人员', visible: true},
  {prop: 'userIp', label: '操作地址', visible: true},
  {prop: 'success', label: '操作状态', visible: true},
  {prop: 'createTime', label: '操作时间', visible: true},
  {prop: 'costMs', label: '耗时', visible: true},
])
const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

onMounted(load)
</script>

<template>
  <div class="oper-log-page">
    <SearchPanel :collapsed-count="3" @reset="handleReset" @search="search">
      <el-form-item label="操作人">
        <el-select
          v-model="query.userId"
          placeholder="输入用户名搜索"
          style="width: 240px"
          clearable
          filterable
          remote
          :remote-method="loadUserOptions"
          :loading="userLoading"
          remote-show-suffix
        >
          <el-option v-for="u in userOptions" :key="u.id" :label="u.label" :value="u.id"/>
        </el-select>
      </el-form-item>
      <el-form-item label="操作模块">
        <el-input v-model="query.type" placeholder="请输入操作模块" style="width: 240px" clearable/>
      </el-form-item>
      <el-form-item label="操作名">
        <el-input v-model="query.subType" placeholder="请输入操作名" style="width: 240px" clearable/>
      </el-form-item>
      <el-form-item label="操作时间">
        <el-date-picker
          v-model="dateRange"
          value-format="YYYY-MM-DD"
          type="daterange"
          range-separator="-"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 240px"
        />
      </el-form-item>
      <el-form-item label="操作结果">
        <el-select v-model="query.success" clearable style="width: 240px">
          <el-option label="成功" value="1"/>
          <el-option label="失败" value="0"/>
        </el-select>
      </el-form-item>
    </SearchPanel>

    <TablePanel :pagination="pagination" @page-change="load">
      <template #toolbar-left>
        <el-button type="danger" plain>删除</el-button>
        <el-button type="warning" plain>导出</el-button>
      </template>
      <template #toolbar-right>
        <TableTools v-model:size="tableSize" :columns="columnSettings" @refresh="load"/>
      </template>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        :size="tableSize"
        height="100%"
        row-key="id"
        stripe
      >
        <el-table-column type="selection" align="center"/>
        <el-table-column type="index" label="序号" align="center" width="80"/>
        <el-table-column v-if="isColVisible('type')" label="操作模块" prop="type" align="center" width="160"/>
        <el-table-column v-if="isColVisible('subType')" label="操作名" prop="subType" align="center" width="160"
                         show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('username')" label="操作人员" prop="username" align="center" width="180"
                         show-overflow-tooltip sortable/>
        <el-table-column v-if="isColVisible('userIp')" label="操作地址" prop="userIp" align="center" width="180"
                         show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('success')" label="操作状态" prop="success" align="center" width="90">
          <template #default="{row}">
            <el-tag v-if="row.success == 1" type="success">成功</el-tag>
            <el-tag v-else type="danger">失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="操作时间" prop="createTime" align="center" sortable/>
        <el-table-column
          label="耗时ms"
          prop="costMs"
          align="center"
          width="120"
          sortable
          :sort-method="(a: SysOperateLogVO, b: SysOperateLogVO) => Number(a.costMs) - Number(b.costMs)"
        >
          <template #default="{row}">
            <span>{{ row.costMs }}毫秒</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="80px" align="center">
          <template #default>
            <el-button link type="primary" icon="view">详细</el-button>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
  </div>
</template>

<style scoped lang="scss">
.oper-log-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
</style>