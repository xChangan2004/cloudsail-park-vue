import {post} from '@/utils/request'

export interface FileVO {
  id: string
  url: string
  name: string
  size: string
  contentType: string
}

/**
 * 上传单个文件
 */
export const uploadFileApi = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return post<FileVO>('/admin/file/upload', fd)
}