<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {onMounted, reactive, ref} from "vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {
  type Customer,
  type CustomerPlate,
  type EnergyType,
  listCustomerPlateApi,
  pageCustomerApi, unbindCustomerPlateApi, updateCustomerStatusApi
} from "@/api/customer";
import {ElMessage, ElMessageBox} from "element-plus";
import PlateFormDialog from "@/views/customer/PlateFormDialog.vue";
import CustomerFormDialog from "@/views/customer/CustomerFormDialog.vue";

defineOptions({name: 'Customer'})

/** 搜索条件 */
const query = reactive({
  phone: '',
  nickname: '',
  status: undefined as number | undefined
})

/** 重置 */
const handleReset = () => {
  query.phone = ''
  query.nickname = ''
  query.status = undefined
  search()
}

const {pagination, tableData, loading, load, search} = usePaginationTable<Customer>(
  pageCustomerApi,
  () => ({...query})
)

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'nickname', label: '客户', visible: true},
  {prop: 'phone', label: '手机号码', visible: true},
  {prop: 'openid', label: '微信', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'createTime', label: '注册时间', visible: true}
])
const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

onMounted(load)

const handleStatusBeforeChange = async (row: Customer) => {
  const next = row.status === 1 ? 0 : 1
  try {
    await updateCustomerStatusApi(row.id, next)
  } catch {
    return false
  }
  row.status = next
  ElMessage.success('状态切换成功')
  return true
}

/** 能源类型映射 */
const energyTypeMap: Record<EnergyType, { label: string; type: 'primary' | 'success' }> = {
  1: {label: '燃油车', type: 'primary'},
  2: {label: '新能源', type: 'success'}
}

/** 客户 id -> 车牌列表 */
const plateMap = reactive<Record<string, CustomerPlate[]>>({})
const plateLoading = reactive<Record<string, boolean>>({})
const platesOf = (customerId: string) => plateMap[customerId] ?? []

const reloadPlates = async (customerId: string) => {
  plateLoading[customerId] = true
  try {
    plateMap[customerId] = await listCustomerPlateApi(customerId)
  } catch {
    ElMessage.error('拉取客户车牌列表失败')
  } finally {
    plateLoading[customerId] = false
  }
}

/** expand-change 第二参是「当前所有展开行」数组，收起时也会触发，必须判方向 */
const handleExpandChange = async (row: Customer, expanded: Customer[] | boolean) => {
  const isExpanded = Array.isArray(expanded) ? expanded.some(r => r.id === row.id) : expanded
  if (!isExpanded || plateMap[row.id]) return
  await reloadPlates(row.id)
}

/** 解绑直接影响该车牌能否入场，必须二次确认 */
const handleUnbindPlateNumber = async (row: Customer, plate: CustomerPlate) => {
  try {
    await ElMessageBox.confirm(
      `确认解绑车牌 [${plate?.plateNumber}] 吗？解绑后该车牌将无法入场。`,
      '提示',
      {type: 'warning', confirmButtonText: '解绑', confirmButtonClass: 'el-button--danger'}
    )
  } catch {
    return
  }
  await unbindCustomerPlateApi(plate.id)
  ElMessage.success('解绑车牌成功')
  await reloadPlates(row.id)
}

/** 弹窗相关 */
const formVisible = ref(false)
const editingRow = ref<Customer | null>(null)

const handleAdd = () => {
  editingRow.value = null
  formVisible.value = true
}

const handleEdit = (row: Customer) => {
  editingRow.value = row
  formVisible.value = true
}

const plateVisible = ref(false)
const plateCustomer = ref<Customer | null>(null)

const handleBindPlateNumber = (row: Customer) => {
  plateCustomer.value = row
  plateVisible.value = true
}

const handlePlateSuccess = async () => {
  const id = plateCustomer.value?.id
  if (id) await reloadPlates(id)
}
</script>

