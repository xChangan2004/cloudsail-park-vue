<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {onMounted, reactive, ref} from "vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {delParkingLotApi, pageParkingLotApi, type Lot, updateParkingLotStatusApi} from "@/api/lot";
import {ElMessage, ElMessageBox} from "element-plus";
import LotFormDialog from "@/views/parking/lot/LotFormDialog.vue";

defineOptions({name: 'ParkingLot'})

/** 搜索条件 */
const query = reactive({
  name: '',
  address: '',
  status: undefined as number | undefined
})

const {pagination, tableData, loading, load, search} = usePaginationTable<Lot>(
  pageParkingLotApi,
  () => ({...query})
)

/** 点重置：清空条件后重新查询 */
const handleReset = () => {
  query.name = ''
  query.address = ''
  query.status = undefined
  search()
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'name', label: '名称', visible: true},
  {prop: 'address', label: '地址', visible: true},
  {prop: 'spaces', label: '车位', visible: true},
  {prop: 'longitude', label: '经度', visible: true},
  {prop: 'latitude', label: '纬度', visible: true},
  {prop: 'contact', label: '联系方式', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'createTime', label: '创建时间', visible: true}
])

const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

onMounted(load)

const handleStatusBeforeChange = async (row: Lot) => {
  const next = row.status === 1 ? 0 : 1
  await updateParkingLotStatusApi(row.id!, next)
  row.status = next
  ElMessage.success('切换状态成功')
  return true
}

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const handleAdd = () => {
  dialogVisible.value = true
  editingId.value = null
}

const handleEdit = (id: string) => {
  dialogVisible.value = true
  editingId.value = id
}

const handleDelete = async (row: Lot) => {
  if (!row.id) return
  try {
    await ElMessageBox.confirm(`确认要删除停车场 [${row.name}] 吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }
  await delParkingLotApi(row.id)
  ElMessage.success('删除成功')
  await load()
}
</script>

<template>
  <div class="lot-page">
    <SearchPanel :collapsed-count="3" @search="search" @reset="handleReset">
      <el-form-item label="名称">
        <el-input v-model="query.name" placeholder="请输入停车场名称" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="地址">
        <el-input v-model="query.address" placeholder="请输入停车场地址，模糊搜索" clearable style="width: 240px"/>
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
        height="100%"
        row-key="id"
        stripe
      >
        <el-table-column label="序号" type="index" width="80" align="center"/>
        <el-table-column v-if="isColVisible('name')" label="名称" prop="name" width="140" show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('address')" label="地址" prop="address" width="160" show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('spaces')" label="可用/总车位" prop="totalSpaces">
          <template #default="{row}">
            <span>{{ row.freeSpaces }}/{{ row.totalSpaces }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('longitude')" label="经度" prop="longitude"/>
        <el-table-column v-if="isColVisible('latitude')" label="纬度" prop="latitude"/>
        <el-table-column v-if="isColVisible('contact')" label="联系方式" prop="contact"/>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" width="90">
          <template #default="{row}">
            <el-switch
              :model-value="row.status"
              :active-value="1"
              :inactive-value="0"
              :before-change="() => handleStatusBeforeChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="创建时间" prop="createTime" width="180"/>
        <el-table-column label="操作" fixed="right">
          <template #default="{row}">
            <el-button type="warning" icon="Edit" size="small" @click="handleEdit(row.id)"/>
            <el-button type="danger" icon="Delete" size="small" @click="handleDelete(row)"/>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <LotFormDialog v-model="dialogVisible" :id="editingId" @success="load"/>
  </div>
</template>

<style scoped lang="scss">
.lot-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
</style>