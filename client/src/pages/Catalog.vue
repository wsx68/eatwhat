<template>
  <div class="catalog">
    <div class="head">
      <span class="title">美食广场</span>
      <span class="sub">发现校园里的每一道美味</span>
    </div>
    <div class="search-box">
      <span>🔍</span>
      <input v-model="q" @keyup.enter="doSearch" placeholder="搜索美食或餐厅..." />
      <span v-if="q" @click="clearSearch" class="clear">✕</span>
    </div>
    <div class="filter-bar"><span v-for="loc in locations" :key="loc.v" class="chip" :class="{ on: curLoc === loc.v }" @click="onLocClick(loc.v)">{{ loc.label }}</span></div>
    <div v-if="floors.length" class="floor-bar">
      <span v-for="f in floors" :key="f" class="fl" :class="{ on: selectedFloor === f }" @click="onFloorClick(f)">{{ f }}</span>
    </div>
    <div class="filter-bar"><span v-for="cat in categories" :key="cat" class="chip" :class="{ on: curCat === cat }" @click="switchCat(cat)">{{ cat }}</span></div>

    <div class="list" @scroll="onScroll" ref="lr">
      <div class="food-grid">
        <FoodCard v-for="f in foodStore.list" :key="f.id" :food="f" @click="goDetail" />
      </div>
      <div v-if="foodStore.loading" class="status">加载中...</div>
      <div v-if="!foodStore.hasMore && foodStore.list.length" class="status">— 已经到底了 —</div>
      <div v-if="!foodStore.loading && !foodStore.list.length" class="empty"><span>🍽️</span><p>没有找到餐品</p></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFoodStore } from '../stores/food'
import FoodCard from '../components/FoodCard.vue'

const router = useRouter(); const foodStore = useFoodStore()
const q = ref(''); const lr = ref(null); const curLoc = ref(''); const curCat = ref('全部')
const selectedFloor = ref('')
const locations = [{ v: '一食堂', label: '一餐' },{ v: '二食堂', label: '二餐' },{ v: '三食堂', label: '民餐' },{ v: 'commercial', label: '商业街' }]
const floorMap = { '一食堂': ['一楼','二楼'], '二食堂': ['一楼','二楼','三楼'], 'commercial': ['F1','F2'] }
const floors = computed(() => floorMap[curLoc.value] || [])
const categories = ['全部','米饭','面食','小吃','饮品']

onMounted(() => { foodStore.fetchCategories(); loadData(true) })

async function loadData(reset) {
  if (foodStore.loading || q.value) return
  if (!reset && !foodStore.hasMore) return
  if (reset) { foodStore.page = 1; foodStore.list = []; foodStore.hasMore = true }
  foodStore.loading = true
  try {
    const p = new URLSearchParams()
    if (curCat.value !== '全部') p.set('category', curCat.value)
    p.set('page', foodStore.page); p.set('size', '24')
    const r = await fetch(`/api/food/list?${p}`); const j = await r.json()
    if (j.code === 0) {
      let l = j.data.list
      if (curLoc.value) l = l.filter(f => curLoc.value === 'commercial' ? f.restaurant_type === 'commercial' : f.location?.includes(curLoc.value))
      if (selectedFloor.value) l = l.filter(f => f.location?.includes(selectedFloor.value))
      foodStore.list = reset ? l : [...foodStore.list, ...l]
      foodStore.hasMore = j.data.hasMore; foodStore.page++
    }
  } catch (e) { console.error(e) } finally { foodStore.loading = false }
}
function onLocClick(l) { curLoc.value = curLoc.value === l ? '' : l; selectedFloor.value = ''; loadData(true) }
function onFloorClick(f) { selectedFloor.value = selectedFloor.value === f ? '' : f; loadData(true) }
function switchCat(c) { curCat.value = c; loadData(true) }
function doSearch() { curLoc.value = ''; selectedFloor.value = ''; curCat.value = '全部'; if (!q.value.trim()) { loadData(true); return }; foodStore.search(q.value) }
function clearSearch() { q.value = ''; loadData(true) }
function goDetail(f) { router.push(`/food/${f.id}`) }
function onScroll(e) { if (q.value) return; const el = e.target; if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadData(false) }
</script>

<style scoped>
.catalog { min-height: 100vh; background: var(--c-bg); display: flex; flex-direction: column; }
.head { padding: 20px 20px 4px; }
.title { font-size: 22px; font-weight: 700; color: var(--c-text); }
.sub { display: block; font-size: 13px; color: var(--c-text-s); margin-top: 2px; }
.search-box { display: flex; align-items: center; gap: 8px; margin: 14px 16px; padding: 11px 16px; background: #fff; border-radius: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; color: var(--c-text); }
.search-box input::placeholder { color: var(--c-text-t); }
.clear { color: var(--c-text-t); cursor: pointer; padding: 2px 6px; }
.filter-bar { padding: 6px 16px; white-space: nowrap; overflow-x: auto; }
.chip { display: inline-block; padding: 6px 15px; margin: 0 3px; border-radius: 16px; font-size: 12px; color: var(--c-text-s); background: #fff; cursor: pointer; border: 1px solid transparent; }
.chip.on { background: var(--c-primary-l); color: var(--c-primary); border-color: rgba(232,168,124,0.2); font-weight: 600; }
.floor-bar { margin: 0 16px 6px; display: flex; gap: 8px; }
.fl { padding: 5px 14px; background: rgba(255,255,255,0.7); border: 1px solid var(--c-border); border-radius: 14px; font-size: 12px; color: var(--c-text-s); cursor: pointer; transition: all 0.18s; }
.fl.on { background: var(--c-accent-l); color: var(--c-accent); border-color: var(--c-accent); font-weight: 600; }
.list { flex: 1; overflow-y: auto; }
.food-grid { display: flex; flex-direction: column; padding: 8px 0; }
.status { text-align: center; padding: 24px; color: var(--c-text-t); font-size: 13px; }
.empty { text-align: center; padding: 80px 0; color: var(--c-text-s); }
.empty span { font-size: 48px; display: block; margin-bottom: 10px; }

/* ======== 桌面端: 2-3 列网格 ======== */
@media (min-width: 768px) {
  .catalog { max-width: 1100px; margin: 0 auto; }
  .head { padding: 28px 32px 4px; }
  .search-box { margin: 16px 32px; max-width: 500px; }
  .filter-bar { padding: 6px 32px; }
  .food-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 12px 28px; }
}
@media (min-width: 1024px) {
  .food-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
