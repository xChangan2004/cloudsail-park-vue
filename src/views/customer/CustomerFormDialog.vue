<script setup lang="ts">
import {addCustomerApi, type Customer, type CustomerFormDTO, editCustomerApi, unbindWechatApi} from "@/api/customer";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, ElMessageBox, type FormInstance, type FormRules} from "element-plus";

defineOptions({name: 'CustomerFormDialog'})

const props = defineProps<{
  modelValue: boolean
  row?: Customer | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.row?.id)

const formRef = ref<FormInstance>()
const form = reactive<CustomerFormDTO>({
  id: null,
  phone: '',
  nickname: '',
  avatar: ''
})

const rules: FormRules = {
  phone: [
    {required: true, message: '请输入手机号码', trigger: 'blur'},
    {
      pattern: /^1([38][0-9]|4[579]|5[0-3,5-9]|6[6]|7[0135678]|9[89])\d{8}$/,
      message: '手机号码格式不正确',
      trigger: 'blur'
    }
  ],
  nickname: {required: true, message: '请输入昵称', trigger: 'blur'}
}

/** 微信绑定状态：取消关联后即时变，不必等列表刷新 */
const wechatBound = ref(false)

// 打开时复位（含上次的校验红字）
watch(() => props.modelValue, async (open) => {
  if (!open) return
  const row = props.row
  Object.assign(form, {
    id: row?.id ?? null,
    phone: row?.phone ?? '',
    nickname: row?.nickname ?? '',
    avatar: row?.avatar ?? ''
  })
  wechatBound.value = !!row?.openid
  await nextTick()
  formRef.value?.clearValidate()
})

/** 取消微信关联 */
const handleUnbindWechat = async () => {
  if (!props.row) return
  try {
    await ElMessageBox.confirm('确认取消该客户的微信关联吗？取消后客户需重新授权登录。', '提示', {
      type: 'warning',
      confirmButtonText: '取消关联',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return // 用户点了取消
  }
  await unbindWechatApi(props.row.id)
  wechatBound.value = false
  ElMessage.success('已取消该客户微信关联')
  emit('success')
}

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await editCustomerApi({...form})
    } else {
      await addCustomerApi({...form})
    }
    ElMessage.success(isEdit.value ? '编辑客户成功' : '新增客户成功')
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
    :title="isEdit ? '编辑客户' : '新增客户'"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="手机号码" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号码"/>
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" placeholder="请输入昵称"/>
      </el-form-item>
      <el-form-item v-if="isEdit" label="微信">
        <div class="wechat-row">
          <el-tag size="small" effect="plain" :type="wechatBound ? 'success' : 'info'">
            {{ wechatBound ? '已绑定' : '未绑定' }}
          </el-tag>
          <el-button v-if="wechatBound" type="danger" link @click="handleUnbindWechat">取消关联</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.wechat-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>