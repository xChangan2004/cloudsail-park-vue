<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import {onMounted, reactive, ref} from "vue";
import {pageParkingLotApi, type Lot} from "@/api/lot.ts";
import {ElMessage, ElMessageBox} from "element-plus";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {usePaginationTable} from "@/hooks/usePaginationTable.ts";
import {closeOrderApi, type OrderStatus, pageParkingOrderApi, type ParkingOrderPageVO} from "@/api/order.ts";
import {copyText} from "@/utils/clipboard.ts";
import RefundFormDialog from "@/views/parking/order/RefundFormDialog.vue";

defineOptions({name: 'ParkingOrder'})

const query = reactive({
  lotId: '',
  orderNo: '',
  plateNumber: '',
  status: undefined as number | undefined
})

// 记录日期范围
const dateRange = ref<string[]>([])

const handleReset = () => {
  query.lotId = ''
  query.orderNo = ''
  query.plateNumber = ''
  query.status = undefined
  dateRange.value = []
  search()
}

/** 状态展示映射 */
const statusMap: Record<OrderStatus, { label: string, type: 'success' | 'warning' | 'danger' | 'info' }> = {
  0: {label: '待支付', type: 'warning'},
  1: {label: '已支付', type: 'success'},
  2: {label: '已关闭', type: 'info'},
  3: {label: '已退款', type: 'danger'}
}

/** 停车场下拉选项 */
const lotOptions = ref<Lot[]>([])
const loadLotOptions = async () => {
  try {
    const page = await pageParkingLotApi({pageNo: 1, pageSize: 200})
    lotOptions.value = page.list
  } catch {
    ElMessage.error('停车场下拉数据加载失败')
  }
}

const {pagination, tableData, loading, load, search} = usePaginationTable<ParkingOrderPageVO>(
  pageParkingOrderApi,
  () => ({
    ...query,
    beginTime: dateRange.value?.[0] ? dateRange.value[0] + ' 00:00:00' : undefined,
    endTime: dateRange.value?.[1] ? dateRange.value[1] + ' 23:59:59' : undefined
  })
)

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')
/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'orderNo', label: '订单号', visible: true},
  {prop: 'lotName', label: '停车场', visible: true},
  {prop: 'plateNumber', label: '车牌号码', visible: true},
  {prop: 'amount', label: '应付金额', visible: true},
  {prop: 'discount', label: '优惠金额', visible: true},
  {prop: 'paid', label: '实付金额', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'paidTime', label: '支付时间', visible: true},
  {prop: 'createTime', label: '下单时间', visible: true},
])
const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

onMounted(() => {
  loadLotOptions()
  load()
})

/** 关闭订单 */
const closing = ref(false)
const handleCloseOrder = async (order: ParkingOrderPageVO) => {
  if (!order.id || closing.value) return
  try {
    await ElMessageBox.confirm(
      `订单号 ${order.orderNo ?? '--'}，应付金额 ¥${order.amount}。` +
      '关闭后会同步关闭支付宝侧待支付交易，锁定中的优惠券将退回客户，且不可恢复。',
      '确认关闭该订单？',
      {type: 'warning', confirmButtonText: '关闭', confirmButtonClass: 'el-button--danger'}
    )
  } catch {
    return // 用户点了取消
  }
  closing.value = true
  try {
    await closeOrderApi(order.id)
    ElMessage.success('订单已关闭')
    await load()
  } finally {
    closing.value = false
  }
}

const canRefund = (row: { status?: OrderStatus, paid?: number }) => {
  return row.status === 1 && Number(row.paid ?? 0) > 0
}

const refundVisible = ref(false)
const refundOrder = ref<ParkingOrderPageVO>()

const openRefund = (order: ParkingOrderPageVO) => {
  refundOrder.value = order
  refundVisible.value = true
}
</script>

<template>
  <div class="order-page">
    <SearchPanel :collapsed-count="3" @search="search" @reset="handleReset">
      <el-form-item label="停车场">
        <el-select
          v-model="query.lotId"
          filterable
          clearable
          placeholder="请选择停车场"
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
      <el-form-item label="车牌号码">
        <el-input v-model="query.plateNumber" placeholder="请输入车牌号码" style="width: 240px"/>
      </el-form-item>
      <el-form-item label="订单状态">
        <el-select
          v-model="query.status"
          clearable
          style="width: 240px"
        >
          <el-option v-for="(v, k) in statusMap" :key="k" :label="v.label" :value="k"/>
        </el-select>
      </el-form-item>
      <el-form-item label="订单号">
        <el-input v-model="query.orderNo" placeholder="请输入订单号" style="width: 240px"/>
      </el-form-item>
      <el-form-item label="下单时间">
        <el-date-picker
          v-model="dateRange"
          value-format="YYYY-MM-DD"
          type="daterange"
          range-separator="-"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 240px"/>
      </el-form-item>
    </SearchPanel>

    <TablePanel :pagination="pagination" @page-change="load">
      <template #toolbar-right>
        <TableTools v-model:size="tableSize" :columns="columnSettings" @refresh="search"/>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        :size="tableSize"
        stripe
        row-key="id"
        height="100%"
      >
        <el-table-column label="序号" type="index" width="80" align="center"/>
        <el-table-column v-if="isColVisible('orderNo')" label="订单号" prop="orderNo" width="200">
          <template #default="{row}">
            <span class="cell-order-no" @click="copyText(row.orderNo)">{{ row.orderNo ?? '--' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('lotName')" label="停车场" prop="lotName" width="180" align="center"
                         show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('plateNumber')" label="车牌号码" prop="plateNumber" align="center"
                         width="120"/>
        <el-table-column v-if="isColVisible('amount')" label="应付金额" prop="amount" width="140" align="right">
          <template #default="{row}">
            {{ row.amount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('discount')" label="优惠金额" prop="discount" width="140" align="right">
          <template #default="{row}">
            <span class="is-cut" v-if="row.discount > 0">-{{ row.discount.toFixed(2) }}</span>
            <span v-else class="is-zero">0.00</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('paid')" label="实付金额" prop="paid" width="140" align="right">
          <template #default="{row}">
            <span class="is-strong" v-if="row.paid > 0">{{ row.paid.toFixed(2) }}</span>
            <span v-else class="is-zero">0.00</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" width="120" align="center">
          <template #default="{row}">
            <el-tag :type="statusMap[row.status as OrderStatus].type" effect="plain">
              {{ statusMap[row.status as OrderStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('paidTime')" label="支付时间" prop="paidTime" align="center"/>
        <el-table-column v-if="isColVisible('createTime')" label="下单时间" prop="createTime" align="center"/>
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{row}">
            <el-button :disabled="!canRefund(row)" type="danger" link @click="openRefund(row)">退款
            </el-button>
            <el-button :disabled="[1, 2, 3].includes(row.status)" type="danger" link @click="handleCloseOrder(row)">
              关闭订单
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <RefundFormDialog v-model="refundVisible" :order="refundOrder" @success="load"/>
  </div>
</template>

<style scoped lang="scss">
.order-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

/* 订单号是 22 位长串，等宽字体方便逐位核对，点击直接复制 */
.cell-order-no {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  color: var(--el-text-color-primary);
  cursor: pointer;
}

.is-cut {
  color: #f56c6c;
}

.is-strong {
  font-weight: 500;
}

/* 待支付时实付本就是 0，弱化显示避免被读成「已收 0 元」 */
.is-zero {
  color: #a8abb2;
  font-weight: 400;
}
</style>