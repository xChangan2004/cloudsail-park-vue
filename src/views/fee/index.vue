<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import {computed, onMounted, reactive, ref} from "vue";
import {type FeeRule, type FeeRuleType, pageFeeRuleApi, updateFeeRuleStatusApi} from "@/api/fee";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {ElMessage} from "element-plus";
import {pageParkingLotApi, type ParkingLot} from "@/api/parkingLot";

defineOptions({name: 'Fee'})

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

/** 停车场名称Map */
const lotNameMap = computed(() => {
  const map = new Map<string, string>()
  lotOptions.value.forEach(lot => map.set(lot.id!, lot.name))
  return map
})

const query = reactive({
  lotId: '',
  ruleName: '',
  ruleType: undefined as FeeRuleType | undefined,
  status: undefined as number | undefined,
})

const {pagination, tableData, loading, load, search} = usePaginationTable<FeeRule>(
  pageFeeRuleApi,
  () => ({...query})
)

const handleReset = () => {
  query.lotId = ''
  query.ruleName = ''
  query.ruleType = undefined
  query.status = undefined
  search()
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'lotId', label: '所属停车场', visible: true},
  {prop: 'ruleName', label: '规则名称', visible: true},
  {prop: 'ruleType', label: '规则类型', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'createTime', label: '创建时间', visible: true},
])

const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

/** 类型展示映射 */
const typeMap: Record<FeeRuleType, { label: string, type: 'primary' | 'success' | 'danger' }> = {
  1: {label: '标准', type: 'primary'},
  2: {label: '时段', type: 'success'},
  3: {label: '阶梯', type: 'danger'},
}

onMounted(() => {
  loadLotOptions()
  load()
})

const handleStatusBeforeChange = async (row: FeeRule) => {
  const next = row.status === 1 ? 0 : 1
  await updateFeeRuleStatusApi(row.id!, next)
  row.status = next
  ElMessage.success('切换状态成功')
  return true
}
</script>

<template>
  <div class="fee-page">
    <SearchPanel :collapsed-count="3" @search="search" @reset="handleReset">
      <el-form-item label="停车场">
        <el-select
          v-model="query.lotId"
          filterable
          placeholder="请选择停车场"
          clearable
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
      <el-form-item label="名称">
        <el-input v-model="query.ruleName" placeholder="请输入规则名称（模糊查询）" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="query.ruleType" placeholder="请选择规则类型" clearable style="width: 240px">
          <el-option label="标准" :value="1"/>
          <el-option label="时段" :value="2"/>
          <el-option label="阶梯" :value="3"/>
        </el-select>
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
        <el-button type="primary" plain>新增</el-button>
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
        <el-table-column v-if="isColVisible('lotId')" label="所属停车场" prop="lotId" align="center">
          <template #default="{row}">
            <span>{{ lotNameMap.get(row.lotId) || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('ruleName')" label="规则名称" prop="ruleName" align="center"/>
        <el-table-column v-if="isColVisible('ruleType')" label="规则类型" prop="ruleType" align="center">
          <template #default="{row}">
            <el-tag :type="typeMap[row.ruleType as FeeRuleType].type ?? 'info'" effect="plain">
              {{ typeMap[row.ruleType as FeeRuleType].label ?? '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" align="center">
          <template #default="{row}">
            <el-switch
              :model-value="row.status"
              :active-value="1"
              :inactive-value="0"
              :before-change="() => handleStatusBeforeChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="创建时间" prop="createTime" align="center"/>
        <el-table-column label="操作" fixed="right" width="180">
          <template #default="{row}">
            <el-button type="primary" icon="view" size="small"/>
            <el-button type="warning" icon="edit" size="small"/>
            <el-button type="danger" icon="delete" size="small"/>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
  </div>
</template>

<style scoped lang="scss">
.fee-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
</style>