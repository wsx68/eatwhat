import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Catalog from './pages/Catalog.vue'
import FoodDetail from './pages/FoodDetail.vue'
import Checkin from './pages/Checkin.vue'
import Mine from './pages/Mine.vue'

const routes = [
  { path: '/', component: Home, meta: { title: '首页' } },
  { path: '/catalog', component: Catalog, meta: { title: '美食广场' } },
  { path: '/food/:id', component: FoodDetail, meta: { title: '餐品详情' } },
  { path: '/checkin', component: Checkin, meta: { title: '打卡' } },
  { path: '/mine', component: Mine, meta: { title: '我的' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
