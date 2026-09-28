<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from "vue";
import {
  addFeeRuleApi,
  editFeeRuleApi,
  type FeeRuleFormDTO,
  type FeeRuleType,
  getFeeRuleApi,
  type Tier
} from "@/api/fee";
import {ElMessage, type FormInstance, type FormRules} from "element-plus";
import type {Lot} from "@/api/lot.ts";
import {Warning} from "@element-plus/icons-vue";

defineOptions({name: 'FeeFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 有值=编辑（查详情回填），无值=新增
  id?: string | null
  // 停车场下拉数据，由父页面传入
  lotOptions: Lot[]
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

/** 计费方式卡片 */
const TYPE_META: { value: FeeRuleType, label: string, desc: string }[] = [
  {value: 1, label: '标准计费', desc: '首小时 + 后续小时'},
  {value: 2, label: '分时段计费', desc: '按时段差异化定价'},
  {value: 3, label: '阶梯计费', desc: '按时长分档定价'},
]

/** 阶梯默认给两档：一档可填 + 一档「不限时长」，让结构一眼可见 */
const defaultTiers = (): Tier[] => [
  {endMinutes: 60, rate: undefined},
  {endMinutes: null, rate: undefined},
]

const defaultForm = (): FeeRuleFormDTO => ({
  id: null,
  lotId: '',
  ruleName: '',
  ruleType: 1,
  freeMinutes: 0,
  firstHourRate: undefined,
  additionalRate: undefined,
  dailyCap: 0,
  timeSegments: [],
  tiers: [],
  status: 0
})

const formRef = ref<FormInstance>()
const form = reactive<FeeRuleFormDTO>(defaultForm())

/** 时段校验 */
const checkSegments = (): string | null => {
  const list = form.timeSegments ?? []
  if (!list.length) return '分时段计费必须配置时段费率'
  for (const seg of list) {
    if (!seg.start || !seg.end || !seg.rate == null) return '时段的起止时间和费率均不能为空'
  }
  const arr = list.map(seg => [toMin(seg.start), toMin(seg.end)]).sort((a, b) => a[0]! - b[0]!)
  for (let i = 0; i < arr.length - 1; i++) {
    const cur = arr[i]!
    const curEnd = cur[1]! <= cur[0]! ? cur[1]! + 1440 : cur[1]!
    if (curEnd > arr[i + 1]![0]!) return '时段配置存在重叠，请检查起止时间'
  }
  return null
}

/** 阶梯校验 */
const checkTiers = (): string | null => {
  const list = form.tiers ?? []
  if (!list.length) return '阶梯计费必须配置阶梯费率'
  for (const tier of list) {
    if (tier.rate == null) return '阶梯费率不能为空'
  }
  if (list[list.length - 1]!.endMinutes != null) return '最后一个阶梯的结束分钟数必须为空（表示之后不限时长）'
  let prevEnd = 0
  for (let i = 0; i < list.length - 1; i++) {
    const end = list[i]!.endMinutes
    if (end == null) return '只有最后一个阶梯的结束分钟才能为空'
    if (end <= prevEnd) return '阶梯结束分钟必须严格递增'
    prevEnd = end
  }
  return null
}

/** 只在当前类型下生效的「必填」 */
const typeRequired = () => ({
  validator: (rule: any, value: any, callback: any) => {
    if (form.ruleType !== 1) return callback()
    if (value == null || value === '') return callback(new Error('标准计费必须配置首小时以及后续小时费率'))
    callback()
  },
  trigger: 'change'
})

const rules: FormRules = {
  lotId: {required: true, message: '请选择停车场', trigger: 'change'},
  ruleName: {required: true, message: '请输入规则名称', trigger: 'blur'},
  ruleType: {required: true, message: '请选择计费方式', trigger: 'change'},
  freeMinutes: [
    {required: true, message: '请输入免费时长', trigger: 'blur'},
    {type: 'number', min: 0, message: '免费时长不能小于 0', trigger: 'change'}
  ],
  dailyCap: [
    {required: true, message: '请输入单日封顶', trigger: 'blur'},
    {type: 'number', min: 0, message: '单日封顶不能小于 0', trigger: 'change'}
  ],
  firstHourRate: typeRequired(),
  additionalRate: typeRequired(),
  timeSegments: {
    validator: (rule, value, callback) => {
      if (form.ruleType !== 2) return callback()
      const msg = checkSegments()
      msg ? callback(new Error(msg)) : callback()
    },
    trigger: 'change'
  },
  tiers: {
    validator: (rule, value, callback) => {
      if (form.ruleType !== 3) return callback()
      const msg = checkTiers()
      msg ? callback(new Error(msg)) : callback()
    },
    trigger: 'change'
  }
}

/** 时间转分钟 */
const toMin = (time?: string) => {
  const [h, m] = (time ?? '').split(':')
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

/** 阶梯展示行 */
const tierRows = computed(() => {
  const list = form.tiers ?? []
  let prev = 0
  return list.map((t, i) => {
    const row = {start: prev, last: i === list.length - 1}
    prev = t.endMinutes ?? prev
    return row
  })
})

/**
 * 时段重叠的下标集合。
 * 命中时对应行和时间轴色带都会标红。
 */
const overlapIndexes = computed(() => {
  const list = form.timeSegments ?? []
  const arr = list
    .map((seg, index) => ({index, start: toMin(seg.start), end: toMin(seg.end), ok: !!seg.start && !!seg.end}))
    .filter(item => item.ok)
    .sort((a, b) => a.start - b.start)

  const bad = new Set<number>()
  for (let i = 0; i < arr.length - 1; i++) {
    const cur = arr[i]!
    const curEnd = cur.end <= cur.start ? cur.end + 1440 : cur.end
    if (curEnd > arr[i + 1]!.start) {
      bad.add(cur.index)
      bad.add(arr[i + 1]!.index)
    }
  }
  return bad
})

const timelineBands = computed(() => {
  const pct = (minutes: number) => Math.max(0, Math.min(100, minutes / 1440) * 100)
  const bands: {
    key: string, left: number, width: number, text: string,
    free: boolean, tail: boolean, alt: boolean, bad: boolean
  }[] = [];

  (form.timeSegments ?? []).forEach((s, i) => {
    if (!s.start || !s.end) return
    const start = toMin(s.start)
    const end = toMin(s.end)
    const free = Number(s.rate) === 0
    const text = free ? '免费' : `￥ ${s.rate ?? 0}`
    const alt = i % 2 === 1
    const bad = overlapIndexes.value.has(i)

    if (start > end) {
      bands.push({
        key: `${i}-head`,
        left: pct(start),
        width: pct(1440 - start),
        text,
        free,
        tail: false,
        alt,
        bad
      })
      if (end > 0) {
        bands.push({
          key: `${i}-tail`,
          left: 0,
          width: pct(end),
          text,
          free,
          tail: true,
          alt,
          bad
        })
      }
    } else {
      bands.push({
        key: `${i}`,
        left: pct(start),
        width: pct(end - start),
        text,
        free,
        tail: false,
        alt,
        bad
      })
    }
  })
  return bands
})

const detailLoading = ref(false)
watch(() => props.modelValue, async (open) => {
  if (!open) return
  // 填充干净的默认值
  Object.assign(form, defaultForm())

  if (props.id) {
    detailLoading.value = true
    try {
      const detail = await getFeeRuleApi(props.id)
      Object.assign(form, detail)
    } finally {
      detailLoading.value = false
    }
  }

  await nextTick()
  formRef?.value?.clearValidate()
})

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef?.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await editFeeRuleApi(form)
    } else {
      await addFeeRuleApi(form)
    }
    ElMessage.success(isEdit.value ? '编辑计费规则成功' : '新增计费规则成功')
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

/** 切换计费方式：清掉原类型的费率配置，避免脏数据被写库 */
const handleTypeChange = (type: FeeRuleType) => {
  if (form.ruleType === type) return
  form.ruleType = type
  form.firstHourRate = undefined
  form.additionalRate = undefined
  form.timeSegments = type === 2 ? [{start: '08:00', end: '20:00'}] : []
  form.tiers = type === 3 ? defaultTiers() : []
  formRef?.value?.clearValidate()
}

/** 添加时段 */
const addSegment = () => {
  form.timeSegments = [...(form.timeSegments ?? []), {start: '', end: ''}]
}

/** 根据索引位置删除时段 */
const removeSegment = (index: number) => {
  if (form.timeSegments!.length === 1) return // 只有一个默认时段不允许删除
  form.timeSegments = (form.timeSegments ?? []).filter((_, i) => i !== index)
  formRef?.value?.clearValidate()
}

/** 添加阶梯档 */
const addTier = () => {
  const list = [...(form.tiers ?? [])]
  const lastEnd = list.length > 1 ? (list[list.length - 2]!.endMinutes ?? 0) : 0
  list.splice(Math.max(list.length - 1, 0), 0, {endMinutes: lastEnd + 60, rate: undefined})
  form.tiers = list
}

/** 根据索引位置删除阶梯 */
const removeTier = (index: number) => {
  const list = [...(form.tiers ?? [])]
  if (list.length === 2) return // 当只有2个时表示阶梯只有0~n和n+的，所以不允许删除
  list.splice(index, 1)
  form.tiers = list
  formRef.value?.clearValidate()
}

/** 计费口径提示：把后端算法里的隐性规则显性化 */
const algoNote = computed(() => {
  switch (form.ruleType) {
    case 1:
      return '计费时长不足 1 小时按 1 小时向上取整：首小时费率 + 超出后费率 × (小时数 - 1)。'
    case 2:
      return '按分钟比例折算，不足 1 小时不取整；免费时长从入场时刻起算并向后推移。时段需覆盖全天，留空的时间段会被后端拒绝。'
    case 3:
      return '阶梯区间基于「停车总时长扣除免费时长后」的计费时长，而非停车总时长；每档按分钟比例折算。'
    default:
      return ''
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑计费规则' : '新增计费规则'"
    width="700px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      label-width="88px"
      :model="form"
      :rules="rules"
    >
      <div class="fee-section">基础信息</div>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="停车场" prop="lotId">
            <el-select v-model="form.lotId" filterable placeholder="请选择停车场">
              <el-option
                v-for="lot in lotOptions"
                :key="lot.id"
                :label="lot.name"
                :value="lot.id!"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="规则名称" prop="ruleName">
            <el-input v-model="form.ruleName" placeholder="请输入规则名称"/>
          </el-form-item>
        </el-col>
      </el-row>
      <div class="fee-section">计费方式</div>
      <el-form-item prop="ruleType" label-width="0">
        <div class="type-cards">
          <div
            v-for="item in TYPE_META"
            :key="item.value"
            class="type-card"
            :class="{ 'is-active': form.ruleType === item.value }"
            @click="handleTypeChange(item.value)"
          >
            <span class="type-card__name">{{ item.label }}</span>
            <span class="type-card__desc">{{ item.desc }}</span>
          </div>
        </div>
      </el-form-item>
      <div class="fee-section">计费参数</div>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="免费时长" prop="freeMinutes">
            <div class="num-field">
              <el-input-number
                v-model="form.freeMinutes"
                :min="0"
                :max="1440"
                :step="5"
                controls-position="right"
              />
              <span class="num-field__unit">分钟</span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单日封顶" prop="dailyCap">
            <div class="num-field">
              <el-input-number
                v-model="form.dailyCap"
                :min="0"
                :step="10"
                :precision="2"
                controls-position="right"
                placeholder="0元表示不封顶"
              />
              <span class="num-field__unit">元 / 天</span>
            </div>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 标准 -->
      <div v-if="form.ruleType === 1">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="首小时费率" prop="firstHourRate">
              <div class="num-field">
                <el-input-number
                  v-model="form.firstHourRate"
                  :min="0"
                  :step="1"
                  :precision="2"
                  controls-position="right"
                />
                <span class="num-field__unit">元 / 小时</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="超出后费率" prop="additionalRate">
              <div class="num-field">
                <el-input-number
                  v-model="form.additionalRate"
                  :min="0"
                  :step="1"
                  :precision="2"
                  controls-position="right"
                />
                <span class="num-field__unit">元 / 小时</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 时段 -->
      <div v-if="form.ruleType === 2">
        <el-form-item prop="timeSegments" label-width="0">
          <!-- 24小时时间轴：重叠一眼可见 -->
          <div class="seg-band">
            <div class="seg-band__track">
              <div
                v-for="band in timelineBands"
                :key="band.key"
                class="seg-band__item"
                :class="{
                  'is-alt': band.alt,
                  'is-free': band.free,
                  'is-tail': band.tail,
                  'is-bad': band.bad
                }"
                :style="{ left: band.left + '%', width: band.width + '%' }"
              >
                <span v-if="band.width > 9" class="seg-band__text">{{ band.text }}</span>
              </div>
            </div>
            <div class="seg-band__axis">
              <span v-for="tick in ['00:00', '06:00', '12:00', '18:00', '24:00']" :key="tick">{{ tick }}</span>
            </div>
          </div>
          <div class="rate-list">
            <div
              v-for="(seg, index) in form.timeSegments"
              :key="index"
              class="rate-row"
            >
              <el-time-select
                v-model="seg.start"
                class="rate-row__time"
                start="00:00"
                step="01:00"
                end="23:30"
                placeholder="开始"
                @change="formRef?.validateField('timeSegments')"
              />
              <span class="rate-row__tilde">~</span>
              <el-time-select
                v-model="seg.end"
                class="rate-row__time"
                start="00:00"
                step="01:00"
                end="23:30"
                placeholder="结束"
                @change="formRef?.validateField('timeSegments')"
              />
              <span v-if="seg.start && seg.end && toMin(seg.start) > toMin(seg.end)" class="rate-row__flag">次日</span>
              <div class="num-field rate-row__rate">
                <el-input-number
                  v-model="seg.rate"
                  :min="0"
                  :step="1"
                  :precision="2"
                  controls-position="right"
                  placeholder="费率"
                />
                <span class="num-field__unit">元 / 小时</span>
              </div>
              <el-button type="danger" plain size="small" @click="removeSegment(index)">删除</el-button>
            </div>
            <el-button type="primary" plain @click="addSegment">添加时段</el-button>
          </div>
        </el-form-item>
      </div>

      <!-- 阶梯 -->
      <div v-if="form.ruleType === 3">
        <el-form-item prop="tiers" label-width="0">
          <div class="rate-list">
            <div
              v-for="(tier, index) in form.tiers"
              :key="index"
              class="rate-row"
            >
              <!-- 起点只读，由上一档的结束分钟推出 -->
              <span class="rate-row__start">{{ tierRows[index]?.start ?? 0 }}</span>

              <!-- 末档固定「不限时长」，不给输入框 -->
              <template v-if="tierRows[index]?.last">
                <span class="rate-row__end-text">分钟以上</span>
              </template>
              <template v-else>
                <span class="rate-row__tilde">~</span>
                <div class="num-field rate-row__end">
                  <el-input-number
                    v-model="tier.endMinutes"
                    :min="1"
                    :step="10"
                    controls-position="right"
                    placeholder="结束"
                  />
                  <span class="num-field__unit">分钟</span>
                </div>
              </template>
              <div class="num-field rate-row__rate">
                <el-input-number
                  v-model="tier.rate"
                  :min="0"
                  :step="1"
                  :precision="2"
                  controls-position="right"
                  placeholder="费率"
                />
                <span class="num-field__unit">元 / 小时</span>
              </div>
              <el-button
                v-if="!tierRows[index]?.last"
                type="danger"
                plain
                size="small"
                @click="removeTier(index)"
              >删除
              </el-button>
            </div>
            <el-button type="primary" plain @click="addTier">添加档位</el-button>
            <div class="rate-tip">最后一档固定为「不限时长」，区间起点由上一档自动推导，无需填写</div>
          </div>
        </el-form-item>
      </div>

      <!-- 口径提示 -->
      <div v-if="algoNote" class="param-note">
        <el-icon class="param-note__icon">
          <Warning/>
        </el-icon>
        <span class="param-note__text">{{ algoNote }}</span>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="detailLoading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.fee-section {
  position: relative;
  margin: 4px 0 14px;
  padding-left: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  color: var(--el-text-color-primary);

  &::before {
    content: '';
    position: absolute;
    top: 1px;
    bottom: 1px;
    left: 0;
    width: 3px;
    background: var(--el-color-primary);
    border-radius: 2px;
  }
}

/* 卡片 */
.type-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;

  .type-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    cursor: pointer;
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    transition: border-color .2s, background-color .2s;

    &:hover {
      border-color: var(--el-color-primary-light-5);
    }

    &.is-active {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);

      .type-card__name {
        color: var(--el-color-primary);
      }
    }

    &__name {
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    &__desc {
      font-size: 12px;
      line-height: 1.4;
      color: var(--el-text-color-secondary);
    }
  }
}

/* ---- 数字输入 + 单位后缀 ---- */
.num-field {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;

  :deep(.el-input-number) {
    flex: 1;
    min-width: 0;
  }

  &__unit {
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}

.rate-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  .rate-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;

    &__time {
      flex: 0 0 120px;
    }

    &__tilde {
      flex: 0 0 auto;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    &__start {
      flex: 0 0 46px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      text-align: right;
    }

    &__end-text {
      flex: 0 0 auto;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      white-space: nowrap;
    }

    &__end {
      flex: 0 0 130px;
    }

    &__rate {
      flex: 1 1 auto;
    }

    &__flag {
      flex: 0 0 auto;
      padding: 0 5px;
      font-size: 12px;
      line-height: 18px;
      color: var(--el-color-warning);
      background: var(--el-color-warning-light-9);
      border-radius: 3px;
    }

    &__lock {
      flex: 0 0 auto;
      padding: 0 5px;
      font-size: 12px;
      line-height: 18px;
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
      border-radius: 3px;
    }
  }

  .rate-tip {
    text-align: center;
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }
}

/* ---- 24 小时时间轴（表单版，实时反映输入） ---- */
.seg-band {
  width: 100%;
  margin-bottom: 12px;

  &__track {
    position: relative;
    height: 26px;
    overflow: hidden;
    background: var(--el-fill-color);
    border-radius: 6px;
  }

  &__item {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: var(--el-color-primary-light-7);
    color: var(--el-color-primary);

    &.is-alt {
      background-color: var(--el-color-primary-light-8);
    }

    &.is-free {
      background-color: var(--el-color-success-light-8);
      color: var(--el-color-success);
    }

    /* 跨天时段的续接段：叠白色斜纹 */
    &.is-tail {
      background-image: repeating-linear-gradient(
          135deg,
          rgba(255, 255, 255, .65) 0 3px,
          transparent 3px 7px
      );
    }

    /* 重叠：整段标红，和后端 validateNoOverlap 的报错对应 */
    &.is-bad {
      background-color: var(--el-color-danger-light-7);
      color: var(--el-color-danger);
    }
  }

  &__text {
    padding: 0 6px;
  }

  /* 刻度轴：5 个 span 绝对定位，别用 space-between */
  &__axis {
    position: relative;
    height: 16px;
    margin-top: 4px;
    font-size: 11px;
    line-height: 16px;
    color: var(--el-text-color-placeholder);

    span {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
    }

    span:nth-child(1) {
      left: 0;
      transform: none;
    }

    span:nth-child(2) {
      left: 25%;
    }

    span:nth-child(3) {
      left: 50%;
    }

    span:nth-child(4) {
      left: 75%;
    }

    span:nth-child(5) {
      left: 100%;
      transform: translateX(-100%);
    }
  }
}

/* ---- 计费口径提示 ---- */
.param-note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: var(--el-color-warning-light-9);
  border-radius: 4px;

  &__icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--el-color-warning);
  }

  &__text {
    flex: 1;
    min-width: 0;
  }
}
</style>