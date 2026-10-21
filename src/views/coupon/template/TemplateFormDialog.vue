<script setup lang="ts">
import {type CouponTemplateFormDTO, type CouponTemplatePageVO, editTemplateApi, saveTemplateApi} from "@/api/coupon";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormItemRule, type FormRules} from "element-plus";
import {InfoFilled, WarningFilled} from "@element-plus/icons-vue";
import dayjs from "dayjs";

defineOptions({name: 'TemplateFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 有值=编辑，无值=新增
  row?: CouponTemplatePageVO | null
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

const defaultForm = (): CouponTemplateFormDTO => ({
  id: null,
  name: '',
  threshold: undefined,
  amount: undefined,
  totalCount: undefined,
  perLimit: undefined,
  validDays: undefined,
})

const formRef = ref<FormInstance>()
const form = reactive<CouponTemplateFormDTO>(defaultForm())

const validateAmount: FormItemRule['validator'] = (_rule, value, callback) => {
  const amount = Number(value)
  if (Number.isNaN(amount) || amount <= 0) {
    return callback(new Error('抵扣金额必须大于 0'))
  }
  const threshold = Number(form.threshold)
  if (threshold !== undefined && threshold > 0 && amount >= threshold) {
    return callback(new Error('抵扣金额需小于使用门槛'))
  }
  callback()
}

const validateThreshold: FormItemRule['validator'] = (_rule, value, callback) => {
  const threshold = Number(value)
  if (Number.isNaN(threshold) || threshold < 0) {
    return callback(new Error('使用门槛不能小于 0'))
  }
  // 门槛一变，金额可能就不合法了，主动重校验一次
  if (form.amount !== undefined && form.amount !== null) {
    formRef.value?.validateField('amount').catch(() => {
    })
  }
  callback()
}

const rules: FormRules = {
  name: [
    {required: true, message: '请输入券名称', trigger: 'blur'},
    {max: 20, message: '券名称不超过 20 个字', trigger: 'blur'},
  ],
  amount: [
    {required: true, message: '请输入抵扣金额请', trigger: 'blur'},
    {validator: validateAmount, trigger: 'blur'}
  ],
  threshold: [
    {required: true, message: '输入使用门槛，无门槛则填 0', trigger: 'blur'},
    {validator: validateThreshold, trigger: 'blur'},
  ],
  totalCount: [
    {required: true, message: '请输入发放总量', trigger: 'blur'},
  ],
  perLimit: {required: true, message: '请输入每人限领次数', trigger: 'blur'},
  validDays: {required: true, message: '请输入有效期天数', trigger: 'blur'}
}

watch(() => props.modelValue, async (open) => {
  if (!open) return
  // 填充默认值
  Object.assign(form, defaultForm())

  if (props.row?.id) {
    // 将传递的数据覆盖
    Object.assign(form, props.row)
  }

  await nextTick()
  formRef?.value?.clearValidate()
})

const editResetWarn = computed(() => isEdit.value && props.row?.status === 1)

const footTip = computed(() =>
  editResetWarn.value
    ? '该模板当前为上架中，保存后会被重置为「已下架」，需重新上架'
    : '保存后为「已下架」状态，需在列表中手动上架才会出现在用户端'
)

const submitting = ref(false)

const handleSubmit = async () => {
  await formRef?.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await editTemplateApi(form)
    } else {
      await saveTemplateApi(form)
    }
    ElMessage.success(isEdit.value ? '编辑模板成功' : '新增模板成功')
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
    :title="isEdit ? '编辑优惠券模板' : '新增优惠券模板'"
    width="880px"
    :close-on-click-modal="false"
  >
    <div class="tpl-body">
      <el-form
        ref="formRef"
        class="tpl-form"
        label-width="88px"
        :model="form"
        :rules="rules"
      >
        <el-form-item label="券名称" prop="name">
          <el-input v-model.trim="form.name" maxlength="20" show-word-limit placeholder="如：新客立减券" clearable/>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="抵扣金额" prop="amount">
              <el-input v-model.number="form.amount" placeholder="10">
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="使用门槛" prop="threshold">
              <el-input v-model.number="form.threshold" placeholder="100">
                <template #prepend>满</template>
                <template #append>元</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="form-hint">门槛填 0 表示无门槛券，任意订单都能抵扣</div>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发放总量" prop="totalCount">
              <el-input v-model.number="form.totalCount" placeholder="500">
                <template #append>张</template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="每人限领" prop="perLimit">
              <el-input v-model.number="form.perLimit" placeholder="1">
                <template #append>张</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="有效天数" prop="validDays">
          <el-input v-model.number="form.validDays" placeholder="30">
            <template #prepend>领取后</template>
            <template #append>天</template>
          </el-input>
        </el-form-item>
        <div class="form-hint" v-if="form.validDays">优惠券模板预计在 {{
            dayjs().add(form.validDays, 'day').format('YYYY-MM-DD HH:mm:ss')
          }} 后过期
        </div>
      </el-form>
      <div class="tpl-preview">
        <div class="pv-label">用户端券面预览</div>
        <div class="p-coupon">
          <div class="amt">
            <b>¥{{ form.amount ?? '-' }}</b>
            <span>{{
                form.threshold === undefined ? '-' : form.threshold > 0 ? `满 ${form.threshold} 元可用` : '无门槛'
              }}</span>
          </div>
          <div class="info">
            <div class="p-row">
              <span class="p-t">{{ form.name || '-' }}</span>
              <span class="p-btn">立即领取</span>
            </div>
            <span class="p-s">领取后 {{ form.validDays ?? '-' }} 天内有效</span>
            <div class="p-row" style="margin-top: 4px">
              <span class="p-tip">剩余 {{ form.totalCount ?? '-' }} 张</span>
              <span class="p-tip">每人限领 {{ form.perLimit ?? '-' }} 张</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dlg-foot">
        <div class="dlg-tip" :class="{'is-warn': editResetWarn}">
          <el-icon>
            <WarningFilled v-if="editResetWarn"/>
            <InfoFilled v-else/>
          </el-icon>
          <span>{{ footTip }}</span>
        </div>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.tpl-body {
  display: flex;
  gap: 20px;
}

.tpl-form {
  flex: 1;
}

.form-hint {
  margin: -5px 0 12px 88px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.tpl-preview {
  width: 290px;
  flex-shrink: 0;
}

.pv-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.p-coupon {
  display: flex;
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(48, 49, 51, 0.04)
}

.amt {
  width: 74px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(160deg, #409eff, #66b1ff);
  overflow: hidden;

  b {
    font-size: 19px;
    font-weight: 600;
    line-height: 1;
    font-family: "DIN Alternate", Consolas, sans-serif;
  }

  /* 只命中门槛说明，别波及 b 里的金额 */
  > span {
    margin-top: 2px;
    font-size: 9.5px;
    opacity: 0.9;
    white-space: nowrap;
  }
}

.info {
  flex: 1 1 auto;
  min-width: 0;
  padding: 9px 10px;
}

.p-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.p-t {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.p-s {
  display: block;
  margin-top: 3px;
  font-size: 10.5px;
  line-height: 1.45;
  color: #909399;
}

.p-tip {
  font-size: 10px;
  line-height: 1.5;
  color: #909399;
}

.p-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: #409eff;
  border-radius: 13px;
}

.dlg-foot {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dlg-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-right: auto;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  text-align: left;

  .el-icon {
    flex-shrink: 0;
  }

  &.is-warn {
    color: var(--el-color-warning);
  }
}
</style>