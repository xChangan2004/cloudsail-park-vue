<script setup lang="ts">
import {InfoFilled} from '@element-plus/icons-vue'
import type {ExitBillVO} from '@/api/record'
import {formatDuration} from '@/utils/duration'

/**
 * 出场结算账单
 */
defineProps<{
  bill?: ExitBillVO
}>()

/**
 * 金额格式化：两位小数 + 千分位。
 * 无值时返回 '--' 而不是 0
 */
const money = (v?: number) => {
  if (v == null || Number.isNaN(Number(v))) {
    return '--'
  }
  return Number(v).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
</script>

<template>
  <div class="detail-wrap">
    <!-- 金额区：刻意用警示色，强调这是「应收」而非「已收」 -->
    <div class="bill-amount">
      <div class="bill-amount__label">应收金额</div>
      <div class="bill-amount__value">¥ {{ money(bill?.amount) }}</div>
      <div class="bill-amount__hint">订单已生成，状态为待支付 — 尚未收到款项</div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">
        <el-icon color="#409eff" style="margin-right: 5px">
          <InfoFilled/>
        </el-icon>
        停车信息
      </div>
      <el-row class="detail-row">
        <div class="detail-item">
          <div class="detail-label">车牌号码</div>
          <div class="detail-value">{{ bill?.plateNumber ?? '--' }}</div>
        </div>
      </el-row>
      <el-row class="detail-row">
        <div class="detail-item">
          <div class="detail-label">入场时间</div>
          <div class="detail-value">{{ bill?.entryTime ?? '--' }}</div>
        </div>
      </el-row>
      <el-row class="detail-row">
        <div class="detail-item">
          <div class="detail-label">出场时间</div>
          <div class="detail-value">{{ bill?.exitTime ?? '--' }}</div>
        </div>
      </el-row>
      <el-row class="detail-row">
        <div class="detail-item">
          <div class="detail-label">停车时长</div>
          <div class="detail-value">{{ formatDuration(bill?.duration) }}</div>
        </div>
      </el-row>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">
        <el-icon color="#409eff" style="margin-right: 5px">
          <InfoFilled/>
        </el-icon>
        计费依据
      </div>
      <el-row class="detail-row">
        <div class="detail-item">
          <div class="detail-label">计费规则</div>
          <div class="detail-value">{{ bill?.ruleName ?? '--' }}</div>
        </div>
      </el-row>
      <el-row class="detail-row">
        <div class="detail-item">
          <div class="detail-label">计费说明</div>
          <div class="detail-value">{{ bill?.ruleDesc ?? '--' }}</div>
        </div>
      </el-row>
      <el-row class="detail-row">
        <div class="detail-item">
          <div class="detail-label">订单号</div>
          <div class="detail-value bill-order-no">{{ bill?.orderNo ?? '--' }}</div>
        </div>
      </el-row>
    </div>
  </div>
</template>

<style scoped lang="scss">
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

/* ---------- 金额区：全页唯一需要抢视觉重心的部分 ---------- */
.bill-amount {
  padding: 18px 16px;
  text-align: center;
  background-color: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;

  &__label {
    font-size: 12px;
    color: #b88230;
  }

  &__value {
    margin-top: 4px;
    font-size: 30px;
    font-weight: 600;
    line-height: 1.2;
    color: #303133;
  }

  &__hint {
    margin-top: 8px;
    font-size: 12px;
    color: #e6a23c;
  }
}

/* 订单号是 22 位长串，等宽字体 + 单击全选，方便手动复制兜底 */
.bill-order-no {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  user-select: all;
}
</style>
