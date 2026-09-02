import axios from 'axios'
import type {AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError} from 'axios'
import {ElMessage} from "element-plus";
import {useUserStore} from '@/stores'
import type {Result} from '@/types/api'

// 后端约定 code === 200 才算成功
const SUCCESS_CODE = 200

const service = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const userStore = useUserStore()
  if (userStore.token) {
    // 添加token到请求头
    config.headers.Authorization = userStore.token
  }
  return config
})

// 响应拦截器
service.interceptors.response.use((response: AxiosResponse) => {
  const res = response.data
  // 二进制文件流（导出excel等）直接放行
  if (response.config.responseType === 'blob') {
    return response
  }

  if (res.code !== SUCCESS_CODE) {
    ElMessage.error(res.msg || '请求失败')
    // 401：token失效，返回登录页
    if (res.code === 401) {
      handleUnauthorized()
    }
    return Promise.reject(new Error(res.msg || 'Error'))
  }

  return res.data
}, (error: AxiosError) => {
  // HTTP层错误（4xx/5xx/断网/超时）
  const status = error.response?.status
  if (status === 401) {
    handleUnauthorized()
  } else {
    ElMessage.error(error.response?.data ? (error.response.data as Result<any>).msg : httpErrorMessage(status))
  }
  return Promise.reject(error)
})

/**
 * http状态码文本映射
 */
const httpErrorMessage = (status?: number): string => {
  const map: Record<number, string> = {
    400: '请求参数错误',
    403: '没有权限',
    404: '接口不存在',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务不可用'
  }
  return status ? (map[status] || `请求失败(${status})`) : '网络异常，请检查网络连接'
}

let reLoggingIn = false // 防止并发401弹多个提示
const handleUnauthorized = () => {
  if (reLoggingIn) return
  reLoggingIn = true
  useUserStore().resetState()
  ElMessage.warning('登录已过期，请重新登录')
  // 动态 import 避免 router ↔ request 循环引用
  import('@/router').then(({default: router}) => {
    router.push('/login').catch(() => {
      // 跳转异常也要重置锁，防止锁死
      reLoggingIn = false
    })
    reLoggingIn = false
  }).catch(() => {
    reLoggingIn = false
  })
}

// 泛型请求方法
export const get = <T>(url: string, params?: object) => {
  return service.get<never, T>(url, {params})
}

export const post = <T>(url: string, data?: object) => {
  return service.post<never, T>(url, data)
}

export function put<T>(url: string, data?: object) {
  return service.put<never, T>(url, data)
}

export function del<T>(url: string) {
  return service.delete<never, T>(url)
}

export default service