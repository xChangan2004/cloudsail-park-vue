import {onActivated, onBeforeUnmount, onDeactivated, onMounted, ref} from 'vue'

/** 默认轮询间隔：60 秒 */
const DEFAULT_INTERVAL = 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 看板轮询：定时刷新 + 页面可见性感知 + keep-alive 感知
 *
 * 为什么是 60s 而不是 5s：
 * 后端 DashboardServiceImpl.queryWithCache 给每个看板接口都套了 45~60 秒随机 TTL 的 Redis 缓存，
 * 数据新鲜度上限本来就是约 1 分钟。60s 轮询几乎必然命中缓存 ——
 * 「看着在实时刷新，实际一次都不打数据库」。间隔调小只会增加回源次数，不会让数据更新。
 *
 * @param task     实际拉数据的方法（内部自行做并发聚合）
 * @param interval 轮询间隔，单位毫秒
 */
export function useDashboardPolling(task: () => Promise<void>, interval = DEFAULT_INTERVAL) {
  /** 首次加载 / 手动刷新：页面可以显示遮罩 */
  const loading = ref(false)
  /** 静默轮询中：只在工具栏显示一个转圈，不打断浏览 */
  const refreshing = ref(false)
  /** 最近一次成功刷新的时刻，格式 HH:mm:ss */
  const updatedAt = ref('')

  let timer: ReturnType<typeof setInterval> | null = null
  // 防重入：上一次还没回来就跳过本次，避免慢接口把请求堆起来
  let pending = false
  // 区分「首次激活」和「从别的页面切回来」，首次激活不重复请求
  let activatedOnce = false

  const run = async (silent: boolean) => {
    if (pending) return
    pending = true
    if (silent) {
      refreshing.value = true
    } else {
      loading.value = true
    }
    try {
      await task()
      const now = new Date()
      updatedAt.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    } finally {
      pending = false
      loading.value = false
      refreshing.value = false
    }
  }

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  const start = () => {
    stop()
    timer = setInterval(() => void run(true), interval)
  }

  /** 手动刷新 / 切换停车场：走显式 loading，并重置计时器，避免刚刷完立刻又轮一次 */
  const refresh = async () => {
    await run(false)
    if (!document.hidden) start()
  }

  // 页面切到后台就停表，切回前台立刻补一次再恢复计时
  const handleVisibility = () => {
    if (document.hidden) {
      stop()
    } else {
      void run(true)
      start()
    }
  }

  onMounted(() => {
    void run(false)
    start()
    document.addEventListener('visibilitychange', handleVisibility)
  })

  // 本页可能被 keep-alive 缓存（tagsView 的 cachedViews），
  // 切走时 onBeforeUnmount 不会触发，必须靠 onDeactivated 停表，否则会在后台一直轮询
  onActivated(() => {
    if (activatedOnce) {
      void run(true)
      start()
    }
    activatedOnce = true
  })

  onDeactivated(stop)

  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', handleVisibility)
  })

  return {loading, refreshing, updatedAt, refresh}
}
