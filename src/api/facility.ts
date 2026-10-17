import {get, post, put, del} from '@/utils/request'

export interface ParkingFacility {
  id: string
  code: string
  name: string
  icon?: string
  sort: number
  status: 0 | 1
  createTime?: string
}

export interface FacilityFormDTO {
  id?: string | null
  code?: string
  name?: string
  icon?: string
  sort?: number
  status?: 0 | 1
}

export interface FacilityListParams {
  code?: string
  name?: string
  status?: number
}

export const listFacilityApi = (params?: FacilityListParams) => {
  return get<ParkingFacility[]>('/admin/parking/facility/list', params)
}

export const addFacilityApi = (data: FacilityFormDTO) => {
  return post<null>('/admin/parking/facility', data)
}

export const editFacilityApi = (data: FacilityFormDTO) => {
  return put<null>('/admin/parking/facility', data)
}

export const delFacilityApi = (id: string) => {
  return del<null>(`/admin/parking/facility/${id}`)
}
