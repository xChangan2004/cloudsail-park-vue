<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {onMounted, reactive, ref, watch} from "vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {ElMessage, ElMessageBox} from "element-plus";
import {getParkingLotApi, pageParkingLotApi, type ParkingLot} from "@/api/parkingLot";
import {
  delParkingSpaceApi,
  pageParkingSpaceApi,
  updateParkingSpaceStatusApi,
  type ParkingSpace,
  type SpaceStatus,
  type SpaceType
} from "@/api/parkingSpace";
import SpaceFormDialog from "@/views/parking/space/SpaceFormDialog.vue";

defineOptions({name: 'ParkingSpace'})

/** 当前选中的停车场 id */
const lotId = ref('')

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

/** 顶部统计：总车位 / 可用 */
const lotStat = reactive({totalSpaces: 0, freeSpaces: 0})
const loadLotStat = async () => {
  if (!lotId.value) return
  const lot: ParkingLot = await getParkingLotApi(lotId.value)
  lotStat.totalSpaces = lot.totalSpaces ?? 0
  lotStat.freeSpaces = lot.freeSpaces ?? 0
}

/** 搜索条件 */
const query = reactive({
  spaceCode: '',
  spaceType: undefined as SpaceType | undefined,
  status: undefined as SpaceStatus | undefined
})

const {pagination, tableData, loading, load, search} = usePaginationTable<ParkingSpace>(
  // 未选停车场时不发请求，返回空页
  pageParkingSpaceApi,
  () => ({lotId: lotId.value, ...query})
)

/** 切换停车场：重查列表和统计 */
watch(lotId, () => {
  search()
  loadLotStat()
})

/** 点重置：清空条件后重新查询 */
const handleReset = () => {
  query.spaceCode = ''
  query.spaceType = undefined
  query.status = undefined
  search()
}

/** 状态展示映射：FREE绿 / OCCUPIED红 / RESERVED黄 / MAINTENANCE灰 */
const statusMap: Record<SpaceStatus, { label: string; type: 'success' | 'danger' | 'warning' | 'info' }> = {
  1: {label: '空闲', type: 'success'},
  2: {label: '占用', type: 'danger'},
  3: {label: '预留', type: 'warning'},
  4: {label: '维修', type: 'info'}
}

/** 类型展示映射：普通灰 / 新能源绿 */
const typeMap: Record<SpaceType, { label: string; type: 'success' | 'info' }> = {
  1: {label: '普通', type: 'info'},
  2: {label: '新能源', type: 'success'}
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'spaceCode', label: '编号', visible: true},
  {prop: 'spaceType', label: '类型', visible: true},
  {prop: 'status', label: '状态', visible: true}
])

const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

onMounted(() => {
  // 只加载下拉选项；lotId 初始为空，用户选场后由 watch 触发查询
  loadLotOptions()
})

/** 状态切换：管理端仅允许 FREE ↔ MAINTENANCE，其余状态由业务联动产生，不显示按钮 */
const handleToggleStatus = async (row: ParkingSpace) => {
  const next = row.status === 1 ? 4 : 1
  await updateParkingSpaceStatusApi(row.id, next)
  row.status = next
  ElMessage.success('切换状态成功')
}

/** 弹窗 */
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

/** 新增/编辑成功：刷新列表 + 统计（车位总数变了） */
const handleDialogSuccess = () => {
  load()
  loadLotStat()
}

/** 删除 */
const handleDelete = async (row: ParkingSpace) => {
  try {
    await ElMessageBox.confirm(`确认要删除车位 [${row.spaceCode}] 吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }
  await delParkingSpaceApi(row.id)
  ElMessage.success('删除成功')
  await load()
  loadLotStat()
}
</script>

<template>
  <div class="space-page">
    <!-- 停车场选择 + 统计（与 SearchPanel 同款外观） -->
    <div class="lot-bar">
      <div class="lot-bar__select">
        <span class="lot-bar__label">停车场</span>
        <el-select
          v-model="lotId"
          filterable
          placeholder="请选择停车场"
          style="width: 260px"
        >
          <el-option
            v-for="lot in lotOptions"
            :key="lot.id"
            :label="lot.name"
            :value="lot.id!"
          />
        </el-select>
      </div>
      <div class="lot-bar__stat">
        <div class="stat-item">
          <span class="stat-item__value">{{ lotStat.totalSpaces }}</span>
          <span class="stat-item__label">总车位</span>
        </div>
        <div class="stat-divider"/>
        <div class="stat-item">
          <span class="stat-item__value stat-item__value--free">{{ lotStat.freeSpaces }}</span>
          <span class="stat-item__label">可用车位</span>
        </div>
      </div>
    </div>

    <el-empty v-if="!lotId" description="请先选择停车场" style="height: 100%" />

    <template v-else>
      <SearchPanel :collapsed-count="3" @search="search" @reset="handleReset">
        <el-form-item label="编号">
          <el-input v-model="query.spaceCode" placeholder="请输入车位编号，模糊搜索" clearable style="width: 240px"/>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.spaceType" placeholder="请选择类型" clearable style="width: 240px">
            <el-option v-for="(v, k) in typeMap" :key="k" :label="v.label" :value="k"/>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="请选择状态" clearable style="width: 240px">
            <el-option v-for="(v, k) in statusMap" :key="k" :label="v.label" :value="k"/>
          </el-select>
        </el-form-item>
      </SearchPanel>

      <TablePanel :pagination="pagination" @page-change="load">
        <template #toolbar-left>
          <el-button type="primary" plain :disabled="!lotId" @click="handleAdd" v-perm="'parking:space:add'">新增</el-button>
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
          <el-table-column v-if="isColVisible('spaceCode')" label="编号" prop="spaceCode" align="center"/>
          <el-table-column v-if="isColVisible('spaceType')" label="类型" prop="spaceType" align="center">
            <template #default="{row}">
              <el-tag :type="typeMap[row.spaceType as SpaceType].type" effect="plain">
                {{ typeMap[row.spaceType as SpaceType].label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColVisible('status')" label="状态" prop="status" align="center">
            <template #default="{row}">
              <el-tag :type="statusMap[row.status as SpaceStatus].type" effect="plain">
                {{ statusMap[row.status as SpaceStatus].label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" prop="createTime" />
          <el-table-column label="操作" fixed="right" width="200">
            <template #default="{row}">
              <el-button type="warning" icon="Edit" size="small" @click="handleEdit(row.id)" v-perm="'parking:space:edit'"/>
              <el-button
              v-if="row.status === 1 || row.status === 4"
              :type="row.status === 1 ? 'info' : 'success'"
              size="small"
              @click="handleToggleStatus(row as ParkingSpace)"
              v-perm="'parking:space:edit'"
            >{{ row.status === 1 ? '设为维护' : '恢复空闲' }}</el-button>
              <el-button type="danger" icon="Delete" size="small" @click="handleDelete(row as ParkingSpace)" v-perm="'parking:space:delete'"/>
            </template>
          </el-table-column>
        </el-table>
      </TablePanel>

      <SpaceFormDialog v-model="dialogVisible" :id="editingId" :lot-id="lotId" @success="handleDialogSuccess"/>
    </template>
  </div>
</template>

<style scoped lang="scss">
.space-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.lot-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid #e3e8ee;

  &__select {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__label {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  &__stat {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    &__value {
      font-size: 22px;
      font-weight: 600;
      line-height: 1;
      color: var(--el-text-color-primary);

      &--free {
        color: var(--el-color-success);
      }
    }

    &__label {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .stat-divider {
    width: 1px;
    height: 28px;
    background-color: #e3e8ee;
  }
}
</style>
