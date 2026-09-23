import {ElMessage} from 'element-plus'

/**
 * 复制文本到剪贴板，带成功/失败提示。
 *
 * 注意：navigator.clipboard 只在安全上下文（https 或 localhost）可用，
 * 内网用 IP + http 访问时会直接抛错，所以必须保留失败兜底提示，
 * 不能静默吞掉 —— 否则用户以为复制成功了，实际粘出来是旧内容。
 *
 * @returns 是否复制成功，调用方需要时可用于后续逻辑
 */
export const copyText = async (text?: string) => {
  if (!text) {
    ElMessage.warning('暂无可复制的内容')
    return false
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('复制成功')
    return true
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
    return false
  }
}
