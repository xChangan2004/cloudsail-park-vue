<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from "vue";
import {addRoleApi, editRoleApi, type SysRole} from "@/api/role";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";

defineOptions({name: 'RoleFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 有值=编辑
  row?: SysRole | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.row)

const defaultForm = (): SysRole => ({
  id: null,
  name: '',
  code: '',
  sort: 0,
  status: 1,
  remark: '',
})

const formRef = ref<FormInstance>()
const form = reactive<SysRole>(defaultForm())

const rules: FormRules = {
  name: [{required: true, message: '请输入角色名称', trigger: 'blur'}],
  code: [{required: true, message: '请输入角色编码', trigger: 'blur'}],
}

// 每次打开：新增表单重置，并清掉上次的校验红字
watch(() => props.modelValue, async (open) => {
  if (!open) return
  // 先铺干净默认值，防上次残留
  Object.assign(form, defaultForm())
  if (props.row) {
    Object.assign(form, props.row)
  }
  await nextTick()
  formRef.value?.clearValidate()
})

// 提交
const submitting = ref(false)
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = {
      id: form.id ?? null,
      name: form.name,
      code: form.code,
      sort: form.sort,
      status: form.status,
      remark: form.remark,
    }
    if (isEdit.value) await editRoleApi(payload)
    else await addRoleApi(payload)
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
    :title="isEdit ? '编辑角色' : '新增角色'"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入角色名称"/>
      </el-form-item>
      <el-form-item label="编码" prop="code">
        <el-input v-model="form.code" placeholder="请输入角色编码"/>
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="form.remark"
          type="textarea"
          :autosize="{minRows: 3, maxRows: 6}"
          resize="none"
          maxlength="255"
          show-word-limit
          placeholder="请输入角色描述"
        />
      </el-form-item>
      <el-form-item label="顺序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="999" type="number" placeholder="请输入顺序"
                         style="width: 180px"/>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-switch v-model="form.status" :active-value="1" :inactive-value="0"/>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">

</style>