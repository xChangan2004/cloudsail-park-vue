import type {PageDTO} from "@/types/api";
import {reactive, type Ref, ref} from "vue";

/**
 * 分页表格通用逻辑：数据、分页、loading、请求
 * @param fetchApi 分页请求函数
 * @param getQuery 返回最新搜索条件（每次请求前调用，翻页时条件不丢）
 */
export function usePaginationTable<T>(
  fetchApi: (params: any) => Promise<PageDTO<T>>,
  getQuery: () => object = () => ({})
) {
  const pagination = reactive({pageNo: 1, pageSize: 10, total: 0})
  const tableData = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)

  // 加载当前页（翻页/改每页条数/刷新）
  const load = async () => {
    loading.value = true
    try {
      const page = await fetchApi({
        ...getQuery(),
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize
      })
      tableData.value = page.list
      pagination.total = Number(page.total) || 0
    } finally {
      loading.value = false
    }
  }

  // 查询，回到第一页
  const search = async () => {
    pagination.pageNo = 1
    await load()
  }

  return {
    pagination,
    tableData,
    loading,
    load,
    search
  }
}