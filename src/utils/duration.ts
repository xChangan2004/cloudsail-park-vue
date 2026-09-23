/**
 * 停车时长格式化（入参单位：分钟）
 *
 * 超过 24 小时出现「天」，为 0 的单位省略，但最大的那一级永远保留：
 *   155 → 2 小时 35 分钟 ｜ 1440 → 1 天 ｜ 1505 → 1 天 1 小时 5 分钟
 */
export const formatDuration = (minutes?: number | string | null): string => {
  if (minutes == null || minutes === '') {
    return '--'
  }
  const raw = Number(minutes)
  if (!Number.isFinite(raw)) {
    // 脏数据不猜，原样显示，方便排查
    return String(minutes)
  }
  // 0、负数、不足 1 分钟都归这里
  if (raw < 1) {
    return '不足 1 分钟'
  }
  // 先取整再拆单位，避免出现「5.5 分钟」
  const total = Math.floor(raw)

  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const mins = total % 60

  if (days > 0) {
    const parts = [`${days} 天`]
    if (hours > 0) {
      parts.push(`${hours} 小时`)
    }
    if (mins > 0) {
      parts.push(`${mins} 分钟`)
    }
    return parts.join(' ')
  }

  if (hours > 0) {
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`
  }

  return `${mins} 分钟`
}
