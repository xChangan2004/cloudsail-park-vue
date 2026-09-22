<script setup lang="ts">
import SearchPanel from "@/components/SearchPanel/index.vue";
import {computed, onMounted, reactive, ref} from "vue";
import {delFeeRuleApi, type FeeRule, type FeeRuleType, pageFeeRuleApi, updateFeeRuleStatusApi} from "@/api/fee";
import {usePaginationTable} from "@/hooks/usePaginationTable";
import TablePanel from "@/components/TablePanel/index.vue";
import TableTools from "@/components/TableTools/index.vue";
import {ElMessage, ElMessageBox} from "element-plus";
import {pageParkingLotApi, type ParkingLot} from "@/api/parkingLot";
import {InfoFilled, Warning} from "@element-plus/icons-vue";
import FeeFormDialog from "@/views/fee/FeeFormDialog.vue";

defineOptions({name: 'Fee'})

/** 停车场下拉选项 */
const lotOptions = ref<ParkingLot[]>([])
const loadLotOptions = async () => {
  try {
    const page = await pageParkingLotApi({pageNo: 1, pageSize: 200})
    lotOptions.value = page.list
  } catch {
    ElMessage.error('停车场下拉数据加载失败')
  }
}

/** 停车场名称Map */
const lotNameMap = computed(() => {
  const map = new Map<string, string>()
  lotOptions.value.forEach(lot => map.set(lot.id!, lot.name))
  return map
})

const query = reactive({
  lotId: '',
  ruleName: '',
  ruleType: undefined as FeeRuleType | undefined,
  status: undefined as number | undefined,
})

const {pagination, tableData, loading, load, search} = usePaginationTable<FeeRule>(
  pageFeeRuleApi,
  () => ({...query})
)

const handleReset = () => {
  query.lotId = ''
  query.ruleName = ''
  query.ruleType = undefined
  query.status = undefined
  search()
}

/** 表格密度 */
const tableSize = ref<'small' | 'default' | 'large'>('default')

/** 列显示配置 */
const columnSettings = reactive([
  {prop: 'lotId', label: '所属停车场', visible: true},
  {prop: 'ruleName', label: '规则名称', visible: true},
  {prop: 'ruleType', label: '规则类型', visible: true},
  {prop: 'status', label: '状态', visible: true},
  {prop: 'createTime', label: '创建时间', visible: true},
])

const isColVisible = (prop: string) => columnSettings.find(c => c.prop === prop)?.visible ?? true

/** 类型展示映射 */
const typeMap: Record<FeeRuleType, { label: string, type: 'primary' | 'success' | 'danger' }> = {
  1: {label: '标准', type: 'primary'},
  2: {label: '时段', type: 'success'},
  3: {label: '阶梯', type: 'danger'},
}

onMounted(() => {
  loadLotOptions()
  load()
})

const handleStatusBeforeChange = async (row: FeeRule) => {
  const next = row.status === 1 ? 0 : 1
  await updateFeeRuleStatusApi(row.id!, next)
  row.status = next
  ElMessage.success('切换状态成功')
  return true
}

const viewDialog = ref(false)
const rowData = ref<FeeRule>()

const handleView = (row: FeeRule) => {
  viewDialog.value = true
  rowData.value = row
}

/* ==================== 计费详情 · 计费参数 ==================== */

const DAY_MINUTES = 1440

