import { defineStore } from 'pinia'
import { get } from '../utils/request'

export const useFoodStore = defineStore('food', {
  state: () => ({
    list: [],
    total: 0,
    currentCategory: '全部',
    currentRestaurantId: null,
    searchQuery: '',
    page: 1,
    hasMore: true,
    loading: false,
    currentDetail: null,
    categories: ['全部', '米饭', '面食', '小吃', '饮品'],
    restaurants: { commercial: [], cafeteria: [] }
  }),
  actions: {
    async fetchList(reset = false) {
      if (this.loading) return
      if (!reset && !this.hasMore) return
      if (reset) { this.page = 1; this.list = []; this.hasMore = true }
      this.loading = true
      try {
        const data = await get('/food/list', {
          category: this.currentCategory === '全部' ? undefined : this.currentCategory,
          restaurant_id: this.currentRestaurantId,
          page: this.page,
          size: 20
        })
        this.list = reset ? data.list : [...this.list, ...data.list]
        this.total = data.total
        this.hasMore = data.hasMore
        this.page++
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    async fetchDetail(id) {
      const data = await get(`/food/detail/${id}`)
      this.currentDetail = data
      return data
    },
    async search(q) {
      if (!q || !q.trim()) return this.fetchList(true)
      this.loading = true
      try {
        const data = await get('/food/search', { q: q.trim() })
        this.list = data
        this.total = data.length
        this.hasMore = false
      } catch (err) { console.error(err) }
      finally { this.loading = false }
    },
    setCategory(cat) { this.currentCategory = cat; this.fetchList(true) },
    setRestaurant(rid) { this.currentRestaurantId = rid; this.fetchList(true) },
    async fetchRestaurants() {
      try {
        const data = await get('/restaurant/list')
        this.restaurants = data
      } catch (err) { console.error(err) }
    },
    async fetchCategories() {
      try {
        const data = await get('/food/categories')
        this.categories = ['全部', ...data]
      } catch (e) { /* use defaults */ }
    }
  }
})
