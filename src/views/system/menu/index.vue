<script setup lang="ts">
import {onMounted, reactive, ref} from "vue";
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {delMenuApi, menuListApi, type MenuSimpleVO} from "@/api/menu.ts";
import {ElMessage, ElMessageBox, type TableInstance} from "element-plus";
import MenuFormDialog from "@/views/system/menu/MenuFormDialog.vue";

defineOptions({name: 'SystemMenu'})

/** 搜索条件 */
const query = reactive({
  name: '',
  type: undefined as MenuSimpleVO['type'] | undefined,
  status: undefined as 0 | 1 | undefined
})

const loading = ref(false)
const tableRef = ref<TableInstance>()
const tableData = ref<MenuSimpleVO[]>([])
const isAllExpanded = ref(false)

/**
 * 递归收集所有 “有子节点” 的行
 */
const getParentRows = (rows: MenuSimpleVO[]): MenuSimpleVO[] =>
  rows.flatMap(row => row.children?.length ? [row, ...getParentRows(row.children)] : [])

/**
 * 全部展开/收起
 */
const toggleExpandAll = () => {
  isAllExpanded.value = !isAllExpanded.value
  getParentRows(tableData.value).forEach(row => {
    tableRef.value?.toggleRowExpansion(row, isAllExpanded.value)
  })
}

const load = async () => {
  loading.value = true
  try {
    tableData.value = await menuListApi(query)
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  query.name = ''
  query.type = undefined
  query.status = undefined
  load()
}

onMounted(load)

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')
/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'name', label: '名称', visible: true},
  {prop: 'type', label: '类型', visible: true},
  {prop: 'sort', label: '排序', visible: true},
  {prop: 'permission', label: '权限标识', visible: true},
  {prop: 'path', label: '路由地址', visible: true},
  {prop: 'component', label: '组件路径', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'createTime', label: '创建时间', visible: true}
])
const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

/** 类型展示 */
const typeText = (type: MenuSimpleVO['type']) => ({1: '目录', 2: '菜单', 3: '按钮'})[type]
const typeTag = (type: MenuSimpleVO['type']) => ({1: 'info', 2: 'primary', 3: 'danger'})[type]

/** 状态展示 */
const statusText = (status: MenuSimpleVO['status']) => ({0: '禁用', 1: '启用'})[status]
const statusTag = (status: MenuSimpleVO['status']) => ({0: 'danger', 1: 'success'})[status]

// 删除
const handleDelete = async (row: MenuSimpleVO) => {
  try {
    await ElMessageBox.confirm(`确定要删除「${row.name}」菜单吗？删除后无法恢复`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }
  await delMenuApi(row.id!)
  ElMessage.success('删除菜单成功')
  await load()
}

const dialogVisible = ref(false)
const dialogId = ref<string | null>(null)
const dialogParentId = ref<string | null>(null)
const dialogParentType = ref<1 | 2 | 3 | null>(null)

const handleAdd = () => {
  dialogId.value = null
  dialogParentId.value = null
  dialogParentType.value = null
  dialogVisible.value = true
}

const handleAddChild = (row: MenuSimpleVO) => {
  dialogId.value = null
  dialogParentId.value = row.id!
  dialogParentType.value = row.type
  dialogVisible.value = true
}

const handleEdit = (row: MenuSimpleVO) => {
  dialogId.value = row.id!
  dialogVisible.value = true
}
</script>

<template>
  <div class="menu-page">
    <SearchPanel :collapsed-count="3" @search="load" @reset="handleReset">
      <el-form-item label="菜单名称">
        <el-input v-model="query.name" placeholder="请输入菜单名称" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="菜单类型">
        <el-select v-model="query.type" placeholder="请选择类型" clearable style="width: 240px">
          <el-option label="目录" :value="1"/>
          <el-option label="菜单" :value="2"/>
          <el-option label="按钮" :value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="请选择状态" clearable style="width: 240px">
          <el-option label="启用" :value="1"/>
          <el-option label="停用" :value="0"/>
        </el-select>
      </el-form-item>
    </SearchPanel>

    <TablePanel>
      <template #toolbar-left>
        <el-button icon="Plus" type="primary" v-perm="'system:menu:add'" @click="handleAdd">新增</el-button>
        <el-button type="success" @click="toggleExpandAll">{{ isAllExpanded ? '收起' : '展开' }}</el-button>
      </template>

      <template #toolbar-right>
        <TableTools v-model:size="tableSize" :columns="columnSettings" @refresh="load"/>
      </template>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        :size="tableSize"
        row-key="id"
        height="100%"
        :default-expand-all="false"
        stripe
      >
        <el-table-column v-if="isColVisible('name')" label="名称" prop="name" min-width="140"/>
        <el-table-column v-if="isColVisible('type')" label="类型" prop="type" min-width="80" align="center">
          <template #default="{row}">
            <el-tag :type="typeTag(row.type)">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('sort')" label="排序" prop="sort" min-width="90" align="center"/>
        <el-table-column v-if="isColVisible('permission')" label="权限标识" prop="permission" min-width="200"
                         align="center"/>
        <el-table-column v-if="isColVisible('path')" label="路由地址" prop="path" min-width="200" align="center"/>
        <el-table-column v-if="isColVisible('component')" label="组件路径" prop="component" min-width="200"
                         align="center"/>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" min-width="90" align="center">
          <template #default="{row}">
            <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="创建时间" prop="createTime" min-width="170"
                         align="center"/>
        <el-table-column label="操作" min-width="170" fixed="right">
          <template #default="{row}">
            <el-button icon="Plus" type="primary" size="small" title="新增菜单" v-perm="'system:menu:add'"
                       @click="handleAddChild(row as MenuSimpleVO)"/>
            <el-button icon="Edit" type="warning" size="small" title="编辑菜单" v-perm="'system:menu:edit'"
                       @click="handleEdit(row as MenuSimpleVO)"/>
            <el-button icon="Delete" type="danger" size="small" title="删除菜单" v-perm="'system:menu:delete'"
                       @click="handleDelete(row as MenuSimpleVO)"/>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <MenuFormDialog v-model="dialogVisible" :id="dialogId" :parent-id="dialogParentId"
                    @success="load"/>
  </div>
</template>

<style scoped lang="scss">
.menu-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
</style>