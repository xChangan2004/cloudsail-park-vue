<script setup lang="ts">
import {onMounted, reactive, ref} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {Plus} from '@element-plus/icons-vue'
import {delUserApi, pageUserApi, resetPwdApi, updateUserStatusApi} from '@/api/user'
import type {UserPageVO} from '@/api/user'
import SearchPanel from '@/components/SearchPanel/index.vue'
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import UserFormDialog from "@/views/system/user/UserFormDialog.vue";

defineOptions({name: 'SystemUser'})

/** 搜索条件 */
const query = reactive({
  username: '',
  phone: '',
  status: undefined as number | undefined
})

const {pagination, tableData, loading, load, search} = usePaginationTable<UserPageVO>(
  pageUserApi,
  () => ({...query})
)

/** 点重置：清空条件后重新查询 */
const handleReset = () => {
  query.username = ''
  query.phone = ''
  query.status = undefined
  search()
}

// 勾选
const selectedRows = ref<UserPageVO[]>([])
const handleSelectionChange = (rows: UserPageVO[]) => {
  selectedRows.value = rows
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'username', label: '用户名', visible: true},
  {prop: 'phone', label: '手机号', visible: true},
  {prop: 'sex', label: '性别', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'loginIp', label: '最后登录IP', visible: true},
  {prop: 'loginDate', label: '最后登录时间', visible: true},
  {prop: 'createTime', label: '创建时间', visible: true}
])
const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

/** 用户性别文本 */
const sexText = (sex: number) => (sex === 1 ? '男' : '女')

onMounted(load)

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

// 新增
const handleAdd = () => {
  editingId.value = null
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: UserPageVO) => {
  editingId.value = row.id
  dialogVisible.value = true
}

// 重置密码
const handleResetPwd = async (row: UserPageVO) => {
  try {
    await ElMessageBox.confirm(`确认将用户 [${row.username}] 的密码重置为默认密码吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '重置',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return // 用户点了取消
  }
  await resetPwdApi(row.id)
  ElMessage.success('重置成功')
}

// 删除
const handleDelete = async (row: UserPageVO) => {
  try {
    await ElMessageBox.confirm(`确认要删除用户 [${row.username}] 吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return // 用户点了取消
  }
  await delUserApi(row.id)
  ElMessage.success('删除成功')
  await load()
}

/**
 * 行内状态开关：before-change 里调接口
 * 成功 → 改 row.status 开关翻转；失败 → reject 开关不动
 */
const handleStatusBeforeChange = async (row: UserPageVO) => {
  const next = row.status === 1 ? 0 : 1
  await updateUserStatusApi(row.id, next)
  row.status = next
  ElMessage.success('切换状态成功')
  return true
}
</script>

<template>
  <div class="user-page">
    <!-- 搜索面板：收起时只显示前3项 -->
    <SearchPanel :collapsed-count="3" @search="search" @reset="handleReset">
      <el-form-item label="用户名">
        <el-input v-model="query.username" placeholder="请输入用户名" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="query.phone" placeholder="请输入手机号" clearable style="width: 240px"/>
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
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
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
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center"/>
        <el-table-column type="index" label="序号" width="80" align="center"/>
        <el-table-column v-if="isColVisible('username')" prop="username" label="用户名" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <el-image
                :src="row.avatar"
                :preview-src-list="[row.avatar]"
                preview-teleported
                hide-on-click-modal
                fit="cover"
                class="user-cell__avatar"
              />
              <div class="user-cell__info">
                <span class="user-cell__username">{{ row.username }}</span>
                <span class="user-cell__nickname">{{ row.nickname }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('phone')" prop="phone" label="手机号" min-width="160"/>
        <el-table-column v-if="isColVisible('sex')" prop="sex" label="性别" min-width="90" sortable>
          <template #default="{row}">
            {{ sexText(row.sex) }}
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('status')" prop="status" label="状态" width="90" align="center">
          <template #default="{row}">
            <el-switch
              :model-value="row.status"
              :active-value="1"
              :inactive-value="0"
              :before-change="() => handleStatusBeforeChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('loginIp')" prop="loginIp" label="最后登录IP" min-width="170"
                         align="center"/>
        <el-table-column v-if="isColVisible('loginDate')" prop="loginDate" label="最后登录时间" min-width="170"
                         align="center" sortable/>
        <el-table-column v-if="isColVisible('createTime')" prop="createTime" label="创建时间" min-width="170"
                         align="center" sortable/>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{row}">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleResetPwd(row)">重置密码</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <UserFormDialog v-model="dialogVisible" :id="editingId" @success="load"/>
  </div>
</template>

<style scoped lang="scss">
.user-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.user-cell {
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

  &__info {
    display: flex;
    flex-direction: column;
    min-width: 0; // 让里面的文本超出时能正常省略，不被 flex 撑开
    line-height: 1.4;
  }

  &__username {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__nickname {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
