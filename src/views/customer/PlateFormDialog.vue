<script setup lang="ts">
import {bindCustomerPlateApi, type Customer, type CustomerPlate, PLATE_NUMBER_REGEX} from "@/api/customer";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";

defineOptions({name: 'PlateFormDialog'});

const props = defineProps<{
  modelValue: boolean
  customer?: Customer | null
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
const form = reactive<Omit<CustomerPlate, 'id' | 'customerId'>>({
  plateNumber: '',
  energyType: 1,
  isDefault: false
})

const rules: FormRules = {
  plateNumber: [
    {required: true, message: '请输入车牌号码', trigger: 'blur'},
    {pattern: PLATE_NUMBER_REGEX, message: '车牌号码格式不正确', trigger: 'blur'},
  ],
  energyType: {required: true, message: '请选择能源类型', trigger: 'change'},
}

watch(() => props.modelValue, async (open) => {
  if (!open) return
  form.plateNumber = ''
  form.energyType = 1
  form.isDefault = false
  await nextTick()
  formRef?.value?.clearValidate()
})

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef?.value?.validate()
  if (!props.customer) return
  submitting.value = true
  try {
    await bindCustomerPlateApi({
      customerId: props.customer.id,
      ...form
    })
    ElMessage.success('绑定车牌成功')
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
    title="绑定车牌"
    width="460px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="客户">
        <span class="customer-name">{{ customer?.nickname || '--' }}</span>
        <span class="muted">{{ customer?.phone }}</span>
      </el-form-item>
      <el-form-item label="车牌号码" prop="plateNumber">
        <el-input v-model="form.plateNumber" placeholder="请输入车牌号码" clearable/>
      </el-form-item>
      <el-form-item label="能源类型" prop="energyType">
        <el-radio-group v-model="form.energyType">
          <el-radio :value="1">燃油车</el-radio>
          <el-radio :value="2">新能源</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="默认车牌">
        <el-switch v-model="form.isDefault"/>
      </el-form-item>
      <div class="plate-hint">车牌请直接输入，不要带「·」分隔符。绑定后该车牌才能入场。</div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.customer-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.muted {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.plate-hint {
  margin-left: 80px;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
}
</style>