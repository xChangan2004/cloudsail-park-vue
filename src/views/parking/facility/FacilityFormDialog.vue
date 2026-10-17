<script setup lang="ts">
import {addFacilityApi, editFacilityApi, type FacilityFormDTO, type ParkingFacility} from "@/api/facility.ts";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";
import IconSelect from "@/components/IconSelect/index.vue";

defineOptions({name: 'FacilityFormDialog'})

const props = defineProps<{
  modelValue: boolean
  /** 有值=编辑，无值=新增 */
  row?: ParkingFacility | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.row?.id)

const defaultForm = (): FacilityFormDTO => ({
  id: null,
  code: '',
  name: '',
  icon: '',
  sort: 1,
  status: 1
})

const formRef = ref<FormInstance>()
const form = reactive<FacilityFormDTO>(defaultForm())

const rules: FormRules = {
  name: [
    {required: true, message: '请输入设施名称', trigger: 'blur'},
    {max: 32, message: '名称最多 32 个字', trigger: 'blur'}
  ],
  code: [
    {required: true, message: '请输入设施编码', trigger: 'blur'},
    {
      pattern: /^[A-Z][A-Z0-9_]{1,31}$/,
      message: '大写字母开头，只含大写字母/数字/下划线，2~32 位',
      trigger: 'blur'
    }
  ]
}

watch(() => props.modelValue, async (open) => {
  if (!open) return
  Object.assign(form, defaultForm())
  if (props.row) {
    Object.assign(form, props.row)
  }
  await nextTick()
  formRef.value?.clearValidate()
})

const submitting = ref(false)

const handleSubmit = async () => {
  await formRef?.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await editFacilityApi(form)
    } else {
      await addFacilityApi(form)
    }
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
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
    :title="isEdit ? '编辑服务设施' : '新增服务设施'"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      label-width="72px"
      :model="form"
      :rules="rules"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="如 充电桩" maxlength="32" show-word-limit/>
      </el-form-item>

      <el-form-item label="编码" prop="code">
        <el-input
          v-model="form.code"
          :disabled="isEdit"
          placeholder="如 CHARGING"
          @input="form.code = (form.code || '').toUpperCase()"
        />
        <div class="form-tip" v-if="isEdit">编码保存后不可修改</div>
      </el-form-item>

      <el-form-item label="图标">
        <IconSelect v-model="form.icon"/>
      </el-form-item>

      <el-row>
        <el-col :span="12">
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" :min="1" :max="999" controls-position="right"/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="启用" :value="1"/>
              <el-option label="停用" :value="0"/>
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #909399;
}
</style>