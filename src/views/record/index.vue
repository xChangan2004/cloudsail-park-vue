<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {onMounted, reactive, ref} from "vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {type EntryExitRecordPageVO, type EntryExitStatus, type EntryType, pageRecordApi} from "@/api/record";
import {pageParkingLotApi, type ParkingLot} from "@/api/parkingLot";
import {ElMessage} from "element-plus";
import {pageCustomerApi} from "@/api/customer";

defineOptions({name: 'Record'})

/** 查询条件 */
const query = reactive({
  lotId: '',
  customerId: '',
  plateNumber: '',
  entryType: undefined,
  status: undefined,
})

/** 重置查询条件 */
const handleReset = () => {
  query.lotId = ''
  query.customerId = ''
  query.plateNumber = ''
  query.entryType = undefined
  query.status = undefined
  dateRange.value = []
  search()
}

/** 记录日期范围 */
const dateRange = ref<string[]>([])

/** 客户下拉选项（聚焦预加载 + 远程搜索） */
const customerOptions = ref<{ id: string; label: string }[]>([])
const customerLoading = ref(false)
const loadCustomerOptions = async (keyword?: string) => {
  customerLoading.value = true
  try {
    const page = await pageCustomerApi({pageNo: 1, pageSize: 20, nickname: keyword || undefined})
    customerOptions.value = page.list.map(c => ({id: c.id, label: `${c.nickname}（${c.phone}）`}))
  } catch {
    ElMessage.error('客户下拉数据加载失败')
  } finally {
    customerLoading.value = false
  }
}

/** 停车场下拉选项 */
const lotOptions = ref<ParkingLot[]>([])
const loadLotOptions = async () => {
  try {
    const page = await pageParkingLotApi({pageNo: 1, pageSize: 200})
    lotOptions.value = page.list
  } catch {
    ElMessage.error('停车场下拉数据加载失败')
  }
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'lotName', label: '停车场', visible: true},
  {prop: 'spaceCode', label: '车位编号', visible: true},
  {prop: 'customerName', label: '客户昵称', visible: true},
  {prop: 'plateNumber', label: '车牌号码', visible: true},
  {prop: 'entryType', label: '入场类型', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'entryTime', label: '入场时间', visible: true},
  {prop: 'exitTime', label: '出场时间', visible: true},
  {prop: 'duration', label: '停车时长', visible: true},
])

const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

/** 入场类型展示映射 */
const typeMap: Record<EntryType, { label: string, type: 'primary' | 'success' }> = {
  1: {label: '手动', type: 'primary'},
  2: {label: 'OCR识别', type: 'success'}
}

/** 状态展示映射 */
const statusMap: Record<EntryExitStatus, { label: string, type: 'info' | 'success' | 'danger' }> = {
  0: {label: '待入场', type: 'info'},
  1: {label: '已入场', type: 'success'},
  2: {label: '已离场', type: 'danger'},
}

const {pagination, tableData, loading, load, search} = usePaginationTable<EntryExitRecordPageVO>(
  pageRecordApi,
  () => ({
    ...query,
    beginTime: dateRange.value?.[0] ? dateRange.value[0] + ' 00:00:00' : undefined,
    endTime: dateRange.value?.[1] ? dateRange.value[1] + ' 23:59:59' : undefined
  })
)

onMounted(() => {
  // 初始化加载停车场下拉
  loadLotOptions()
  // 延迟加载表格，优先渲染下拉
  setTimeout(() => load(), 100)
})
</script>

<template>
  <div class="record-page">
    <SearchPanel :collapsed-count="3" @reset="handleReset" @search="search">
      <el-form-item label="停车场">
        <el-select
          v-model="query.lotId"
          placeholder="请选择停车场"
          clearable
          filterable
          style="width: 240px"
        >
          <el-option
            v-for="lot in lotOptions"
            :key="lot.id"
            :label="lot.name"
            :value="lot.id!"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="客户">
        <el-select
          v-model="query.customerId"
          placeholder="请选择客户"
          clearable
          filterable
          remote
          :remote-method="loadCustomerOptions"
          :loading="customerLoading"
          remote-show-suffix
          style="width: 240px"
        >
          <el-option
            v-for="c in customerOptions"
            :key="c.id"
            :label="c.label"
            :value="c.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="车牌号码">
        <el-input v-model="query.plateNumber" placeholder="请输入车牌号码" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="入场类型">
        <el-select v-model="query.entryType" placeholder="请选择入场类型" clearable style="width: 240px">
          <el-option
            v-for="(v, k) in typeMap"
            :key="k"
            :label="v.label"
            :value="k"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="入场时间">
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
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="请选择状态" clearable style="width: 240px">
          <el-option
            v-for="(v, k) in statusMap"
            :key="k"
            :label="v.label"
            :value="k"
          />
        </el-select>
      </el-form-item>
    </SearchPanel>

    <TablePanel :pagination="pagination" @page-change="load">
      <template #toolbar-left>
        <el-button type="primary" plain>手动入场</el-button>
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
        <el-table-column label="序号" type="index" width="66" align="center"/>
        <el-table-column v-if="isColVisible('lotName')" label="停车场" prop="lotName" align="center"/>
        <el-table-column v-if="isColVisible('spaceCode')" label="车位编号" prop="spaceCode" align="center"/>
        <el-table-column v-if="isColVisible('customerName')" label="客户昵称" prop="customerName" align="center"/>
        <el-table-column v-if="isColVisible('plateNumber')" label="车牌号码" prop="plateNumber" align="center"/>
        <el-table-column v-if="isColVisible('entryType')" label="入场类型" prop="entryType" align="center" width="90">
          <template #default="{row}">
            <el-tag :type="typeMap[row.entryType as EntryType].type ?? 'info'" effect="plain">
              {{ typeMap[row.entryType as EntryType].label ?? '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" align="center" width="90">
          <template #default="{row}">
            <el-tag :type="statusMap[row.status as EntryExitStatus].type ?? 'info'" effect="plain">
              {{ statusMap[row.status as EntryExitStatus].label ?? '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('entryTime')" label="入场时间" prop="entryTime" align="center" width="180"/>
        <el-table-column v-if="isColVisible('exitTime')" label="出场时间" prop="exitTime" align="center" width="180"/>
        <el-table-column v-if="isColVisible('duration')" label="停车时长" prop="duration" align="center"/>
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{row}">
            <el-button :disabled="[0, 2].includes(row.status)" type="danger" link>离场</el-button>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
  </div>
</template>

<style scoped lang="scss">
.record-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
</style>