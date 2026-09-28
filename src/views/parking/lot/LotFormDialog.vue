<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormItemRule, type FormRules} from "element-plus";
import {addParkingLotApi, editParkingLotApi, getParkingLotApi, type ParkingLotFormDTO} from "@/api/lot";
import LocationPicker from "./components/LocationPicker.vue"

defineOptions({name: 'LotFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 有值=编辑（查详情回填），无值=新增
  id?: string | null
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

const defaultForm = (): ParkingLotFormDTO => ({
  id: null,
  name: '',
  address: '',
  totalSpaces: undefined,
  longitude: undefined,
  latitude: undefined,
  contact: '',
  status: 0
})

const formRef = ref<FormInstance>()
const form = reactive<ParkingLotFormDTO>(defaultForm())

/** 数值校验器：可选字段填了才校验；integer=true 时额外要求整数 */
const rangeValidator = (label: string, min: number, max: number, integer = false): FormItemRule['validator'] =>
  (_rule, value, callback) => {
    if (value === undefined || value === null || value === '') return callback()
    const num = Number(value)
    if (Number.isNaN(num)) return callback(new Error(`${label}必须是数字`))
    if (integer && !Number.isInteger(num)) return callback(new Error(`${label}必须是整数`))
    if (num < min || num > max) return callback(new Error(`${label}范围为 ${min} ~ ${max}`))
    callback()
  }

const rules: FormRules = {
  name: {required: true, message: '请输入名称', trigger: 'blur'},
  address: {required: true, message: '请选择位置', trigger: 'blur'},
  status: {required: true, message: '请选择状态', trigger: 'blur'},
  longitude: [{required: true, message: '请选择位置', trigger: 'blur'},
    {validator: rangeValidator('经度', -180, 180), trigger: 'blur'}],
  latitude: [{required: true, message: '请选择位置', trigger: 'blur'},
    {validator: rangeValidator('纬度', -90, 90), trigger: 'blur'}],
  totalSpaces: [
    {required: true, message: '请输入总车位数', trigger: 'blur'},
    {validator: rangeValidator('总车位数', 1, 99999, true), trigger: 'blur'}
  ],
}

const detailLoading = ref(false)
watch(() => props.modelValue, async (open) => {
  if (!open) return
  // 填充干净的默认值
  Object.assign(form, defaultForm())

  if (props.id) {
    detailLoading.value = true
    try {
      const detail = await getParkingLotApi(props.id) as ParkingLotFormDTO
      Object.assign(form, detail)
    } finally {
      detailLoading.value = false
    }
  }

  await nextTick()
  formRef?.value?.clearValidate()
})

const handlePicked = () => {
  formRef?.value?.validateField(['address', 'longitude', 'latitude']).catch(() => {
  })
}

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await editParkingLotApi(form)
    } else {
      await addParkingLotApi(form)
    }
    ElMessage.success(isEdit.value ? '编辑停车场成功' : '新增停车场成功')
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
    :title="isEdit ? '编辑停车场' : '新增停车场'"
    width="550px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      label-width="80px"
      :model="form"
      :rules="rules"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入名称"/>
      </el-form-item>
      <el-form-item label="地址" prop="address">
        <el-input v-model="form.address" readonly placeholder="在地图中选点后自动填充"/>
      </el-form-item>
      <el-row :gutter="18">
        <el-col :span="9">
          <el-form-item label="经度" prop="longitude">
            <el-input v-model.number="form.longitude" readonly placeholder="选点后填充"/>
          </el-form-item>
        </el-col>
        <el-col :span="9">
          <el-form-item label="纬度" prop="latitude">
            <el-input v-model.number="form.latitude" readonly placeholder="选点后填充"/>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <LocationPicker v-model:longitude="form.longitude" v-model:latitude="form.latitude"
                          v-model:address="form.address"
                          @picked="handlePicked"
          />
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="联系方式" prop="contact">
            <el-input v-model="form.contact" placeholder="请输入联系方式"/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="总车位" prop="totalSpaces">
            <el-input v-model.number="form.totalSpaces" placeholder="请输入总车位数"/>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="请选择状态">
          <el-option label="启用" :value="1"/>
          <el-option label="停用" :value="0"/>
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="detailLoading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">

</style>