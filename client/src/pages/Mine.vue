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
        <div v-for="item in checkinStore.history" :key="item.id" class="h-row">
          <div class="h-delete-btn" @click.stop="handleDelete(item)">删除</div>
          <div
            class="h-item"
            :class="{ 'swiped': swipeOpenId === item.id }"
            @click="onItemClick(item)"
            @touchstart.passive="onTouchStart($event, item)"
            @touchmove="onTouchMove($event, item)"
            @touchend="onTouchEnd($event, item)"
          >
            <img :src="item.food_image || ph" class="h-img" alt="" />
            <div class="h-body"><span class="h-food">{{ item.food_name }}</span><span class="h-rest">{{ item.restaurant_name }}</span><span v-if="item.comment" class="h-cmt">"{{ item.comment }}"</span></div>
            <span class="h-time">{{ fmt(item.created_at) }}</span>
          </div>
        </div>
      </div>
      <div v-if="checkinStore.historyLoading" class="status">加载中...</div>
      <div v-if="!checkinStore.historyHasMore && checkinStore.history.length" class="status">— 没有更多了 —</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useCheckinStore } from '../stores/checkin'
const router = useRouter(); const userStore = useUserStore(); const checkinStore = useCheckinStore()
const ph = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23F5F0EB' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' font-size='50' text-anchor='middle' dy='.3em' fill='%23E0D5C8'%3E🍽%3C/text%3E%3C/svg%3E"
const initial = computed(() => userStore.profile?.nickname?.[0] || '我')
const uniqueFoods = computed(() => new Set(checkinStore.history.map(h => h.food_id)).size)
onMounted(() => { if (!userStore.isLogin) userStore.autoLogin(); checkinStore.fetchHistory(true) })

// ---- 左滑 & 长按 ----
const swipeOpenId = ref(null)
let touchStartX = 0, touchStartY = 0, touchCurrentX = 0, touchItem = null
let longPressTimer = null
let hasSwiped = false

function onTouchStart(e, item) {
  const t = e.touches[0]
  touchStartX = t.clientX; touchStartY = t.clientY
  touchCurrentX = t.clientX; touchItem = item; hasSwiped = false
  // 长按 600ms
  clearTimeout(longPressTimer)
  longPressTimer = setTimeout(() => { if (!hasSwiped) showDeleteConfirm(item) }, 600)
}
function onTouchMove(e, item) {
  const t = e.touches[0]
  touchCurrentX = t.clientX
  const dx = touchCurrentX - touchStartX, dy = t.clientY - touchStartY
  if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
    hasSwiped = true; clearTimeout(longPressTimer)
    if (dx < -30) swipeOpenId.value = item.id
    else if (dx > 30) swipeOpenId.value = null
  }
}
function onTouchEnd(e, item) {
  clearTimeout(longPressTimer)
  if (!hasSwiped && swipeOpenId.value === item.id) {
    // 点击已打开的 item → 关闭
    swipeOpenId.value = null
  }
}
function onItemClick(item) {
  if (swipeOpenId.value === item.id) {
    swipeOpenId.value = null
  } else if (!hasSwiped) {
    if (item.food_id) router.push(`/food/${item.food_id}`)
  }
}
function showDeleteConfirm(item) {
  if (confirm(`确定删除「${item.food_name}」的打卡记录吗？`)) {
    checkinStore.deleteCheckin(item.id)
  }
}
function handleDelete(item) {
  if (confirm(`确定删除「${item.food_name}」的打卡记录吗？`)) {
    checkinStore.deleteCheckin(item.id)
    swipeOpenId.value = null
  }
}
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
/* ---- 左滑容器 ---- */
.h-row { position: relative; overflow: hidden; border-bottom: 1px solid #fafaf8; }
.h-row:last-child { border: none; }
.h-delete-btn {
  position: absolute; right: 0; top: 0; bottom: 0; width: 70px;
  background: #E85D5D; color: #fff; display: flex; align-items: center;
  justify-content: center; font-size: 14px; font-weight: 600;
  cursor: pointer; z-index: 0; border-radius: 0 10px 10px 0;
}
.h-item {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 10px;
  padding: 10px 0; background: #fff; cursor: pointer;
  transition: transform 0.25s ease;
}
.h-item.swiped { transform: translateX(-70px); }
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
