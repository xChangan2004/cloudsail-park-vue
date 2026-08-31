import {defineStore} from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    name: 'admin',
    nickname: '哈哈',
    avatar: 'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg',
  }),
  actions: {
    logout() {
      this.token = ''
      this.name = ''
      this.nickname = ''
      this.avatar = ''
    }
  }
})