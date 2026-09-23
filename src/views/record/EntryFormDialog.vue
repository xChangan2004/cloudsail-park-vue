<script setup lang="ts">
import type {ParkingLot} from "@/api/parkingLot";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";
import {type EntryFormDTO, manualEntryApi} from "@/api/record";
import dayjs from "dayjs";
import {pageParkingSpaceApi, type ParkingSpace, type SpaceType} from "@/api/parkingSpace";

defineOptions({name: 'EntryFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 停车场下拉数据
  lotOptions: ParkingLot[]
  // 默认停车场ID
  defaultLotId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const formRef = ref<FormInstance>()
const form = reactive<EntryFormDTO>({
  lotId: '',
  spaceId: '',
  plateNumber: '',
  entryTime: '',
})

const PLATE_NUMBER_REGEX =
  /^(?:[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z](?:[0-9]{5}[ABCDEFGHJK]|[ABCDEFGHJK][A-HJ-NP-Z0-9][0-9]{4})|[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]\d{3}\d{1,3}领|[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳使领])$/;

const rules: FormRules = {
  lotId: {required: true, message: '请选择停车场', trigger: 'change'},
  plateNumber: [
    {required: true, message: '请输入车牌号码', trigger: 'blur'},
    {pattern: PLATE_NUMBER_REGEX, message: '车牌号码格式不正确', trigger: 'blur'}
  ],
  spaceId: {required: true, message: '请选择车位', trigger: 'change'},
  entryTime: [
    {required: true, message: '请选择入场时间', trigger: 'change'},
    {
      validator: (rule: any, value: any, callback: any) => {
        return dayjs(value).isAfter(dayjs()) ? callback(new Error('入场时间不能晚于当前时间')) : callback()
      },
      trigger: 'change'
    }
  ]
}

/** 禁选未来日期，同日未来时刻由 notFuture 兜住 */
const disableFuture = (date: Date) => date.getTime() > Date.now()

/** 车位下拉只列空闲，与 entry() 的校验口径保持一致 */
const spaceList = ref<ParkingSpace[]>([])
const spaceLoading = ref(false)
const spaceTypeMap: Record<SpaceType, string> = {1: '普通', 2: '新能源'}

const loadSpaces = async () => {
  if (!form.lotId) {
    spaceList.value = []
    return
  }
  spaceLoading.value = true
  try {
    const page = await pageParkingSpaceApi({lotId: form.lotId, status: 1, pageNo: 1, pageSize: 200})
    // 后端默认按创建时间倒序，选位不可用，这里按编号重排
    spaceList.value = [...page.list].sort((a, b) => a.spaceCode.localeCompare(b.spaceCode))
  } catch {
    spaceList.value = []
  } finally {
    spaceLoading.value = false
  }
}

/** 换车场必须清掉已选车位 */
const handleLotChange = () => {
  form.spaceId = ''
  loadSpaces()
}

watch(() => props.modelValue, async (open) => {
  if (!open) return
  form.lotId = props.defaultLotId || ''
  form.spaceId = ''
  form.plateNumber = ''
  form.entryTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await nextTick()
  formRef.value?.clearValidate()
  await loadSpaces()
})

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await manualEntryApi(form)
    ElMessage.success('手动入场成功')
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
    title="手动入场"
    width="546px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      label-width="80px"
      :model="form"
      :rules="rules"
    >
      <el-form-item label="停车场" prop="lotId">
        <el-select
          v-model="form.lotId"
          placeholder="请选择停车场"
          filterable
          style="width: 100%"
          @change="handleLotChange"
        >
          <el-option
            v-for="lot in lotOptions"
            :key="lot.id"
            :label="`${lot.name} · 空闲 ${lot.freeSpaces} / ${lot.totalSpaces}`"
            :value="lot.id!"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="车牌号码" prop="plateNumber">
        <el-input
          v-model="form.plateNumber"
          placeholder="请输入车牌号码"
          clearable
        />
      </el-form-item>
      <el-form-item label="车位编号" prop="spaceId">
        <el-select
          v-model="form.spaceId"
          placeholder="请选择空余车位"
          filterable
          :loading="spaceLoading"
          :disabled="!form.lotId"
          style="width: 100%"
        >
          <el-option-group
            v-if="spaceList.length"
            :label="`仅显示空闲车位 · 按编号排序，共 ${spaceList.length} 个`"
          >
            <el-option v-for="sp in spaceList" :key="sp.id" :label="sp.spaceCode" :value="sp.id">
              <span class="space-code">{{ sp.spaceCode }}</span>
              <el-tag size="small" effect="plain" :type="sp.spaceType === 2 ? 'success' : 'info'">
                {{ spaceTypeMap[sp.spaceType] }}
              </el-tag>
            </el-option>
          </el-option-group>
          <template #empty>
            <div class="space-empty">
              {{ spaceList.length ? '未找到匹配的空闲车位，该编号可能已被占用或不存在' : '该停车场暂无空闲车位' }}
            </div>
          </template>
        </el-select>
      </el-form-item>
      <el-form-item label="入场时间" prop="entryTime">
        <el-date-picker
          v-model="form.entryTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择入场时间"
          :disabled-date="disableFuture"
          style="width: 100%"
        />
      </el-form-item>
      <div class="entry-hint">
        车牌须已在客户端绑定。绑定状态、车位可用性、欠费情况由后端在提交时校验，失败原因以浮层提示。车辆类型与车位类型是否匹配后端不校验，需自行确认。
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.entry-alert {
  margin-bottom: 16px;
}

/* 与 label-width 对齐，跟输入框同一列 */
.entry-hint {
  margin-left: 80px;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
}

.space-code {
  margin-right: 8px;
}

.space-empty {
  padding: 4px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
  text-align: left;
}
</style>