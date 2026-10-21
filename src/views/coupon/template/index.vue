<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import {onMounted, reactive, ref} from "vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {usePaginationTable} from "@/hooks/usePaginationTable.ts";
import {type CouponTemplatePageVO, delTemplateApi, pageTemplateApi, updateTemplateStatusApi} from "@/api/coupon";
import {ElMessage, ElMessageBox} from "element-plus";
import TemplateFormDialog from "@/views/coupon/template/TemplateFormDialog.vue";

defineOptions({name: 'CouponTemplate'})

/** 查询条件 */
const query = reactive({
  name: '',
  status: undefined as number | undefined,
})

/** 点重置：清空条件后重新查询 */
const handleReset = () => {
  query.name = ''
  query.status = undefined
  search()
}

const {pagination, tableData, loading, load, search} = usePaginationTable<CouponTemplatePageVO>(
  pageTemplateApi,
  () => ({...query})
)

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'coupon', label: '优惠券', visible: true},
  {prop: 'receivedRate', label: '进度条', visible: true},
  {prop: 'perLimit', label: '限领规则', visible: true},
  {prop: 'validDays', label: '有效期', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'createTime', label: '创建时间', visible: true}
])

const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

/** 进度条宽度 */
const barWidth = (rate: number) => Math.min(Math.max(rate ?? 0, 0), 100)

/** 是否已领完 */
const isSoldOut = (issued: number, total: number) => total > 0 && issued >= total

/** 进度条配色：< 50% 主色、>= 50% 橙色预警、领完灰色 */
const progClass = (rate: number, issued: number, total: number) =>
  isSoldOut(issued, total) ? 'is-done' : (rate >= 50 ? 'is-mid' : '')

const handleStatusBeforeChange = async (row: CouponTemplatePageVO) => {
  if (!row.id) return false
  const next = row.status === 1 ? 0 : 1
  await updateTemplateStatusApi(row.id, next)
  row.status = next
  ElMessage.success('切换状态成功')
  return true
}

onMounted(load)

const dialogVisible = ref(false)
const editingRow = ref<CouponTemplatePageVO | null>(null)

const handleAdd = () => {
  dialogVisible.value = true
  editingRow.value = null
}

const handleEdit = (row: CouponTemplatePageVO) => {
  dialogVisible.value = true
  editingRow.value = row
}

const handleDelete = async (row: CouponTemplatePageVO) => {
  if (!row.id) return
  try {
    await ElMessageBox.confirm(`确认要删除模板 [${row.name}] 吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }
  await delTemplateApi(row.id)
  ElMessage.success('删除成功')
  await load()
}
</script>

<template>
  <div class="template-page">
    <SearchPanel @search="search" @reset="handleReset">
      <el-form-item label="券名称">
        <el-input v-model.trim="query.name" placeholder="请输入券名称" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model.number="query.status" placeholder="请选择状态" clearable style="width: 240px">
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
        <el-table-column v-if="isColVisible('coupon')" label="优惠券" width="280">
          <template #default="{row}">
            <div class="coupon-face" :class="{ 'is-off': row.status === 0}">
              <div class="cf-amount">
                <span class="cf-yuan">¥</span>
                {{ row.amount }}
              </div>
              <div class="cf-info">
                <div class="cf-name" :title="row.name">{{ row.name }}</div>
                <div class="cf-cond">
                  <template v-if="row.threshold > 0">
                    满 <em>{{ row.threshold }}</em> 元可用
                  </template>
                  <template v-else>无门槛，直接抵扣</template>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('receivedRate')" label="领取进度" prop="receivedRate">
          <template #default="{row}">
            <div class="coupon-prog">
              <div class="coupon-prog__bar">
                <i
                  :class="progClass(row.receivedRate, row.issuedCount, row.totalCount)"
                  :style="{width: barWidth(row.receivedRate) + '%'}"
                />
              </div>
              <div class="coupon-prog__txt">
                <b>{{ row.issuedCount }}</b>
                <span>/</span>
                <span>{{ row.totalCount }}</span>
                <span class="pct">{{ row.receivedRate }}%</span>
                <span v-if="isSoldOut(row.issuedCount, row.totalCount)" class="tag-done">已领完</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('perLimit')" label="限领规则" prop="perLimit" align="center">
          <template #default="{row}">
            <span>每人 {{ row.perLimit }} 张</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('validDays')" label="有效期" prop="validDays" align="center">
          <template #default="{row}">
            <span>领取后 {{ row.validDays }} 天</span>
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
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{row}">
            <el-button type="warning" icon="Edit" size="small" @click="handleEdit(row)"/>
            <el-button type="danger" icon="Delete" size="small" @click="handleDelete(row)"/>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <TemplateFormDialog v-model="dialogVisible" :row="editingRow" @success="load"/>
  </div>
</template>

<style scoped lang="scss">
.template-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.coupon-face {
  display: inline-flex;
  align-items: stretch;
  height: 52px;
  border: 1px solid #E0E6F2;
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-bg-color);
  transition: border-color 0.16s, box-shadow 0.16s;
}

.cf-amount {
  width: 62px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef3ff, #e1eaff);
  color: var(--el-color-primary);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
}

.cf-yuan {
  margin-right: 1px;
  font-size: 11px;
  font-weight: 600;
}

.cf-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 168px;
  padding: 0 12px;
  border-left: 1px dashed #dce3f0;
}

.cf-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-cond {
  margin-top: 3px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;

  em {
    font-style: normal;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }
}

/* 下架 */
.coupon-face.is-off {
  filter: grayscale(1);
  opacity: 0.75;
}

.coupon-prog__bar {
  height: 6px;
  border-radius: 3px;
  background: #eef1f6;
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--el-color-primary);
    transition: width 0.3s;

    &.is-mid {
      background: var(--el-color-warning);
    }

    &.is-done {
      background: #c0c4cc;
    }
  }
}

.coupon-prog__txt {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;

  b {
    color: var(--el-text-color-primary);
    font-weight: 600;
  }

  .pct {
    margin-left: 2px;
    color: var(--el-text-color-regular);
  }
}

.tag-done {
  margin-left: auto;
  padding: 0 5px;
  font-size: 11px;
  line-height: 17px;
  color: var(--el-text-color-secondary);
  background: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 3px;
}
</style>