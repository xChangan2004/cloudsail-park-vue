<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from "vue";
import {addUserApi, editUserApi, getUserApi, type UserDetailVO, type UserFormDTO} from "@/api/user";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";
import {listRoleApi, type SysRole} from "@/api/role.ts";

defineOptions({name: 'UserFormDialog'})

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

const defaultForm = (): UserFormDTO => ({
  id: null,
  username: '',
  nickname: '',
  password: '',
  phone: '',
  avatar: '',
  sex: 1,
  roleIds: []
})

const formRef = ref<FormInstance>()
const form = reactive<UserFormDTO>(defaultForm())

const rules: FormRules = {
  username: [
    {required: true, message: '请输入用户名', trigger: 'blur'},
    {min: 4, max: 20, message: '长度 4 到 20个字符', trigger: 'blur'}
  ],
  nickname: [{required: true, message: '请输入昵称', trigger: 'blur'}],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {min: 6, max: 32, message: '长度 6 到 32 个字符', trigger: 'blur'}
  ],
  phone: [
    {required: true, message: '请输入手机号', trigger: 'blur'},
    {
      pattern: /^1([38][0-9]|4[579]|5[0-3,5-9]|6[6]|7[0135678]|9[89])\d{8}$/,
      message: '手机号格式不正确',
      trigger: 'blur'
    }
  ],
  roleIds: [
    {required: true, message: '请至少选择一个角色', trigger: 'blur'},
  ]
}

// 角色下拉选项
const roleOptions = ref<SysRole[]>([])

// 拉一次缓存住，下次打开不再重复请求
const loadRoles = async () => {
  if (roleOptions.value.length) return
  roleOptions.value = await listRoleApi()
}

// 打开：新增重置 / 编辑查详情
const detailLoading = ref(false)
let detail: UserDetailVO
// 每次打开：新增表单重置，并清掉上次的校验红字
watch(() => props.modelValue, async (open) => {
  if (!open) return
  // 先铺干净默认值，防上次残留
  Object.assign(form, defaultForm())
  loadRoles() // 并行拉角色选项，不阻塞回显
  if (props.id) {
    detailLoading.value = true
    try {
      detail = await getUserApi(props.id)
      Object.assign(form, detail)
    } finally {
      detailLoading.value = false
    }
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
    if (isEdit.value) {
      // 编辑：不带username / password
      await editUserApi({
        id: props.id,
        nickname: form.nickname,
        phone: form.phone,
        sex: form.sex,
        roleIds: form.roleIds,
      })
    } else {
      await addUserApi({...form})
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
    :title="isEdit ? '编辑用户' : '新增用户'"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      v-loading="detailLoading"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item v-if="!isEdit" label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名"/>
      </el-form-item>
      <el-form-item v-if="!isEdit" label="密码" prop="password">
        <el-input v-model="form.password" type="password" show-password placeholder="请输入密码"/>
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" placeholder="请输入昵称"/>
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号"/>
      </el-form-item>
      <el-form-item label="性别" prop="sex">
        <el-radio-group v-model="form.sex">
          <el-radio :value="1">男</el-radio>
          <el-radio :value="0">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="角色" prop="roleIds">
        <el-select v-model="form.roleIds" multiple placeholder="请选择角色" style="width: 100%">
          <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id"/>
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