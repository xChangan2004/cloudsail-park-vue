<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {nextTick, onMounted, reactive, ref} from "vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {
  type EntryExitRecordPageVO,
  type EntryExitStatus,
  type EntryType, type ExitBillVO, type ExitFormDTO,
  manualExitApi,
  pageRecordApi
} from "@/api/record";
import {pageParkingLotApi, type ParkingLot} from "@/api/parkingLot";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";
import {pageCustomerApi} from "@/api/customer";
import {copyText} from "@/utils/clipboard";
import {formatDuration} from "@/utils/duration";
import ExitBillPanel from "./ExitBillPanel.vue";
import dayjs from "dayjs";
import EntryFormDialog from "./EntryFormDialog.vue";

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
const statusMap: Record<EntryExitStatus, { label: string, type: 'warning' | 'primary' | 'success' }> = {
  0: {label: '待入场', type: 'warning'},
  1: {label: '已入场', type: 'primary'},
  2: {label: '已离场', type: 'success'},
}

/** 在场中：后端 duration 只对「已出场」的记录计算，在场记录拿到的是 null */
const isOngoing = (row: EntryExitRecordPageVO) => row.status === 1 && !!row.entryTime

/**
 * 列表行的停车时长
 *
 * 在场记录后端不返回 duration（calculateDuration 里 exitTime 为空直接返回 null），
 * 直接渲染会一直显示「--」—— 而在场车辆停了多久恰恰最该看见（用来发现长时间占位车）。
 * 所以这里用入场时间现算，并在模板里标注「在场中」，避免被当成最终时长读。
 * 值和其它列一样是「本次查询时」的快照，重查即更新。
 */
const rowDuration = (row: EntryExitRecordPageVO) => {
  if (isOngoing(row)) {
    return formatDuration(dayjs().diff(dayjs(row.entryTime), 'minute'))
  }
  return formatDuration(row.duration)
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

/** 离场 */
const exitDialog = ref(false)
const exitForm = reactive<ExitFormDTO>({
  id: '',
  exitTime: ''
})

const exitFormRef = ref<FormInstance>()
const exitRules: FormRules = {
  id: {required: true, message: '离场的记录ID不能为空', trigger: 'blur'},
  exitTime: {required: true, message: '离场时间不能为空', trigger: 'blur'},
}

type Stage = 'form' | 'bill'
const stage = ref<Stage>('form')
const bill = ref<ExitBillVO>()
const exiting = ref(false)

const openExitDialog = async (id: string) => {
  exitForm.id = id
  exitForm.exitTime = dayjs().format('YYYY-MM-DD HH:mm:ss') // 默认当前时间
  bill.value = undefined
  stage.value = 'form'
  exitDialog.value = true
  await nextTick()
  // 打开弹窗时清空上次校验提示
  exitFormRef?.value?.clearValidate()
}

const handleExit = async () => {
  await exitFormRef?.value?.validate()
  exiting.value = true
  try {
    bill.value = await manualExitApi(exitForm)
    stage.value = 'bill' // 原地切视图
    void load() // 列表在背后刷新
  } finally {
    exiting.value = false
  }
}

/** 手动入场弹窗 */
const entryDialog = ref(false)
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
        <el-button
          v-perm="'parking:record:entry'"
          type="primary"
          plain
          @click="entryDialog = true"
        >
          手动入场
        </el-button>
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
        <el-table-column v-if="isColVisible('spaceCode')" label="车位编号" prop="spaceCode" align="center" width="100"/>
        <el-table-column v-if="isColVisible('customerName')" label="客户昵称" prop="customerName" align="center" width="140"/>
        <el-table-column v-if="isColVisible('plateNumber')" label="车牌号码" prop="plateNumber" align="center" width="120"/>
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
        <el-table-column v-if="isColVisible('duration')" label="停车时长" prop="duration" align="center" width="160">
          <template #default="{row}">
            {{ rowDuration(row) }}
            <span v-if="isOngoing(row)" class="cell-ongoing">· 在场中</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{row}">
            <el-button
              v-perm="'parking:record:exit'"
              :disabled="[0, 2].includes(row.status)"
              type="danger"
              link
              @click="openExitDialog(row.id)"
            >
              离场
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <el-dialog
      v-model="exitDialog"
      width="400px"
      :title="stage === 'form' ? '离场' : '出场结算'"
      :close-on-click-modal="false"
      :close-on-press-escape="stage === 'form'"
    >
      <el-form
        v-if="stage === 'form'"
        ref="exitFormRef"
        label-width="80px"
        :model="exitForm"
        :rules="exitRules"
      >
        <el-form-item label="选中记录" prop="id">
          <el-input disabled :value="exitForm.id"/>
        </el-form-item>
        <el-form-item label="离场时间" prop="exitTime">
          <el-date-picker
            v-model="exitForm.exitTime"
            value-format="YYYY-MM-DD HH:mm:ss"
            type="datetime"
            placeholder="请选择离场时间"
          />
        </el-form-item>
      </el-form>
      <ExitBillPanel v-else :bill="bill"/>

      <template #footer>
        <template v-if="stage === 'form'">
          <el-button @click="exitDialog = false">取消</el-button>
          <el-button type="primary" :loading="exiting" @click="handleExit">确认</el-button>
        </template>
        <template v-else>
          <el-button @click="copyText(bill?.orderNo)">复制订单号</el-button>
          <el-button type="primary" @click="exitDialog = false">完成</el-button>
        </template>
      </template>
    </el-dialog>
    <EntryFormDialog
      v-model="entryDialog"
      :lot-options="lotOptions"
      :default-lot-id="query.lotId"
      @success="load"
    />
  </div>
</template>

<style scoped lang="scss">
.record-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

/* 在场记录是「实时变化中」的时长，弱化标注，避免被当成最终值 */
.cell-ongoing {
  font-size: 12px;
  color: #a8abb2;
}
</style>