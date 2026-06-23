import { defineStore } from 'pinia'
import { post, get } from '../utils/request'

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    selectedFood: null,
    comment: '',
    submitting: false,
    history: [],
    historyPage: 1,
    historyTotal: 0,
    historyHasMore: true,
    historyLoading: false
  }),
  actions: {
    selectFood(food) { this.selectedFood = food },
    setComment(c) { this.comment = c },
    async submitCheckin() {
      if (!this.selectedFood) {
        alert('请先选择餐品')
        return
      }
      this.submitting = true
      try {
        const data = await post('/checkin', {
          food_id: this.selectedFood.id,
          restaurant_id: this.selectedFood.restaurant_id,
          comment: this.comment
        })
        this.comment = ''
        this.selectedFood = null
        return data
      } catch (err) {
        alert(err.message || '打卡失败')
        throw err
      } finally {
        this.submitting = false
      }
    },
    async fetchHistory(reset = false) {
      if (this.historyLoading) return
      if (!reset && !this.historyHasMore) return
      if (reset) { this.historyPage = 1; this.history = []; this.historyHasMore = true }
      this.historyLoading = true
      try {
        const data = await get('/checkin/history', { page: this.historyPage, size: 20 })
        this.history = reset ? data.list : [...this.history, ...data.list]
        this.historyTotal = data.total
        this.historyHasMore = data.hasMore
        this.historyPage++
      } catch (err) { console.error(err) }
      finally { this.historyLoading = false }
    },
    resetForm() { this.selectedFood = null; this.comment = '' }
  }
})
