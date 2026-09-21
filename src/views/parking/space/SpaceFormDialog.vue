<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, ElInput, type FormInstance, type FormRules} from "element-plus";
import {
  addParkingSpaceApi,
  editParkingSpaceApi,
  getParkingSpaceApi,
  saveParkingSpaceBatchApi,
  type ParkingSpaceFormDTO,
  type SpaceBatchItem
} from "@/api/parkingSpace";

defineOptions({name: 'SpaceFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 有值=编辑（查详情回填），无值=新增
  id?: string | null
  // 当前停车场 id（提交时归属，不进表单）
  lotId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.id)

// 枚举值：类型 1 普通 / 2 新能源；状态 1 空闲
const defaultForm = (): ParkingSpaceFormDTO => ({
  id: null,
  spaceCode: '',
  spaceType: 1,
  status: 1
})

const formRef = ref<FormInstance>()
const form = reactive<ParkingSpaceFormDTO>(defaultForm())

/** 编号输入框（暂存后自动聚焦，形成"输入-回车"键盘流） */
const codeInputRef = ref<InstanceType<typeof ElInput>>()

/** 待新增列表（仅新增模式）：点「继续新增」暂存，最后一次性提交 */
const pendingList = ref<SpaceBatchItem[]>([])

const rules: FormRules = {
  spaceCode: {required: true, message: '请输入车位编号', trigger: 'blur'},
  spaceType: {required: true, message: '请选择车位类型', trigger: 'change'}
}

const detailLoading = ref(false)
watch(() => props.modelValue, async (open) => {
  if (!open) return
  // 填充干净的默认值
  Object.assign(form, defaultForm())
  pendingList.value = []

  if (props.id) {
    detailLoading.value = true
    try {
      const detail = await getParkingSpaceApi(props.id)
      // 显式挑字段回填（status 带上原状态，编辑不改状态）
      Object.assign(form, {
        id: detail.id,
        spaceCode: detail.spaceCode,
        spaceType: detail.spaceType,
        status: detail.status
      })
    } finally {
      detailLoading.value = false
    }
  }

  await nextTick()
  formRef?.value?.clearValidate()
})

/** 暂存列表内查重（同弹窗内防手滑重复） */
const existsInPending = (code: string) =>
  pendingList.value.some(item => item.spaceCode === code)

/** 点「继续新增」：当前条暂存，只清编号（保留类型），聚焦回编号框 */
const handleContinueAdd = async () => {
  await formRef.value?.validate()
  const code = form.spaceCode.trim()
  if (existsInPending(code)) {
    ElMessage.warning(`编号 [${code}] 已在待新增列表中`)
    return
  }
  pendingList.value.push({spaceCode: code, spaceType: form.spaceType})
  form.spaceCode = ''
  formRef.value?.clearValidate('spaceCode')
  await nextTick()
  codeInputRef.value?.focus()
}

/** 删除暂存条目 */
const removePending = (index: number) => {
  pendingList.value.splice(index, 1)
}

/** 编号框回车（仅新增模式）：暂存当前条，继续录下一条 */
const handleEnter = () => {
  if (!isEdit.value) handleContinueAdd()
}

const submitting = ref(false)
const handleSubmit = async () => {
  // 编辑：保持原有单条逻辑
  if (isEdit.value) {
    await formRef.value?.validate()
    submitting.value = true
    try {
      await editParkingSpaceApi({...form, lotId: props.lotId})
      ElMessage.success('编辑车位成功')
      visible.value = false
      emit('success')
    } finally {
      submitting.value = false
    }
    return
  }

  // 新增：当前表单（编号非空才算一条）+ 暂存列表 一起收集
  const code = form.spaceCode.trim()
  if (code || pendingList.value.length === 0) {
    // 表单有条，或全空（全空时校验会拦下"请输入车位编号"）
    await formRef.value?.validate()
  }
  if (code && existsInPending(code)) {
    ElMessage.warning(`编号 [${code}] 已在待新增列表中`)
    return
  }

  const items = [...pendingList.value]
  if (code) items.push({spaceCode: code, spaceType: form.spaceType})

  submitting.value = true
  try {
    if (items.length === 1) {
      // 单条：走单个新增接口
      const item = items[0]!
      await addParkingSpaceApi({id: null, spaceCode: item.spaceCode, spaceType: item.spaceType, status: 1, lotId: props.lotId})
      ElMessage.success('新增车位成功')
    } else {
      // 多条：走批量接口
      await saveParkingSpaceBatchApi(items, props.lotId)
      ElMessage.success(`批量新增 ${items.length} 个车位成功`)
    }
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑车位' : '新增车位'"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      label-width="80px"
      :model="form"
      :rules="rules"
    >
      <el-form-item label="编号" prop="spaceCode">
        <el-input
          ref="codeInputRef"
          v-model="form.spaceCode"
          placeholder="请输入车位编号，如 A-001，回车可暂存继续录"
          @keyup.enter="handleEnter"
        />
      </el-form-item>
      <el-form-item label="类型" prop="spaceType">
        <el-select v-model="form.spaceType" placeholder="请选择车位类型">
          <el-option label="普通" :value="1"/>
          <el-option label="新能源" :value="2"/>
        </el-select>
      </el-form-item>
    </el-form>

    <!-- 待新增列表（仅新增模式） -->
    <div v-if="!isEdit && pendingList.length" class="pending-list">
      <div class="pending-list__header">本次待新增（{{ pendingList.length }} 条）</div>
      <div class="pending-list__items">
        <el-tag
          v-for="(item, index) in pendingList"
          :key="item.spaceCode"
          :type="item.spaceType === 2 ? 'success' : 'info'"
          effect="plain"
          closable
          @close="removePending(index)"
        >{{ item.spaceCode }}</el-tag>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button v-if="!isEdit" :disabled="detailLoading" @click="handleContinueAdd">继续新增</el-button>
      <el-button type="primary" :loading="submitting" :disabled="detailLoading" @click="handleSubmit">提交</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.pending-list {
  padding: 10px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;

  &__header {
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__items {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-height: 160px;
    overflow-y: auto;
  }
}
</style>
