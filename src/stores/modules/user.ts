import {defineStore} from 'pinia'
import {loginApi, type LoginFormDTO, type LoginResult, logoutApi} from "@/api/user";

interface UserState {
  token: string
  username: string
  nickname?: string
  avatar?: string
  permList: string[]
  roleList: string[]
  menus: LoginResult['menus']
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: '',
    username: '',
    nickname: '',
    avatar: '',
    permList: [],
    roleList: [],
    menus: []
  }),
  getters: {
    // 超管直接全通过
    isSuperAdmin(): boolean {
      return this.roleList.includes('super_admin')
    }
  },
  actions: {
    async login(data: LoginFormDTO) {
      const res = await loginApi(data)

      this.token = res.token
      this.username = res.userInfo.username ?? ''
      this.nickname = res.userInfo.nickname ?? ''
      this.avatar = res.userInfo.avatar ?? ''
      this.permList = res.permList ?? []
      this.roleList = res.roleList ?? []
      this.menus = res.menus ?? []

      return res
    },
    async logout() {
      try {
        await logoutApi()
      } finally {
        this.resetState()
      }
    },
    resetState() {
      this.$reset()
    }
  },
  // 配置持久化
  persist: true
})