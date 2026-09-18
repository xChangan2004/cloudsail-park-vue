<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {onMounted, reactive, ref} from "vue";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import {exportOperlogApi, pageOperlogApi, type SysOperateLogVO} from "@/api/operlog";
import {pageUserApi} from "@/api/user";
import {ElLoading, ElMessage} from "element-plus";

defineOptions({name: 'SystemOperlog'})

/**
 * 搜索条件
 */
const query = reactive({
  userId: undefined,
  type: '',
  subType: '',
  success: undefined
})

// 记录日期范围
const dateRange = ref<string[]>([])

/** 操作人下拉选项（聚焦预加载 + 远程搜索） */
const userOptions = ref<{ id: string; label: string }[]>([])
const userLoading = ref(false)

const loadUserOptions = async (keyword?: string) => {
  userLoading.value = true
  try {
    const page = await pageUserApi({pageNo: 1, pageSize: 20, username: keyword || undefined})
    userOptions.value = page.list.map(u => ({id: u.id, label: `${u.username}（${u.nickname}）`}))
  } finally {
    userLoading.value = false
  }
}

const {pagination, tableData, loading, load, search} = usePaginationTable<SysOperateLogVO>(
  pageOperlogApi,
  () => ({
    ...query,
    beginTime: dateRange.value?.[0] ? dateRange.value[0] + ' 00:00:00' : undefined,
    endTime: dateRange.value?.[1] ? dateRange.value[1] + ' 23:59:59' : undefined
  })
)

/**
 * 重置查询条件
 */
const handleReset = () => {
  query.userId = undefined
  query.type = ''
  query.subType = ''
  query.success = undefined
  dateRange.value = []
  userOptions.value = []
  search()
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')
/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'type', label: '操作模块', visible: true},
  {prop: 'subType', label: '操作名', visible: true},
  {prop: 'username', label: '操作人员', visible: true},
  {prop: 'userIp', label: '操作地址', visible: true},
  {prop: 'success', label: '操作状态', visible: true},
  {prop: 'createTime', label: '操作时间', visible: true},
  {prop: 'costMs', label: '耗时', visible: true},
])
const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

onMounted(load)

const descDialog = ref(false)
const rowData = ref<SysOperateLogVO>()
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type ElTagType = 'primary' | 'success' | 'warning' | 'danger'

const httpTagMap: Record<HttpMethod, ElTagType> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  DELETE: 'danger'
}

