<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import SearchPanel from '@/components/SearchPanel/index.vue'
import {
  delFacilityApi,
  listFacilityApi,
  type ParkingFacility
} from '@/api/facility'
import FacilityFormDialog from "@/views/parking/facility/FacilityFormDialog.vue";

defineOptions({name: 'ParkingFacility'})

/** 查询条件 */
const query = reactive({
  code: '',
  name: '',
  status: undefined as number | undefined,
})

const list = ref<ParkingFacility[]>([])
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    const res = await listFacilityApi(query)
    list.value = res ?? []
  } finally {
    loading.value = false
  }
}

onMounted(load)

const handleReset = () => {
  query.code = ''
  query.name = ''
  query.status = undefined
  load()
}

const dialogVisible = ref(false)
const editingRow = ref<ParkingFacility | null>(null)

const handleAdd = () => {
  editingRow.value = null
  dialogVisible.value = true
}

const handleEdit = (row: ParkingFacility) => {
  editingRow.value = row
  dialogVisible.value = true
}

const handleDelete = async (row: ParkingFacility) => {
  try {
    await ElMessageBox.confirm(
      `确认删除服务设施 [${row.name}] 吗？`,
      '提示',
      {
        type: 'warning',
        confirmButtonText: '确认',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }
  await delFacilityApi(row.id)
  ElMessage.success('删除设施成功')
  await load()
}
</script>

<template>
  <div class="facility-page">
    <SearchPanel @reset="handleReset" @search="load">
      <el-form-item label="编码">
        <el-input v-model.trim="query.code" placeholder="请输入编码" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model.trim="query.name" placeholder="请输入名称" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model.number="query.status" placeholder="请选择状态" clearable style="width: 240px">
          <el-option label="启用" :value="1"/>
          <el-option label="停用" :value="0"/>
        </el-select>
      </el-form-item>
    </SearchPanel>

    <div class="facility-board">
      <div class="facility-board__head">
        <el-button type="primary" plain @click="handleAdd">新增设施</el-button>
        <div class="facility-board__actions">
          <el-button icon="Refresh" circle @click="load"/>
        </div>
      </div>

      <div v-loading="loading" class="facility-board__body">
        <div v-if="list.length" class="facility-grid">
          <div
            v-for="f in list"
            :key="f.id"
            class="facility-card"
            :class="{'is-off': f.status === 0}"
          >
            <span
              class="facility-card__badge"
              :class="{ 'is-off': f.status === 0 }"
            >{{ f.status === 1 ? '启用' : '停用' }}</span>

            <div class="facility-card__icon">
              <SvgIcon :name="f.icon" :width="22" :height="22"/>
            </div>
            <div class="facility-card__name">{{ f.name }}</div>
            <div class="facility-card__code">{{ f.code }}</div>
            <div class="facility-card__foot">
              <span class="facility-card__sort">排序 <em>{{ f.sort }}</em></span>
              <div class="facility-card__ops">
                <el-button link type="primary" icon="Edit" @click="handleEdit(f)"/>
                <el-button link type="danger" icon="Delete" @click="handleDelete(f)"/>
              </div>
            </div>
          </div>
        </div>

        <el-empty
          v-else
          description="还没有服务设施，先加一个吧"
          :image-size="90"
        />
      </div>
    </div>

    <FacilityFormDialog v-model="dialogVisible" :row="editingRow" @success="load"/>
  </div>
</template>

<style scoped lang="scss">
.facility-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.facility-board {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid #e3e8ee;
  border-radius: 8px;

  &__head {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }

  &__stat {
    font-size: 13px;
    color: #909399;
  }

  &__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
  }
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

.facility-card {
  position: relative;
  padding: 18px 16px 14px;
  background: var(--el-bg-color);
  border: 1px solid #eef0f4;
  border-radius: 10px;
  transition: box-shadow .18s, border-color .18s, transform .18s;

  &:hover {
    border-color: #d6e2ff;
    box-shadow: 0 6px 20px rgba(93, 135, 255, .12);
    transform: translateY(-2px);
  }

  &.is-off {
    opacity: .58;

    .facility-card__icon {
      filter: grayscale(1);
    }
  }

  &__badge {
    position: absolute;
    top: 14px;
    right: 14px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding: 0 9px;
    font-size: 12px;
    color: #67c23a;
    background: #f0f9eb;
    border: 1px solid #e1f3d8;
    border-radius: 11px;
    user-select: none;
    transition: all .15s;

    &::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    &.is-off {
      color: #909399;
      background: #f4f4f5;
      border-color: #e9e9eb;
    }
  }

  &__icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5d87ff;
    background: #eef3ff;
    border-radius: 12px;
  }

  &__name {
    margin-top: 14px;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__code {
    margin-top: 3px;
    font-size: 12px;
    letter-spacing: .4px;
    color: #909399;
    font-family: Consolas, Monaco, monospace;
  }

  &__foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px dashed #f0f2f5;
  }

  &__sort {
    font-size: 12px;
    color: #909399;

    em {
      font-weight: 500;
      color: var(--el-text-color-regular);
    }
  }

  &__ops {
    margin-left: auto;
    display: flex;
    gap: 6px;
  }
}
</style>