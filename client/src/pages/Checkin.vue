<template>
  <div class="page">
    <div class="head">
      <span class="title">打卡</span>
      <span class="sub">记录今天吃了什么</span>
    </div>

    <!-- 已选餐品 → 评价 + 提交 -->
    <div v-if="checkinStore.selectedFood" class="card">
      <div class="sl">已选餐品</div>
      <div class="selected">
        <img :src="checkinStore.selectedFood.image_url" alt="" />
        <div class="s-info"><span class="s-name">{{ checkinStore.selectedFood.name }}</span><span class="s-meta">{{ checkinStore.selectedFood.restaurant_name }} · ¥{{ checkinStore.selectedFood.price }}</span></div>
        <span @click="checkinStore.resetForm()" class="s-remove">✕</span>
      </div>
      <button @click="handleSubmit" :disabled="checkinStore.submitting" class="submit-btn">{{ checkinStore.submitting ? '正在打卡...' : '确认打卡 ✨' }}</button>
      <p class="hint">打卡后你的气泡会出现在首页</p>
    </div>

    <!-- 选择餐品 -->
    <div v-else>
      <div class="search-box"><span>🔍</span><input v-model="q" @input="onInput" placeholder="直接搜索餐品..." /></div>
      <div v-if="q" class="results">
        <div v-if="searchResults.length" class="r-list"><div v-for="f in searchResults" :key="f.id" @click="select(f)" class="r-item"><div class="r-left"><span class="r-name">{{ f.name }}</span><span class="r-sub">{{ f.restaurant_name }} · ¥{{ f.price }}</span></div><span class="r-plus">+</span></div></div>
        <div v-else-if="!searching" class="no-result">😅 没找到</div>
      </div>

      <!-- 浏览 -->
      <div v-if="!q" class="browse">
        <div class="loc-tabs"><span v-for="l in locs" :key="l.k" class="lt" :class="{ on: loc === l.k }" @click="loc = l.k">{{ l.n }}</span></div>
        <div class="rest-grid">
          <div v-for="r in filteredRests" :key="r.id" class="rest-card" :class="{ open: openId === r.id }">
            <div class="rc-head" @click="toggle(r.id)">
              <div class="rc-avatar" :style="{ background: clr(r.name) }">{{ r.name[0] }}</div>
              <div class="rc-info"><span class="rc-name">{{ r.name }}</span><span class="rc-loc">{{ r.type === 'cafeteria' ? '🏫' : '🏪' }} {{ r.location }} · {{ r.food_count }} 个</span></div>
              <span class="rc-arr" :class="{ down: openId === r.id }">▾</span>
            </div>
            <div v-if="openId === r.id" class="rc-foods">
              <div v-if="foodMap[r.id]?.length"><div v-for="f in foodMap[r.id]" :key="f.id" @click="select(f)" class="rc-food"><span class="f-name">{{ f.name }}</span><span class="f-price">¥{{ f.price }}</span><span class="f-add">+</span></div></div>
              <div v-else class="rc-loading">加载中...</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSuccess" class="overlay" @click.self="goHome"><div class="dlg"><span class="dlg-emoji">🎉</span><h3>打卡成功</h3><p>你的气泡已经飞到首页啦</p><button @click="goHome">返回首页</button></div></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCheckinStore } from '../stores/checkin'
