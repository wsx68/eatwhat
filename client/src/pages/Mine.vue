<template>
  <div class="page">
    <div class="profile">
      <div class="p-avatar">{{ initial }}</div>
      <span class="p-name">{{ userStore.profile?.nickname || '吃货' }}</span>
      <div class="p-stats"><div class="ps"><b>{{ checkinStore.historyTotal }}</b><small>总打卡</small></div><div class="ps"><b>{{ uniqueFoods }}</b><small>吃过的</small></div></div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">打卡记录</span><span class="card-sub">共 {{ checkinStore.historyTotal }} 条</span></div>
      <div v-if="!checkinStore.history.length && !checkinStore.historyLoading" class="empty"><span>📝</span><p>还没有打卡记录</p></div>
      <div class="history-grid">
        <div v-for="item in checkinStore.history" :key="item.id" class="h-item" @click="goDetail(item.food_id)">
          <img :src="item.food_image || ph" class="h-img" alt="" />
          <div class="h-body"><span class="h-food">{{ item.food_name }}</span><span class="h-rest">{{ item.restaurant_name }}</span><span v-if="item.comment" class="h-cmt">"{{ item.comment }}"</span></div>
          <span class="h-time">{{ fmt(item.created_at) }}</span>
        </div>
      </div>
      <div v-if="checkinStore.historyLoading" class="status">加载中...</div>
      <div v-if="!checkinStore.historyHasMore && checkinStore.history.length" class="status">— 没有更多了 —</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useCheckinStore } from '../stores/checkin'
const router = useRouter(); const userStore = useUserStore(); const checkinStore = useCheckinStore()
const ph = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23F5F0EB' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' font-size='50' text-anchor='middle' dy='.3em' fill='%23E0D5C8'%3E🍽%3C/text%3E%3C/svg%3E"
const initial = computed(() => userStore.profile?.nickname?.[0] || '我')
const uniqueFoods = computed(() => new Set(checkinStore.history.map(h => h.food_id)).size)
onMounted(() => { if (!userStore.isLogin) userStore.autoLogin(); checkinStore.fetchHistory(true) })
function goDetail(id) { if (id) router.push(`/food/${id}`) }
function fmt(d) { if (!d) return ''; const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` }
</script>

<style scoped>
.page { min-height: 100vh; background: var(--c-bg); }
.profile { background: linear-gradient(165deg, #FDF6F0 0%, #FBF0E5 50%, #F8E8D8 100%); padding: 36px 20px 24px; text-align: center; }
.p-avatar { width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 10px; background: rgba(255,255,255,0.7); color: var(--c-primary); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
.p-name { font-size: 18px; font-weight: 600; color: var(--c-text); }
.p-stats { display: flex; justify-content: center; gap: 36px; margin-top: 16px; }
.ps { text-align: center; }
.ps b { font-size: 22px; display: block; color: var(--c-primary); font-weight: 700; }
.ps small { font-size: 11px; color: var(--c-text-s); }
.card { background: #fff; margin: 12px 16px; border-radius: 18px; padding: 18px; }
.card-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--c-border); }
.card-title { font-size: 15px; font-weight: 700; color: var(--c-text); }
.card-sub { font-size: 12px; color: var(--c-text-t); }
.empty { text-align: center; padding: 32px 0; color: var(--c-text-s); }
.empty span { font-size: 40px; display: block; margin-bottom: 8px; }
.history-grid { display: flex; flex-direction: column; }
.h-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #fafaf8; cursor: pointer; }
.h-item:last-child { border: none; }
.h-img { width: 42px; height: 42px; border-radius: 10px; object-fit: cover; background: var(--c-bg); flex-shrink: 0; }
.h-body { flex: 1; display: flex; flex-direction: column; }
.h-food { font-size: 14px; font-weight: 600; color: var(--c-text); }
.h-rest { font-size: 11px; color: var(--c-text-s); }
.h-cmt { font-size: 11px; color: var(--c-primary); font-style: italic; }
.h-time { font-size: 10px; color: var(--c-text-t); white-space: nowrap; }
.status { text-align: center; padding: 20px; color: var(--c-text-t); font-size: 13px; }

/* ======== 桌面端 ======== */
@media (min-width: 768px) {
  .page { max-width: 1000px; margin: 0 auto; }
  .profile { padding: 40px 32px 28px; border-radius: 0; }
  .card { margin: 16px 32px; }
  .history-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; }
  .h-item { border: none; padding: 10px; border-radius: 12px; }
  .h-item:hover { background: #fafaf8; }
}
@media (min-width: 1024px) {
  .history-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
