<script setup lang="ts">
import {type ParkingOrderPageVO, refundOrderApi} from "@/api/order.ts";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";

defineOptions({name: 'RefundFormDialog'})

const props = defineProps<{
  modelValue: boolean
  order?: ParkingOrderPageVO | null
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
const form = reactive({
  reason: ''
})

const REASON_PRESETS = [
  '出口收费有误',
  '重复扣费',
  '车辆未实际出场',
  '客户投诉协商退款',
  '系统故障导致误扣'
]

const rules: FormRules = {
  reason: [
    {required: true, message: '请输入退款原因', trigger: 'blur'},
    {max: 255, message: '退款原因不能超过255个字', trigger: 'blur'},
  ]
}

const applyReason = (text: string) => {
  form.reason = text
  formRef.value?.clearValidate('reason')
}

watch(() => props.modelValue, async (open) => {
  if (!open) return
  form.reason = ''
  await nextTick()
  formRef?.value?.clearValidate()
})

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef?.value?.validate()
  if (!props.order?.orderNo) return
  submitting.value = true
  try {
    await refundOrderApi({orderNo: props.order.orderNo, reason: form.reason})
    ElMessage.success('订单退款成功')
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
    title="订单退款"
    width="520px"
    :close-on-click-modal="false"
  >
    <div class="refund-amount">
      <div class="refund-amount__label">退款金额（全部）</div>
      <div class="refund-amount__value">￥ {{ order?.paid?.toFixed(2) }}</div>
      <div class="refund-amount__hint">原路返回客户支付账户，到账时间以支付宝为准</div>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="订单号">
        <span class="refund-mono">{{ order?.orderNo ?? '--' }}</span>
      </el-form-item>
      <el-form-item label="车牌号码">
        <span class="refund-mono">{{ order?.plateNumber ?? '--' }}</span>
      </el-form-item>
      <el-form-item label="应付金额">
        <span>￥ {{ order?.amount }}</span>
        <span v-if="Number(order?.discount ?? 0) > 0" class="refund-muted">
          (已优惠 ￥{{ order?.discount?.toFixed(2) }}, 不随退款返还)
        </span>
      </el-form-item>
      <el-form-item label="退款原因" prop="reason">
        <div class="reason-field">
          <div class="reason-presets">
            <el-tag
              v-for="item in REASON_PRESETS"
              :key="item"
              class="reason-tag"
              :effect="form.reason === item ? 'dark' : 'plain'"
              @click="applyReason(item)"
            >{{ item }}
            </el-tag>
          </div>
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            placeholder="可直接点上方标签，或自行填写退款原因"
          />
        </div>
      </el-form-item>
    </el-form>
    <div class="refund-tips">
      退款成功后订单状态变为「已退款」，操作不可撤销。
      若提示「退款结果未知」，说明请求已发出但未拿到支付宝回执，可直接重试 —— 退款单号幂等，不会重复退两次。
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="danger" :loading="submitting" @click="handleSubmit">确认退款</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.refund-amount {
  padding: 14px;
  margin-bottom: 16px;
  text-align: center;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;

  &__label {
    font-size: 12px;
    color: #c45656;
  }

  &__value {
    margin-top: 2px;
    font-size: 26px;
    font-weight: 600;
    line-height: 1.3;
    color: #303133;
  }

  &__hint {
    margin-top: 4px;
    font-size: 12px;
    color: #f56c6c;
  }
}

.reason-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.reason-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reason-tag {
  cursor: pointer;
  user-select: none;
}

.refund-tips {
  padding-top: 12px;
  border-top: 1px dashed #ebeef5;
  font-size: 12px;
  line-height: 1.7;
  color: #909399;
}

.refund-mono {
  font-family: ui-monospace, Menlo, Consolas, monospace;
}

.refund-muted {
  margin-left: 4px;
  font-size: 12px;
  color: #909399;
}
</style>