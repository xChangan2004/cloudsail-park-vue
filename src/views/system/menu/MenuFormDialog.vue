<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";
import {addMenuApi, editMenuApi, getMenuApi, type SysMenu} from "@/api/menu";
import IconSelect from "@/components/IconSelect/index.vue";

defineOptions({name: 'MenuFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean,
  // 有值=编辑
  id?: string | null
  // 新增子项时的父id（空=顶级目录新增，由入口决定层级）
  parentId?: string | null
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

const defaultForm = (): SysMenu => ({
  id: undefined,
  parentId: '0',
  name: '',
  type: 1,
  sort: 1,
  permission: '',
  path: '',
  icon: '',
  component: '',
  status: 1,
  visible: true,
  keepAlive: true
})

const formRef = ref<FormInstance>()
const form = reactive(defaultForm())

const rules: FormRules = {
  name: [{required: true, message: '请输入菜单名称', trigger: 'blur'}],
  path: [{
    // 目录/菜单必填路由地址，按钮不需要
    validator: (rule, value, callback) => {
      if (form.type !== 3 && !value) callback(new Error('请输入路由地址'))
      else callback()
    },
    trigger: 'blur'
  }],
  permission: [{
    // 按钮必填权限标识，目录/菜单选填
    validator: (rule, value, callback) => {
      if (form.type === 3 && !value) callback(new Error('请输入权限标识'))
      else callback()
    },
    trigger: 'blur'
  }]
}

const detailLoading = ref(false)
watch(() => props.modelValue, async (open) => {
  if (!open) return
  Object.assign(form, defaultForm())
  if (props.id) {
    detailLoading.value = true
    try {
      Object.assign(form, await getMenuApi(props.id))
    } finally {
      detailLoading.value = false
    }
  }
  await nextTick()
  formRef.value?.clearValidate()
})

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = {...form}
    // 按类型挑字段：被 v-if 隐藏的字段可能残留旧值，提交前清掉
    if (form.type === 1) {
      delete payload.component
      delete payload.permission
    } else if (form.type === 3) {
      delete payload.icon
      delete payload.component
      delete payload.path
    }
    if (isEdit.value) {
      await editMenuApi(payload)
    } else {
      delete payload.id
      await addMenuApi(payload)
    }
    ElMessage.success(isEdit.value ? '编辑菜单成功' : '新增菜单成功')
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
    :title="isEdit ? '编辑菜单' : '新增菜单'"
    width="680px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="上级菜单">

      </el-form-item>
      <el-form-item label="菜单类别" prop="type">
        <el-radio-group v-model="form.type" :disabled="isEdit">
          <el-radio-button :value="1">目录</el-radio-button>
          <el-radio-button :value="2">菜单</el-radio-button>
          <el-radio-button :value="3">按钮</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="菜单名称" prop="name">
            <el-input v-model="form.name" placeholder="菜单名称"/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="排序" prop="sort">
            <el-input-number v-model="form.sort" :min="1" :max="999"/>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16" v-if="form.type !== 3">
        <el-col :span="12">
          <el-form-item label="图标" prop="icon">
            <IconSelect v-model="form.icon"/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="路由地址" prop="path">
            <el-input v-model="form.path" placeholder="如：/dashboard"/>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item v-if="form.type !== 1" label="权限标识" prop="permission">
            <el-input v-model="form.permission" placeholder="如：system:user:add"/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item v-if="form.type === 2" label="组件路径" prop="component">
            <el-input v-model="form.component" placeholder="如：dashboard/index 或留空"/>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="是否启用" prop="status">
            <el-switch :active-value="1" :inactive-value="0" v-model="form.status"/>
          </el-form-item>
        </el-col>
        <el-col :span="8" v-if="form.type === 2" prop="keepAlive">
          <el-form-item label="页面缓存">
            <el-switch :active-value="true" :inactive-value="false" v-model="form.keepAlive"/>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="显示状态" v-if="form.type !== 3" prop="visible">
            <el-switch :active-value="true" :inactive-value="false" v-model="form.visible"/>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">

</style>