import { get } from '../utils/request'
const router = useRouter(); const checkinStore = useCheckinStore()
const q = ref(''); const searchResults = ref([]); const searching = ref(false); const showSuccess = ref(false)
const loc = ref('全部'); const openId = ref(null); const rests = ref([]); const foodMap = ref({})
const locs = [{ k: '全部', n: '全部' },{ k: 'commercial', n: '🏪 商业街' },{ k: '一食堂', n: '一食堂' },{ k: '二食堂', n: '二食堂' },{ k: '三食堂', n: '三食堂' }]
const filteredRests = computed(() => loc.value === '全部' ? rests.value : rests.value.filter(r => loc.value === 'commercial' ? r.type === 'commercial' : r.location?.includes(loc.value)))
onMounted(async () => { try { const d = await get('/restaurant/list'); rests.value = [...(d.commercial||[]),...(d.cafeteria||[])] } catch (e) {} })
const clr = (n) => { const cs = ['#E8A87C','#95B8A8','#A8C5D6','#C4A882','#B8C9B0']; return cs[(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%cs.length] }
async function toggle(id) { openId.value = openId.value === id ? null : id; if (!foodMap.value[id]) { try { const d = await get('/food/list',{restaurant_id:id,size:50}); foodMap.value[id] = d.list||[] } catch (e) { foodMap.value[id]=[] } } }
let t = null
function onInput() { clearTimeout(t); if (!q.value.trim()) { searchResults.value=[]; return }; searching.value=true; t = setTimeout(async () => { try { searchResults.value = await get('/food/search',{q:q.value.trim()}) } catch (e) {} finally { searching.value=false } }, 200) }
function select(f) { checkinStore.selectFood(f); q.value=''; searchResults.value=[] }
async function handleSubmit() { try { await checkinStore.submitCheckin(); showSuccess.value=true } catch (e) {} }
function goHome() { showSuccess.value=false; router.push('/') }
</script>

<style scoped>
.page { min-height: 100vh; background: var(--c-bg); padding-bottom: 40px; }
.head { padding: 20px 20px 8px; }
.title { font-size: 22px; font-weight: 700; color: var(--c-text); }
.sub { display: block; font-size: 13px; color: var(--c-text-s); margin-top: 2px; }
.card { background: #fff; margin: 12px 16px; border-radius: 16px; padding: 18px; }
.sl { font-size: 13px; color: var(--c-text-s); font-weight: 600; margin-bottom: 10px; }
.opt { font-weight: 400; font-size: 11px; color: var(--c-text-t); }
.selected { display: flex; align-items: center; gap: 12px; }
.selected img { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; background: var(--c-bg); }
.s-info { flex: 1; }
.s-name { font-size: 15px; font-weight: 600; display: block; color: var(--c-text); }
.s-meta { font-size: 12px; color: var(--c-text-s); }
.s-remove { font-size: 16px; color: var(--c-text-t); cursor: pointer; padding: 6px; }
textarea { width: 100%; border: 1.5px solid var(--c-border); border-radius: 12px; padding: 12px; font-size: 14px; resize: none; outline: none; background: #fafaf9; color: var(--c-text); font-family: inherit; }
textarea:focus { border-color: var(--c-primary); }
.cc { display: block; text-align: right; font-size: 11px; color: var(--c-text-t); margin-top: 4px; }
.submit-btn { width: 100%; height: 46px; margin-top: 16px; background: var(--c-primary); color: #fff; border: none; border-radius: 23px; font-size: 15px; font-weight: 600; cursor: pointer; }
.submit-btn:disabled { opacity: 0.5; }
.hint { text-align: center; font-size: 12px; color: var(--c-text-t); margin-top: 10px; }
.search-box { display: flex; align-items: center; gap: 8px; margin: 12px 16px; padding: 11px 16px; background: #fff; border-radius: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; color: var(--c-text); }
.search-box input::placeholder { color: var(--c-text-t); }
.results { margin: 0 16px; background: #fff; border-radius: 16px; overflow: hidden; max-height: 40vh; overflow-y: auto; }
.r-item { display: flex; align-items: center; padding: 12px 14px; border-bottom: 1px solid #fafaf8; cursor: pointer; }
.r-left { flex: 1; }
.r-name { font-size: 14px; font-weight: 600; display: block; }
.r-sub { font-size: 12px; color: var(--c-text-s); }
.r-plus { width: 24px; height: 24px; background: var(--c-primary); color: #fff; border-radius: 50%; text-align: center; line-height: 23px; font-size: 15px; }
.no-result { text-align: center; padding: 30px; color: var(--c-text-s); }
.browse { padding: 0 0 80px; }
.loc-tabs { padding: 10px 16px; white-space: nowrap; overflow-x: auto; }
.lt { display: inline-block; padding: 7px 16px; margin: 0 2px; background: #fff; border-radius: 16px; font-size: 12px; color: var(--c-text-s); cursor: pointer; }
.lt.on { background: var(--c-primary-l); color: var(--c-primary); font-weight: 600; }
.rest-grid { display: flex; flex-direction: column; }
.rest-card { background: #fff; margin: 8px 16px; border-radius: 14px; overflow: hidden; }
.rc-head { display: flex; align-items: center; gap: 10px; padding: 14px; cursor: pointer; }
.rc-avatar { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 17px; font-weight: 600; }
.rc-info { flex: 1; }
.rc-name { font-size: 14px; font-weight: 600; display: block; }
.rc-loc { font-size: 11px; color: var(--c-text-s); }
.rc-arr { font-size: 14px; color: var(--c-text-t); transition: transform 0.2s; }
.rc-arr.down { transform: rotate(180deg); }
.rc-foods { border-top: 1px solid var(--c-border); }
.rc-food { display: flex; align-items: center; padding: 10px 14px 10px 24px; border-bottom: 1px solid #fafaf8; cursor: pointer; }
.rc-food:last-child { border: none; }
.f-name { flex: 1; font-size: 14px; font-weight: 500; }
.f-price { font-size: 12px; color: var(--c-primary); margin-right: 12px; font-weight: 600; }
.f-add { width: 22px; height: 22px; background: var(--c-primary); color: #fff; border-radius: 50%; text-align: center; line-height: 21px; font-size: 14px; flex-shrink: 0; }
.rc-loading { text-align: center; padding: 14px; color: var(--c-text-t); font-size: 13px; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 999; }
.dlg { background: #fff; border-radius: 20px; padding: 36px 24px; text-align: center; width: 280px; }
.dlg-emoji { font-size: 52px; display: block; margin-bottom: 12px; }
.dlg h3 { font-size: 18px; font-weight: 700; margin-bottom: 6px; color: var(--c-text); }
.dlg p { font-size: 13px; color: var(--c-text-s); margin-bottom: 20px; }
.dlg button { width: 100%; height: 42px; background: var(--c-primary); color: #fff; border: none; border-radius: 21px; font-size: 14px; font-weight: 600; cursor: pointer; }

/* ======== 桌面端 ======== */
@media (min-width: 768px) {
  .page { max-width: 1000px; margin: 0 auto; }
  .head { padding: 28px 32px 8px; }
  .search-box { margin: 14px 32px; max-width: 500px; }
  .loc-tabs { padding: 10px 32px; }
  .rest-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 0 28px; }
  .rest-card { margin: 4px 0; }
  .rest-card.open { grid-column: 1 / -1; }
  .card { margin: 12px 32px; max-width: 500px; }
}
@media (min-width: 1024px) {
  .rest-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
