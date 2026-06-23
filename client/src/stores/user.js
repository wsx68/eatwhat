import { defineStore } from 'pinia'
import { post, get } from '../utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    profile: null,
    isLogin: false
  }),
  actions: {
    async login(code) {
      try {
        const data = await post('/user/login', { code: code || 'dev_user' })
        this.token = data.token
        this.profile = data.profile
        this.isLogin = true
        localStorage.setItem('token', data.token)
        localStorage.setItem('profile', JSON.stringify(data.profile))
        return data
      } catch (err) {
        console.error('登录失败:', err)
        throw err
      }
    },
    async autoLogin() {
      const token = localStorage.getItem('token')
      const profile = localStorage.getItem('profile')
      if (token && profile) {
        this.token = token
        try {
          this.profile = JSON.parse(profile)
          this.isLogin = true
          await this.fetchProfile()
        } catch (e) {
          await this.login('dev_user')
        }
      } else {
        await this.login('dev_user')
      }
    },
    async fetchProfile() {
      try {
        const data = await get('/user/profile')
        this.profile = data
        this.isLogin = true
      } catch (err) {
        this.isLogin = false
        throw err
      }
    },
    logout() {
      this.token = ''
      this.profile = null
      this.isLogin = false
      localStorage.removeItem('token')
      localStorage.removeItem('profile')
    }
  }
})