<template>
  <div class="customer-page">
    <SearchPanel @reset="handleReset" @search="search">
      <el-form-item label="手机号码">
        <el-input v-model="query.phone" placeholder="请输入手机号码" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="昵称">
        <el-input v-model="query.nickname" placeholder="请输入昵称" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="请选择状态" clearable style="width: 240px">
          <el-option label="启用" :value="1"/>
          <el-option label="停用" :value="0"/>
        </el-select>
      </el-form-item>
    </SearchPanel>

    <TablePanel :pagination="pagination" @page-change="load">
      <template #toolbar-left>
        <el-button type="primary" plain @click="handleAdd">新增</el-button>
      </template>
      <template #toolbar-right>
        <TableTools v-model:size="tableSize" :columns="columnSettings" @refresh="load"/>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        :size="tableSize"
        :preserve-expanded-content="true"
        height="100%"
        row-key="id"
        stripe
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand">
          <template #default="{row}">
            <div v-loading="plateLoading[row?.id]" class="plate-panel">
              <div class="plate-panel__head">
                <span class="plate-panel__title">已绑定车牌 · {{ platesOf(row?.id).length }} 块</span>
                <el-button
                  type="primary"
                  plain
                  size="small"
                  @click="handleBindPlateNumber(row as Customer)"
                >绑定车牌
                </el-button>
              </div>

              <el-table :data="platesOf(row?.id)" size="small" border>
                <!-- 内层插槽会遮蔽外层 row，必须换名 -->
                <el-table-column label="车牌号码">
                  <template #default="{row: p}">
                    <span class="plate-code">{{ p?.plateNumber }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="能源类型" width="110" align="center">
                  <template #default="{row: p}">
                    <el-tag size="small" effect="plain" :type="energyTypeMap[p?.energyType as EnergyType].type">
                      {{ energyTypeMap[p?.energyType as EnergyType].label }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="默认" width="80" align="center">
                  <template #default="{row: p}">
                    <el-tag v-if="p?.isDefault" size="small" type="warning" effect="plain">默认</el-tag>
                    <span v-else class="muted">--</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="90" align="center">
                  <template #default="{row: p}">
                    <el-button
                      type="danger"
                      link
                      @click="handleUnbindPlateNumber(row as Customer, p as CustomerPlate)"
                    >
                      解绑
                    </el-button>
                  </template>
                </el-table-column>
                <template #empty>
                  <div class="plate-empty">该客户还没有绑定车牌，<b>无法入场</b>，请先绑定</div>
                </template>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="序号" type="index" width="80" align="center"/>
        <el-table-column v-if="isColVisible('nickname')" label="客户" prop="nickname">
          <template #default="{row}">
            <div class="customer-cell">
              <el-image
                :src="row.avatar"
                :preview-src-list="[row.avatar]"
                preview-teleported
                hide-on-click-modal
                fit="cover"
                class="customer-cell__avatar"
              />
              <span class="customer-cell__nickname">{{ row.nickname || '--' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('phone')" label="手机号码" prop="phone"/>
        <el-table-column v-if="isColVisible('openid')" label="微信" prop="openid" align="center">
          <template #default="{row}">
            <el-tag size="small" effect="plain" :type="row.openid ? 'success' : 'info'">
              {{ row.openid ? '已绑定' : '未绑定' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" align="center">
          <template #default="{row}">
            <el-switch
              :model-value="row.status"
              :active-value="1"
              :inactive-value="0"
              :before-change="() => handleStatusBeforeChange(row as Customer)"
            />
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="注册时间" prop="createTime" align="center"/>
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{row}">
            <el-button type="warning" icon="Edit" size="small" @click="handleEdit(row as Customer)" />
            <el-button type="danger" icon="Delete" size="small"/>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <CustomerFormDialog v-model="formVisible" :row="editingRow" @success="load" />
    <PlateFormDialog v-model="plateVisible" :customer="plateCustomer" @success="handlePlateSuccess"/>
  </div>
</template>

<style scoped lang="scss">
.customer-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.customer-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  &__avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    background: var(--el-fill-color-light);
    transition: box-shadow 0.2s;
  }

  &__nickname {
    min-width: 0;
    font-weight: 500;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* 展开单元格由 el-table 渲染，拿不到 scoped 属性，必须 :deep */
:deep(.el-table__expanded-cell) {
  padding: 10px 16px;
  background-color: var(--el-fill-color-light);
}

.plate-panel {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__title {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }
}

/* 车牌号等宽，方便和纸质单据逐位核对 */
.plate-code {
  font-family: Menlo, Consolas, monospace;
  letter-spacing: 0.5px;
}

/* 最该认真做的一态：同时说明「入不了场」和「怎么修」 */
.plate-empty {
  padding: 8px 0;
  font-size: 13px;
  color: var(--el-color-warning);
}

.muted {
  color: var(--el-text-color-placeholder);
}
</style>