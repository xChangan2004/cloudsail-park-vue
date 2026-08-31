import type {Directive} from 'vue'
import {hasPerm} from '@/utils/permission'

/**
 * v-perm="'system:user:add'"
 * v-perm="['a', 'b']"  满足其一即可
 * 无权限时直接移除元素
 */
export const permission: Directive = {
  mounted(el: HTMLElement, binding) {
    if (!hasPerm(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  }
}
