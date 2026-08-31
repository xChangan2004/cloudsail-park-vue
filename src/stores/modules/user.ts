import {defineStore} from 'pinia'

interface UserState {
  token: string
  name: string
  nickname: string
  avatar: string
  permList: string[]
  roleList: string[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: '',
    name: 'admin',
    nickname: '哈哈',
    avatar: 'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg',
    permList: [],
    roleList: []
  }),
  getters: {
    // 超管直接全通过
    isSuperAdmin(): boolean {
      return this.roleList.includes('super_admin')
    }
  },
  actions: {
    logout() {
      this.token = ''
      this.name = ''
      this.nickname = ''
      this.avatar = ''
      this.permList = []
      this.roleList = []
    }
  }
})