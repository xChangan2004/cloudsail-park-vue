<script setup lang="ts">
import {onMounted, reactive, ref} from "vue";
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {pageRoleApi, type SysRole, delRoleApi} from "@/api/role";
import {ElMessage, ElMessageBox} from "element-plus";
import RoleFormDialog from "@/views/system/role/RoleFormDialog.vue";
import AssignPermDialog from "@/views/system/role/AssignPermDialog.vue";

defineOptions({name: 'SystemRole'})

/** 搜索条件 */
const query = reactive({
  name: '',
  code: '',
  status: undefined as number | undefined
})

const {pagination, tableData, loading, load, search} = usePaginationTable<SysRole>(
  pageRoleApi,
  () => ({...query})
)

/** 点重置：清空条件后重新查询 */
const handleReset = () => {
  query.name = ''
  query.code = ''
  query.status = undefined
  search()
}


/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'name', label: '名称', visible: true},
  {prop: 'code', label: '编码', visible: true},
  {prop: 'sort', label: '排序', visible: true},
  {prop: 'remark', label: '描述', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'createTime', label: '创建时间', visible: true}
])

const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

/** 状态文本 */
const statusText = (status: 0 | 1) => (status === 1 ? '启用' : '停用')

onMounted(load)

const dialogVisible = ref(false)
const editingRow = ref<SysRole | null>(null)

// 新增
const handleAdd = () => {
  editingRow.value = null
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: SysRole) => {
  editingRow.value = row
  dialogVisible.value = true
}

// 删除
const handleDelete = async (row: SysRole) => {
  try {
    await ElMessageBox.confirm(`确定删除角色"${row.name}"吗？此操作不可恢复！`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return // 用户点击了取消
  }
  await delRoleApi(row.id!)
  ElMessage.success('删除成功')
  await load()
}

// 分配权限
const assignVisible = ref(false)
const assignRoleId = ref<string | null>(null)

const handleAssignPerm = (row: SysRole) => {
  assignRoleId.value = row.id ?? null
  assignVisible.value = true
}
</script>

<template>
  <div class="role-page">
    <!-- 搜索面板 -->
    <SearchPanel :collapsed-count="3" @search="search" @reset="handleReset">
      <el-form-item label="名称">
        <el-input v-model="query.name" placeholder="请输入角色名称" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="编码">
        <el-input v-model="query.code" placeholder="请输入角色编码" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="请选择状态" clearable style="width: 240px">
          <el-option label="启用" :value="1"/>
          <el-option label="停用" :value="0"/>
        </el-select>
      </el-form-item>
    </SearchPanel>

    <!-- 表格面板 -->
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
        <el-table-column type="index" label="序号" width="80" align="center"/>
        <el-table-column v-if="isColVisible('name')" label="名称" prop="name" min-width="120" align="center"/>
        <el-table-column v-if="isColVisible('code')" label="编码" prop="code" min-width="160" align="center"/>
        <el-table-column v-if="isColVisible('sort')" label="排序" prop="sort" min-width="120" align="center" sortable/>
        <el-table-column v-if="isColVisible('remark')" label="描述" prop="remark" min-width="250" align="center" show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" min-width="90" align="center">
          <template #default="{row}">
            <el-tag type="primary" v-if="row.status === 1">{{ statusText(row.status) }}</el-tag>
            <el-tag type="danger" v-else>{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="创建时间" prop="createTime" min-width="170" align="center" sortable/>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{row}">
            <el-button link type="warning" @click="handleAssignPerm(row)">分配权限</el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <RoleFormDialog v-model="dialogVisible" :row="editingRow" @success="load"/>
    <AssignPermDialog v-model="assignVisible" :role-id="assignRoleId"/>
  </div>
</template>

<style scoped lang="scss">
.role-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
</style>