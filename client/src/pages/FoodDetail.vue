<template>
  <div v-if="food" class="page">
    <span class="back mobile-only" @click="$router.back()">←</span>

    <div class="detail-layout">
      <div class="hero">
        <img :src="food.image_url" alt="" />
        <div class="hero-info">
          <span class="h-name">{{ food.name }}</span>
          <span class="h-price">¥{{ food.price }}</span>
        </div>
      </div>

      <div class="info-col">
        <div class="card">
          <div class="row"><span class="label">分类</span><span class="val tag">{{ food.category }}</span></div>
          <div class="row"><span class="label">餐厅</span><span class="val">{{ food.restaurant_name }}</span></div>
          <div class="row"><span class="label">位置</span><span class="val">{{ food.restaurant_type === 'cafeteria' ? '🏫' : '🏪' }} {{ food.location }}</span></div>
          <div class="row"><span class="label">打卡</span><span class="val highlight">{{ food.checkin_count || 0 }} 次</span></div>
        </div>

        <div v-if="food.recent_checkins?.length" class="card">
          <div class="card-title">最近打卡</div>
          <div v-for="(c, i) in food.recent_checkins" :key="i" class="c-item">
            <span class="c-avatar">{{ c.nickname[0] }}</span>
            <div class="c-body"><span class="c-name">{{ c.nickname }}</span></div>
            <span class="c-time">{{ fmt(c.created_at) }}</span>
          </div>
        </div>

        <div style="margin-top:16px">
          <button @click="quickCheckin" :disabled="checking" class="btn full">{{ checking ? '打卡中...' : (fromCatalog ? '🍽️ 打卡' : '🍽️ 跟吃 +1') }}</button>
        </div>
      </div>
    </div>

    <div class="bottom mobile-only">
      <button @click="quickCheckin" :disabled="checking" class="btn full">{{ checking ? '打卡中...' : (fromCatalog ? '🍽️ 打卡' : '🍽️ 跟吃 +1') }}</button>
    </div>
  </div>
  <div v-else class="loading">加载中...</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFoodStore } from '../stores/food'
import { post } from '../utils/request'

const route = useRoute(); const router = useRouter()
const foodStore = useFoodStore()
const food = ref(null)
const checking = ref(false)
const fromCatalog = computed(() => route.query.from === 'catalog')

onMounted(async () => { try { food.value = await foodStore.fetchDetail(route.params.id) } catch (e) {} })

async function quickCheckin() {
  if (!food.value || checking.value) return
  checking.value = true
  try {
    await post('/checkin', { food_id: food.value.id, restaurant_id: food.value.restaurant_id, comment: '' })
    food.value = await foodStore.fetchDetail(route.params.id)
    alert(fromCatalog.value ? '打卡成功！🎉' : '跟吃成功！🎉')
  } catch (e) {
    alert(e.message || '打卡失败')
    // 刷新以更新checkin_count
    try { food.value = await foodStore.fetchDetail(route.params.id) } catch (_) {}
  }
  finally { checking.value = false }
}

function fmt(d) {
  if (!d) return ''
  const df = Date.now() - new Date(d).getTime()
  if (df < 6e4) return '刚刚'
  if (df < 36e5) return Math.floor(df/6e4)+'分钟前'
  if (df < 864e5) return Math.floor(df/36e5)+'小时前'
  return new Date(d).toLocaleDateString('zh')
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--c-bg); padding-bottom: 80px; }
.back { position: fixed; top: 14px; left: 14px; z-index: 100; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--c-text); cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.hero { position: relative; height: 260px; overflow: hidden; }
.hero img { width: 100%; height: 100%; object-fit: cover; }
.hero-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px 20px 18px; background: linear-gradient(transparent, rgba(0,0,0,0.35)); display: flex; justify-content: space-between; align-items: flex-end; }
.h-name { font-size: 22px; font-weight: 700; color: #fff; }
.h-price { font-size: 20px; font-weight: 700; color: #FDF3E7; }
.card { background: #fff; margin: 12px 16px; border-radius: 16px; padding: 16px; }
.card-title { font-size: 14px; font-weight: 600; color: var(--c-text); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--c-border); }
.row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
.row + .row { border-top: 1px solid #fafaf8; }
.label { font-size: 13px; color: var(--c-text-s); }
.val { font-size: 14px; color: var(--c-text); font-weight: 500; }
.val.tag { background: var(--c-primary-l); color: var(--c-primary); padding: 2px 10px; border-radius: 10px; font-size: 12px; }
.val.highlight { color: var(--c-primary); font-weight: 700; }
.c-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.c-item + .c-item { border-top: 1px solid #fafaf8; }
.c-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: var(--c-primary-l); color: var(--c-primary); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
.c-body { flex: 1; display: flex; flex-direction: column; }
.c-name { font-size: 13px; font-weight: 600; color: var(--c-text); }
.c-time { font-size: 11px; color: var(--c-text-t); white-space: nowrap; }
.bottom { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); z-index: 500; }
.btn { height: 46px; background: var(--c-primary); color: #fff; border: none; border-radius: 23px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn.full { width: 100%; display: block; }
.btn:disabled { opacity: 0.6; }
.loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--c-text-s); }
.mobile-only { display: flex; }
.desktop-only { display: none; }

@media (min-width: 768px) {
  .mobile-only { display: none !important; }
  .desktop-only { display: block; }
  .page { padding: 32px; max-width: 1100px; margin: 0 auto; }
  .detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .hero { height: 360px; border-radius: 16px; }
  .card { margin: 0 0 16px; }
  .bottom { display: none; }
}
</style>
