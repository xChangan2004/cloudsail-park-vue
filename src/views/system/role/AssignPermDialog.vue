<script setup lang="ts">
import {computed, nextTick, ref, watch} from "vue";
import {ElMessage, type TreeInstance} from "element-plus";
import {type AssignRoleMenuDTO, assignRoleMenusApi, getRoleMenuIdsApi} from "@/api/role";
import {menuListApi, type MenuSimpleVO} from "@/api/menu";

defineOptions({name: 'AssignPermDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 要分配权限的角色 id
  roleId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const treeRef = ref<TreeInstance>()
const treeData = ref<MenuSimpleVO[]>([])
const loading = ref(false)

/**
 * 从树里筛出「叶子节点」的 id
 * 后端存的是 全选 + 半选父节点 的全量 id，直接整串 setCheckedKeys 会把
 * 半选的父节点当成全选、级联勾上它所有子节点（权限越勾越多），
 * 所以回显只 set 叶子，父节点的全选/半选由 el-tree 根据叶子自动推导
 */
const getLeafIds = (nodes: MenuSimpleVO[], idSet: Set<string>): string[] => {
  const leafIds: string[] = []
  nodes.forEach(node => {
    if (node.children?.length) {
      leafIds.push(...getLeafIds(node.children, idSet))
    } else if (idSet.has(node.id)) {
      leafIds.push(node.id)
    }
  })
  return leafIds
}

/** 打开：拉菜单树（缓存）+ 拉该角色已勾选，回显 */
watch(() => props.modelValue, async (open) => {
  if (!open) return
  loading.value = true
  try {
    // 菜单树基本不变，拉一次缓存；已勾选每次都要拉最新
    const [tree, checkedIds] = await Promise.all([
      treeData.value.length ? Promise.resolve(treeData.value) : menuListApi(),
      getRoleMenuIdsApi(props.roleId!)
    ])
    treeData.value = tree
    await nextTick() // 等树渲染完，节点注册后才能 set
    treeRef.value?.setCheckedKeys(getLeafIds(tree, new Set(checkedIds)))
    syncCheckState()
  } finally {
    loading.value = false
  }
})

const submitting = ref(false)
const handleSubmit = async () => {
  submitting.value = true
  try {
    const menuIds = [
      ...treeRef.value!.getCheckedKeys(),
      ...treeRef.value!.getHalfCheckedKeys()
    ] as string[]
    const payload: AssignRoleMenuDTO = {
      roleId: props.roleId!,
      menuIds: menuIds
    }
    await assignRoleMenusApi(payload)
    ElMessage.success('分配权限成功')
    visible.value = false
  } finally {
    submitting.value = false
  }
}

/** 是否已全选 */
const isAllChecked = ref(false)

/** 切换全选/取消全选 */
const toggleCheckAll = () => {
  isAllChecked.value = !isAllChecked.value
  if (isAllChecked.value) {
    // 只 set 顶层节点，子节点由级联自动全选
    treeRef.value?.setCheckedKeys(treeData.value.map(node => node.id))
  } else {
    treeRef.value?.setCheckedKeys([])
  }
}

/**
 * 手动勾选变化时同步按钮状态
 * （用户可能自己一个个勾满了，这时按钮也得显示「取消全选」）
 * 判断依据：顶层节点全部处于 checked 状态 = 全选
 */
const syncCheckState = () => {
  const checked = new Set(treeRef.value?.getCheckedKeys() ?? [])
  isAllChecked.value = treeData.value.length > 0
    && treeData.value.every(node => checked.has(node.id))
}

/** 是否全部展开（default-expand-all 初始就是全展开，所以初始 true） */
const isAllExpanded = ref(true)

/** 切换全部收起/全部展开 */
const toggleExpandAll = () => {
  if (!treeRef.value) return
  isAllExpanded.value = !isAllExpanded.value
  // 获取树内部全部节点，全部设置 expanded = false
  treeRef.value.store._getAllNodes().forEach(node => {
    node.expanded = isAllExpanded.value
  })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="分配权限"
    width="560px"
    :close-on-click-modal="true"
  >
    <div v-loading="loading" class="tree-wrap">
      <el-tree
        ref="treeRef"
        :data="treeData"
        show-checkbox
        node-key="id"
        default-expand-all
        :props="{label: 'name', children: 'children'}"
        @check="syncCheckState"
      />
    </div>
    <template #footer>
      <el-button @click="toggleExpandAll">{{ isAllExpanded ? '全部收起' : '全部展开' }}</el-button>
      <el-button @click="toggleCheckAll">{{ isAllChecked ? '取消全选' : '全部选择' }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.tree-wrap {
  max-height: 60vh;
  overflow-y: auto;
  min-height: 200px; // 数据少/loading 时不塌陷
}
</style>
