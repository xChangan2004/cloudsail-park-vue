<script setup lang="ts">
import type {Lot} from "@/api/lot.ts";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";
import {type EntryFormDTO, manualEntryApi} from "@/api/record";
import dayjs from "dayjs";
import {PLATE_NUMBER_REGEX} from "@/api/customer";

defineOptions({name: 'EntryFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 停车场下拉数据
  lotOptions: Lot[]
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
  plateNumber: '',
  entryTime: '',
})

const rules: FormRules = {
  lotId: {required: true, message: '请选择停车场', trigger: 'change'},
  plateNumber: [
    {required: true, message: '请输入车牌号码', trigger: 'blur'},
    {pattern: PLATE_NUMBER_REGEX, message: '车牌号码格式不正确', trigger: 'blur'}
  ],
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

watch(() => props.modelValue, async (open) => {
  if (!open) return
  form.lotId = props.defaultLotId || ''
  form.plateNumber = ''
  form.entryTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await nextTick()
  formRef.value?.clearValidate()
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
        车牌须已在客户端绑定。绑定状态、车场是否已满、欠费情况由后端在提交时校验，失败原因以浮层提示。
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
/* 与 label-width 对齐，跟输入框同一列 */
.entry-hint {
  margin-left: 80px;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
}
</style>