const openDesc = (row: SysOperateLogVO) => {
  rowData.value = row
  descDialog.value = true
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的内容
 */
const copyText = async (text?: string) => {
  if (!text) {
    ElMessage.warning('暂无可复制的内容')
    return false
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('复制成功')
    return true
  } catch (err) {
    ElMessage.error('复制失败，请手动选择复制')
    return false
  }
}

const handleExport = async () => {
  const loading = ElLoading.service({text: '正在导出...'})
  try {
    const res = await exportOperlogApi({
      ...query,
      beginTime: dateRange.value?.[0] ? dateRange.value[0] + ' 00:00:00' : undefined,
      endTime: dateRange.value?.[1] ? dateRange.value[1] + ' 23:59:59' : undefined,
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize
    })
    const blob = res.data as Blob

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `操作日志_${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error('导出失败')
  } finally {
    loading.close()
  }
}
</script>

<template>
  <div class="oper-log-page">
    <SearchPanel :collapsed-count="3" @reset="handleReset" @search="search">
      <el-form-item label="操作人">
        <el-select
          v-model="query.userId"
          placeholder="输入用户名搜索"
          style="width: 240px"
          clearable
          filterable
          remote
          :remote-method="loadUserOptions"
          :loading="userLoading"
          remote-show-suffix
        >
          <el-option v-for="u in userOptions" :key="u.id" :label="u.label" :value="u.id"/>
        </el-select>
      </el-form-item>
      <el-form-item label="操作模块">
        <el-input v-model="query.type" placeholder="请输入操作模块" style="width: 240px" clearable/>
      </el-form-item>
      <el-form-item label="操作名">
        <el-input v-model="query.subType" placeholder="请输入操作名" style="width: 240px" clearable/>
      </el-form-item>
      <el-form-item label="操作时间">
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
      <el-form-item label="操作结果">
        <el-select v-model="query.success" clearable style="width: 240px">
          <el-option label="成功" value="1"/>
          <el-option label="失败" value="0"/>
        </el-select>
      </el-form-item>
    </SearchPanel>

    <TablePanel :pagination="pagination" @page-change="load">
      <template #toolbar-left>
        <el-button type="danger" plain>删除</el-button>
        <el-button type="warning" plain @click="handleExport">导出</el-button>
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
        <el-table-column type="selection" align="center"/>
        <el-table-column type="index" label="序号" align="center" width="80"/>
        <el-table-column v-if="isColVisible('type')" label="操作模块" prop="type" align="center" width="160"/>
        <el-table-column v-if="isColVisible('subType')" label="操作名" prop="subType" align="center" width="160"
                         show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('username')" label="操作人员" prop="username" align="center" width="180"
                         show-overflow-tooltip sortable/>
        <el-table-column v-if="isColVisible('userIp')" label="操作地址" prop="userIp" align="center" width="180"
                         show-overflow-tooltip/>
        <el-table-column v-if="isColVisible('success')" label="操作状态" prop="success" align="center" width="90">
          <template #default="{row}">
            <el-tag v-if="row.success == 1" type="success">成功</el-tag>
            <el-tag v-else type="danger">失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="操作时间" prop="createTime" align="center" sortable/>
        <el-table-column
          label="耗时ms"
          prop="costMs"
          align="center"
          width="120"
          sortable
          :sort-method="(a: SysOperateLogVO, b: SysOperateLogVO) => Number(a.costMs) - Number(b.costMs)"
        >
          <template #default="{row}">
            <span>{{ row.costMs }}毫秒</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="80px" align="center">
          <template #default="{row}">
            <el-button @click="openDesc(row)" link type="primary" icon="view">详细</el-button>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>

    <el-dialog
      title="操作日志详情"
      v-model="descDialog"
    >
      <div class="detail-wrap" v-if="rowData">
        <div class="detail-card">
          <div class="detail-card-title">
            <el-icon color="#409eff" style="margin-right: 5px">
              <InfoFilled/>
            </el-icon>
            基本信息
          </div>
          <el-row class="detail-row">
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">操作模块</div>
                <div class="detail-value">{{ rowData?.type }}</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">业务类型</div>
                <div class="detail-value">{{ rowData?.subType }}</div>
              </div>
            </el-col>
          </el-row>
          <el-row class="detail-row">
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">操作时间</div>
                <div class="detail-value">{{ rowData?.createTime }}</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">执行状态</div>
                <div class="detail-value">{{ rowData?.success ? '成功' : '失败' }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">
            <el-icon color="#409eff" style="margin-right: 5px">
              <User/>
            </el-icon>
            操作人员
          </div>
          <el-row class="detail-row">
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">操作人员</div>
                <div class="detail-value">{{ rowData?.username }}</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">操作地址</div>
                <div class="detail-value">{{ rowData?.userIp }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">
            <el-icon color="#409eff" style="margin-right: 5px">
              <Sort/>
            </el-icon>
            请求信息
          </div>
          <el-row class="detail-row">
            <div class="detail-item">
              <div class="detail-label">请求地址</div>
              <div class="detail-value">
                <el-tag :type="httpTagMap[rowData?.requestMethod as HttpMethod] ?? 'info'">
                  {{ rowData?.requestMethod }}
                </el-tag>
                {{ rowData?.requestUrl }}
              </div>
            </div>
          </el-row>
          <el-row class="detail-row">
            <div class="detail-item">
              <div class="detail-label">操作方法</div>
              <div class="detail-value">{{ rowData?.method }}</div>
            </div>
          </el-row>
          <el-row class="detail-row">
            <div class="detail-item">
              <div class="detail-label">消耗时间</div>
              <div class="detail-value">{{ rowData?.costMs }} 毫秒</div>
            </div>
          </el-row>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">
            <el-icon color="#409eff" style="margin-right: 5px">
              <Upload/>
            </el-icon>
            请求参数
          </div>
          <div class="code-body">
            <div class="code-wrap">
              <div class="code-action">
                <el-button icon="copy-document" size="small" @click="copyText(rowData?.action)">复制</el-button>
              </div>
              <pre class="code-pre">{{ rowData?.action }}</pre>
            </div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">
            <el-icon color="#409eff" style="margin-right: 5px">
              <Download/>
            </el-icon>
            返回参数
          </div>
          <div class="code-body">
            <div class="code-wrap">
              <div class="code-action">
                <el-button icon="copy-document" size="small" @click="copyText(rowData?.jsonResult)">复制</el-button>
              </div>
              <pre class="code-pre">{{ rowData?.jsonResult ?? '(无数据)' }}</pre>
            </div>
          </div>
        </div>
        <div class="detail-card" v-if="!rowData?.success">
          <div class="detail-card-title">
            <el-icon color="#c0392b" style="margin-right: 5px">
              <InfoFilled/>
            </el-icon>
            异常信息
          </div>
          <div class="error-body">
            <div class="error-msg">
              {{ rowData?.errorMsg }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.oper-log-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.detail-wrap {
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  .detail-card {
    border: 1px solid #ebeef5;
    border-radius: 6px;

    .detail-card-title {
      display: flex;
      align-items: center;
      background-color: #f7f9fb;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #333;
      border-bottom: 1px solid #ebeef5;
    }

    .detail-row {
      padding: 0 8px;

      .detail-item {
        display: flex;
        align-items: center;
        padding: 10px 8px;
        font-size: 13px;

        .detail-label {
          flex-shrink: 0;
          width: 72px;
          color: #909399;
          margin-right: 12px;
        }

        .detail-value {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #303133;
          flex: 1;
          word-break: break-all;
        }
      }
    }

    .code-body {
      padding: 14px;

      .code-wrap {
        background: #f7f9fb;
        border: 1px solid #e8ecf0;
        border-radius: 4px;
        overflow: hidden;
        max-height: 260px;
        position: relative;

        .code-action {
          position: absolute;
          top: 8px;
          right: 8px;
          margin: 0;
          padding: 0;
        }

        .code-pre {
          padding: 14px;
          font-size: 12px;
          font-family: Consolas, SFMono-Regular, monospace;
          line-height: 1.6;
          color: #444;
          white-space: pre-wrap;
          word-break: break-all;
          overflow: auto;
          max-height: 260px;
          display: block;
          text-align: left !important;
        }
      }
    }

    .error-body {
      padding: 12px 16px;

      .error-msg {
        background: #fff8f8;
        border-left: 3px solid #e74c3c;
        border-radius: 3px;
        padding: 8px 12px;
        color: #c0392b;
        font-size: 12px;
        line-height: 1.7;
        word-break: break-all;
        white-space: pre-wrap;
      }
    }
  }
}
</style>