/** 「HH:mm」→ 当天分钟数 */
const toMin = (time?: string) => {
  const [h, m] = (time ?? '').split(':')
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

/** 金额格式化：空值统一 '-' */
const fmtMoney = (value?: number | null) => (value == null ? '-' : Number(value).toFixed(2))

/** 单日封顶是否有效（口径与后端 hasDailyCap 一致：> 0 才算配置） */
const hasDailyCap = computed(() => {
  const v = rowData.value?.dailyCap
  return v != null && Number(v) > 0
})

/** 免费时长文案 */
const freeMinutesText = computed(() => {
  const v = rowData.value?.freeMinutes
  return v == null ? '-' : `${v} 分钟`
})

/** 计费口径提示：把后端算法里的隐性规则显性化 */
const algoNote = computed(() => {
  switch (rowData.value?.ruleType) {
    case 1:
      return '计费时长不足 1 小时按 1 小时向上取整：首小时费率 + 超出后费率 × (小时数 - 1)，小时数含首小时。'
    case 2:
      return '按分钟比例折算，不足 1 小时不取整；免费时长从入场时刻起算，费率为 0 的时段不收费。'
    case 3:
      return '阶梯区间基于「停车总时长扣除免费时长后」的计费时长，而非停车总时长；每档按分钟比例折算。'
    default:
      return ''
  }
})

/** 封顶口径提示（三类通用） */
const capNote = computed(() =>
  hasDailyCap.value ? '封顶金额按连续停车天数累计，不满 1 天按 1 天计算。' : ''
)

/** 时段规则的展示行（跨天时段标注「次日」） */
const segmentRows = computed(() => {
  const list = [...(rowData.value?.timeSegments ?? [])]
  list.sort((a, b) => toMin(a.start) - toMin(b.start))
  return list.map((seg, index) => ({
    key: `${seg.start}-${seg.end}-${index}`,
    label: toMin(seg.start) > toMin(seg.end)
      ? `${seg.start} ~ 次日 ${seg.end}`
      : `${seg.start} ~ ${seg.end}`,
    rate: seg.rate,
    free: Number(seg.rate) === 0,
  }))
})

/** 阶梯规则的展示行：把 endMinutes 换算成「起点 ~ 终点 分钟」 */
const tierRows = computed(() => {
  const list = [...(rowData.value?.tiers ?? [])].sort(
    (a, b) => (a.endMinutes ?? Number.MAX_SAFE_INTEGER) - (b.endMinutes ?? Number.MAX_SAFE_INTEGER)
  )
  return list.map((tier, index) => {
    const start = index === 0 ? 0 : (list[index - 1]!.endMinutes ?? 0)
    const end = tier.endMinutes
    return {
      key: `${start}-${end ?? 'inf'}`,
      label: end == null ? `${start} 分钟以上` : `${start} ~ ${end} 分钟`,
      rate: tier.rate,
      free: Number(tier.rate) === 0,
    }
  })
})

/** 24 小时时间轴色带：跨天时段拆成 [start,24:00) 与 [00:00,end) 两段 */
const timelineBands = computed(() => {
  const pct = (minutes: number) => Math.max(0, Math.min(100, (minutes / DAY_MINUTES) * 100))
  const bands: {
      key: string,
      left: number,
      width: number,
      text: string,
      free: boolean,
      tail: boolean,
      alt: boolean
    }[] = []
  ;(rowData.value?.timeSegments ?? []).forEach((seg, index) => {
    const start = toMin(seg.start)
    const end = toMin(seg.end)
    const free = Number(seg.rate) === 0
    const text = free ? '免费' : `¥ ${fmtMoney(seg.rate)}`
    const alt = index % 2 === 1
    if (start > end) {
      bands.push({
        key: `${index}-head`,
        left: pct(start),
        width: pct(DAY_MINUTES - start),
        text,
        free,
        tail: false,
        alt
      })
      if (end > 0) {
        bands.push({key: `${index}-tail`, left: 0, width: pct(end), text, free, tail: true, alt})
      }
    } else {
      bands.push({key: `${index}`, left: pct(start), width: pct(end - start), text, free, tail: false, alt})
    }
  })
  return bands
})

/**
 * 参数网格的列数。
 * 总格数 = 免费时长 + 费率格 + 单日封顶。
 * 4 格以内就一行铺满；更多则取一半宽度分两行，避免末格孤零零占一小格（如阶梯 3 档 = 5 格 ⇒ 3 + 2）。
 */
const gridColumns = computed(() => {
  const rateCount = rowData.value?.ruleType === 1
    ? 2
    : rowData.value?.ruleType === 2
      ? segmentRows.value.length
      : tierRows.value.length
  const total = 2 + rateCount
  return total <= 4 ? Math.max(total, 1) : Math.min(4, Math.ceil(total / 2))
})

const handleDelete = async (row: FeeRule) => {
  if (!row.id) return
  try {
    await ElMessageBox.confirm(`确认要删除规则 [${row.ruleName}] 吗？删除后无法恢复`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }
  await delFeeRuleApi(row.id)
  ElMessage.success('删除成功')
  await load()
}

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const handleAdd = () => {
  dialogVisible.value = true
  editingId.value = null
}

const handleEdit = (id: string) => {
  dialogVisible.value = true
  editingId.value = id
}
</script>

<template>
  <div class="fee-page">
    <SearchPanel :collapsed-count="3" @search="search" @reset="handleReset">
      <el-form-item label="停车场">
        <el-select
          v-model="query.lotId"
          filterable
          placeholder="请选择停车场"
          clearable
          style="width: 240px"
        >
          <el-option
            v-for="lot in lotOptions"
            :key="lot.id"
            :label="lot.name"
            :value="lot.id!"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="query.ruleName" placeholder="请输入规则名称（模糊查询）" clearable style="width: 240px"/>
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="query.ruleType" placeholder="请选择规则类型" clearable style="width: 240px">
          <el-option v-for="(v, k) in typeMap" :key="k" :label="v.label" :value="k"/>
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="请选择状态" clearable style="width: 240px">
          <el-option label="启用" :value="1"/>
          <el-option label="停用" :value="0"/>
        </el-select>
      </el-form-item>
    </SearchPanel>

    <TablePanel :pagination="pagination" @page-change="load">
      <template #toolbar-left>
        <el-button type="primary" plain @click="handleAdd">新增</el-button>
      </template>
      <template #toolbar-right>
        <TableTools v-model:size="tableSize" :columns="columnSettings" @refresh="load"/>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        :size="tableSize"
        height="100%"
        row-key="id"
        stripe
      >
        <el-table-column label="序号" type="index" width="80" align="center"/>
        <el-table-column v-if="isColVisible('lotId')" label="所属停车场" prop="lotId" align="center">
          <template #default="{row}">
            <span>{{ lotNameMap.get(row.lotId) || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('ruleName')" label="规则名称" prop="ruleName" align="center"/>
        <el-table-column v-if="isColVisible('ruleType')" label="规则类型" prop="ruleType" align="center">
          <template #default="{row}">
            <el-tag :type="typeMap[row.ruleType as FeeRuleType].type ?? 'info'" effect="plain">
              {{ typeMap[row.ruleType as FeeRuleType].label ?? '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('status')" label="状态" prop="status" align="center">
          <template #default="{row}">
            <el-switch
              :model-value="row.status"
              :active-value="1"
              :inactive-value="0"
              :before-change="() => handleStatusBeforeChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column v-if="isColVisible('createTime')" label="创建时间" prop="createTime" align="center"/>
        <el-table-column label="操作" fixed="right" width="180">
          <template #default="{row}">
            <el-button type="primary" icon="view" size="small" @click="handleView(row)"/>
            <el-button type="warning" icon="edit" size="small" @click="handleEdit(row.id)"/>
            <el-button type="danger" icon="delete" size="small" @click="handleDelete(row)"/>
          </template>
        </el-table-column>
      </el-table>
    </TablePanel>
    <el-dialog
      v-model="viewDialog"
      title="计费详情"
      width="680"
    >
      <div class="detail-wrap">
        <div class="detail-card">
          <div class="detail-card-title">
            <el-icon color="#409eff" style="margin-right: 5px">
              <InfoFilled/>
            </el-icon>
            规则概览
          </div>
          <el-row class="detail-row">
            <div class="detail-item">
              <div class="detail-label">规则名称</div>
              <div class="detail-value">{{ rowData?.ruleName }}</div>
            </div>
          </el-row>
          <el-row class="detail-row">
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">所属停车场</div>
                <div class="detail-value">{{ lotNameMap.get(rowData?.lotId!) }}</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <div class="detail-label">创建时间</div>
                <div class="detail-value">{{ rowData?.createTime }}</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="detail-card">
          <div class="detail-card-title">
            <el-icon color="#409eff" style="margin-right: 5px">
              <InfoFilled/>
            </el-icon>
            计费参数
          </div>

          <div class="param-body">
            <!-- 时段类型：24 小时时间轴，需要全宽，放在网格外 -->
            <div v-if="rowData?.ruleType === 2 && timelineBands.length" class="seg-band">
              <div class="seg-band__track">
                <div
                  v-for="band in timelineBands"
                  :key="band.key"
                  class="seg-band__item"
                  :class="{'is-alt': band.alt, 'is-free': band.free, 'is-tail': band.tail}"
                  :style="{left: band.left + '%', width: band.width + '%'}"
                >
                  <span v-if="band.width > 9" class="seg-band__text">{{ band.text }}</span>
                </div>
              </div>
              <div class="seg-band__axis">
                <span v-for="tick in ['00:00', '06:00', '12:00', '18:00', '24:00']" :key="tick">{{ tick }}</span>
              </div>
            </div>

            <div class="fee-grid" :style="{'--fee-cols': gridColumns}">
              <!-- 通用项：免费时长 -->
              <div class="fee-cell">
                <span class="fee-cell__label">免费时长</span>
                <span class="fee-cell__value">{{ freeMinutesText }}</span>
              </div>

              <!-- 费率块：按 ruleType 三选一 -->
              <template v-if="rowData?.ruleType === 1">
                <div class="fee-cell">
                  <span class="fee-cell__label">首小时费率</span>
                  <span class="fee-cell__value">
                    <em class="fee-cell__cny">¥</em>{{ fmtMoney(rowData?.firstHourRate) }}
                    <i class="fee-cell__unit">/ 小时</i>
                  </span>
                </div>
                <div class="fee-cell">
                  <span class="fee-cell__label">超出后费率</span>
                  <span class="fee-cell__value">
                    <em class="fee-cell__cny">¥</em>{{ fmtMoney(rowData?.additionalRate) }}
                    <i class="fee-cell__unit">/ 小时</i>
                  </span>
                </div>
              </template>

              <template v-else-if="rowData?.ruleType === 2">
                <div v-for="seg in segmentRows" :key="seg.key" class="fee-cell">
                  <span class="fee-cell__label">{{ seg.label }}</span>
                  <span class="fee-cell__value">
                    <span v-if="seg.free" class="fee-cell__tag">免费</span>
                    <template v-else>
                      <em class="fee-cell__cny">¥</em>{{ fmtMoney(seg.rate) }}
                      <i class="fee-cell__unit">/ 小时</i>
                    </template>
                  </span>
                </div>
                <div v-if="!segmentRows.length" class="fee-cell is-empty">未配置时段费率</div>
              </template>

              <template v-else-if="rowData?.ruleType === 3">
                <div v-for="tier in tierRows" :key="tier.key" class="fee-cell">
                  <span class="fee-cell__label">{{ tier.label }}</span>
                  <span class="fee-cell__value">
                    <span v-if="tier.free" class="fee-cell__tag">免费</span>
                    <template v-else>
                      <em class="fee-cell__cny">¥</em>{{ fmtMoney(tier.rate) }}
                      <i class="fee-cell__unit">/ 小时</i>
                    </template>
                  </span>
                </div>
                <div v-if="!tierRows.length" class="fee-cell is-empty">未配置阶梯费率</div>
              </template>

              <!-- 通用项：单日封顶 -->
              <div class="fee-cell">
                <span class="fee-cell__label">单日封顶</span>
                <span class="fee-cell__value">
                  <template v-if="hasDailyCap">
                    <em class="fee-cell__cny">¥</em>{{ fmtMoney(rowData?.dailyCap) }}
                    <i class="fee-cell__unit">/ 天</i>
                  </template>
                  <template v-else>-</template>
                </span>
              </div>
            </div>

            <!-- 计费口径提示：把后端算法里的隐性规则显性化 -->
            <div v-if="algoNote || capNote" class="param-note">
              <el-icon class="param-note__icon">
                <Warning/>
              </el-icon>
              <span class="param-note__text">
                {{ algoNote }}<template v-if="capNote">{{ capNote }}</template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
    <FeeFormDialog v-model="dialogVisible" :id="editingId" :lot-options="lotOptions" @success="load"/>
  </div>
</template>

<style scoped lang="scss">
.fee-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.detail-wrap {
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  .detail-card {
    border: 1px solid #ebeef5;
    border-radius: 6px;

    .detail-card-title {
      display: flex;
      align-items: center;
      background-color: #f7f9fb;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #333;
      border-bottom: 1px solid #ebeef5;
    }

    .detail-row {
      padding: 0 8px;

      .detail-item {
        display: flex;
        align-items: center;
        padding: 10px 8px;
        font-size: 13px;

        .detail-label {
          flex-shrink: 0;
          width: 72px;
          color: #909399;
          margin-right: 12px;
        }

        .detail-value {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #303133;
          flex: 1;
          word-break: break-all;
        }
      }
    }
  }
}

/* ==================== 计费参数区块 ==================== */

.param-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
}

/* ---- 参数网格：免费时长固定在首格，封顶固定在末格，中间由 v-if 决定格数 ---- */
.fee-grid {
  display: grid;
  /* 列数由脚本按实际格数算好（--fee-cols），保证每行排满、不留孤格 */
  grid-template-columns: repeat(var(--fee-cols, 4), minmax(0, 1fr));
  gap: 10px;
}

.fee-cell {
  min-width: 0;
  padding: 9px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;

  &__label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__value {
    display: block;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__cny {
    margin-right: 1px;
    font-size: 12px;
    font-style: normal;
    font-weight: 500;
    color: var(--el-color-primary);
  }

  &__unit {
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  &__tag {
    display: inline-block;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 500;
    line-height: 18px;
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    border-radius: 3px;
  }

  /* 未配置时的占位：独占一整行 */
  &.is-empty {
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

/* ---- 时段规则的 24 小时时间轴 ---- */
.seg-band {
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

    /* 相邻时段交替深浅，避免连成一片看不出分界 */
    &.is-alt {
      background-color: var(--el-color-primary-light-8);
    }

    /* 费率为 0 的时段走绿色 */
    &.is-free {
      background-color: var(--el-color-success-light-8);
      color: var(--el-color-success);
    }

    /* 跨天时段的续接段（00:00 ~ end）：叠一层斜纹，表示它接的是右边那段 */
    &.is-tail {
      background-image: repeating-linear-gradient(
          135deg,
          rgba(255, 255, 255, .65) 0 3px,
          transparent 3px 7px
      );
    }
  }

  &__text {
    padding: 0 6px;
  }

  /*
   * 刻度轴：5 个刻度按 0 / 25% / 50% / 75% / 100% 定位，对准色带。
   * 刻度数量需与模板里那份固定列表保持一致。
   */
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