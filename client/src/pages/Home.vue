<template>
  <div class="home">
    <div class="bg-layer"></div>
    <div class="journal-top">
      <div class="j-header">
        <span class="j-tagline">今天吃啥？</span>
        <span class="j-date">{{ todayStr }}</span>
      </div>
      <div class="j-mood">
        <span class="j-mood-text">{{ moodEmoji }} 食堂里飘来的香味，让人忍不住想打卡</span>
      </div>
    </div>

    <div class="filter-strip">
      <div class="search-pill">
        <span>🔍</span>
        <input v-model="searchQ" @input="onSearch" placeholder="搜面食、奶茶..." />
        <span v-if="searchQ" @click="searchQ='';resetFilter()" class="clear">✕</span>
      </div>
      <div class="cat-row">
        <span v-for="cat in ['全部','米饭','面食','小吃','饮品']" :key="cat" class="cat-pill" :class="{ on: activeCat === cat }" @click="filterByCat(cat)">{{ cat === '全部' ? '全部' : cat }}</span>
      </div>
    </div>

    <div class="memo-strip">
      <span class="memo-dot"></span>
      <span class="memo-text">此刻 <b>{{ displayBubbles.length }}</b> 个同学正在吃饭</span>
      <span v-if="activeCat !== '全部'" class="memo-tag" @click="resetFilter">{{ activeCat }} ×</span>
    </div>

    <div class="bubble-universe" ref="universeRef">
      <BubbleItem
        v-for="b in displayBubbles" :key="b.uid"
        :bubble="b" :is-mine="b._mine"
        :bounds="universeBounds" :allBubbles="displayBubbles"
        @click="onClick" @done="onDone" @dragStart="onDragStart" @dragMove="onDragMove" @dragEnd="onDragEnd"
      />
      <span class="deco-star" v-for="s in stars" :key="'s'+s.id" :style="{ left: s.x+'%', top: s.y+'%', fontSize: s.size+'px', opacity: s.op, animationDelay: s.delay+'s' }">{{ s.icon }}</span>
      <div v-if="!displayBubbles.length" class="empty-journal">
        <span class="ej-icon">🍽️</span>
        <p class="ej-title">还没有人在这里打卡</p>
        <p class="ej-hint">翻开这一页，写下你今天的美食故事吧</p>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toastShow" class="toast" :class="{ mine: toastMine }">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { get } from '../utils/request'
import BubbleItem from '../components/BubbleItem.vue'

const router = useRouter(); const userStore = useUserStore()
const searchQ = ref(''); const activeCat = ref('全部')
const allBubbles = ref([]); const universeRef = ref(null)
const toastShow = ref(false); const toastMine = ref(false)
const toastMsg = ref(''); const myUserId = ref(null); const stars = ref([])
let refreshTimer = null, animFrame = null

// 奶油色系
const CREAM = ['ice','silver','moon','rose','gold']

// ====== VVN4 风格物理引擎 ======
// 每个气泡: { uid, x, y, vx, vy, size, _impl: { fx, fy, isDragging } }
const physState = new Map()
let dragUid = null
let lastTime = 0
let simAlpha = 0        // 模拟能量（类似 D3 alpha）
let simAlphaTarget = 0  // 目标能量

const PHYS = {
  CENTER_STRENGTH: 0.06,  // 中心引力强度（对应 forceX/forceY.strength）
  COLLIDE_STRENGTH: 0.25, // 碰撞排斥强度（对应 forceCollide.strength）
  COLLIDE_PADDING: 2,     // 碰撞边距（对应 forceCollide.radius 的增量）
  ALPHA_DECAY: 0.02,      // 每帧能量衰减（类似 alphaDecay）
  ALPHA_MIN: 0.001,       // 最小能量阈值
  DRAG_ALPHA: 0.3,        // 拖拽时目标能量（类似 alphaTarget on drag）
  MAX_SPEED: 3             // 最大速度限制
}

function initPhys(bubble) {
  if (physState.has(bubble.uid)) return
  physState.set(bubble.uid, {
    uid: bubble.uid,
    x: bubble.x, y: bubble.y,
    vx: 0, vy: 0,
    size: bubble.size || 80,
    _impl: { fx: null, fy: null, isDragging: false }
  })
}

// ====== 物理步进（VVN4 D3 风格） ======
function step(now) {
  if (!lastTime) lastTime = now
  let dt = (now - lastTime) / 1000
  lastTime = now
  if (dt <= 0 || dt > 0.5) dt = 0.016

  const bubbles = allBubbles.value
  const bnd = universeBounds.value
  if (!bubbles.length) { animFrame = requestAnimationFrame(step); return }

  for (const b of bubbles) initPhys(b)

  const states = []
  const universeCX = (bnd.left + bnd.right) / 2  // 宇宙中心 X
  const universeCY = (bnd.top + bnd.bottom) / 2  // 宇宙中心 Y

  for (const b of bubbles) {
    const s = physState.get(b.uid)
    if (!s) continue
    const rPctX = s.size / window.innerWidth * 100 / 2
    const rPctY = s.size / window.innerHeight * 100 / 2
    states.push({ ...s, rPctX, rPctY, bubble: b })
  }

  // Alpha 向目标衰减
  if (simAlphaTarget > 0) {
    simAlpha += (simAlphaTarget - simAlpha) * 0.3
  } else {
    simAlpha += (0 - simAlpha) * PHYS.ALPHA_DECAY
    if (simAlpha < PHYS.ALPHA_MIN) simAlpha = 0
  }

  // 计算每个节点的受力
  const forces = states.map(() => ({ fx: 0, fy: 0 }))

  for (let i = 0; i < states.length; i++) {
    const s = states[i]
    if (s._impl.isDragging) continue

    // 力① 中心引力（forceX + forceY）
    const dxCenter = universeCX - s.x
    const dyCenter = universeCY - s.y
    forces[i].fx += dxCenter * PHYS.CENTER_STRENGTH * simAlpha
    forces[i].fy += dyCenter * PHYS.CENTER_STRENGTH * simAlpha
  }

  // 力② 碰撞排斥（forceCollide）
  for (let i = 0; i < states.length; i++) {
    for (let j = i + 1; j < states.length; j++) {
      const a = states[i], b = states[j]
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const safeDist = a.rPctX + b.rPctX + PHYS.COLLIDE_PADDING / 50
      if (dist < safeDist && dist > 0.0001) {
        const strength = PHYS.COLLIDE_STRENGTH * simAlpha * (safeDist - dist) / safeDist
        const nx = dx / dist, ny = dy / dist
        if (!a._impl.isDragging) { forces[i].fx -= nx * strength; forces[i].fy -= ny * strength }
        if (!b._impl.isDragging) { forces[j].fx += nx * strength; forces[j].fy += ny * strength }
      }
    }
  }

  // 积分更新所有气泡
  for (let i = 0; i < states.length; i++) {
    const s = states[i]

    if (s._impl.isDragging) {
      // 拖拽时：强制固定在手指位置（D3 fx/fy 机制）
      s.x = s._impl.fx ?? s.x
      s.y = s._impl.fy ?? s.y
      s.vx = 0; s.vy = 0
    } else {
      // 应用力 + 阻尼
      s.vx += forces[i].fx * dt
      s.vy += forces[i].fy * dt
      s.vx *= 0.9  // 阻尼
      s.vy *= 0.9
      const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy)
      if (spd > PHYS.MAX_SPEED) { s.vx = s.vx / spd * PHYS.MAX_SPEED; s.vy = s.vy / spd * PHYS.MAX_SPEED }
      s.x += s.vx * dt
      s.y += s.vy * dt
    }

    // 边界约束
    s.x = Math.max(bnd.left + s.rPctX, Math.min(bnd.right - s.rPctX, s.x))
    s.y = Math.max(bnd.top + s.rPctY, Math.min(bnd.bottom - s.rPctY, s.y))

    // 写回 bubble → 驱动 Vue 渲染
    s.bubble.x = s.x; s.bubble.y = s.y
    s.bubble._curX = s.x; s.bubble._curY = s.y
  }

  // 如果能量耗尽且没有拖拽，可以降低帧率（但仍然保持运动）
  if (simAlpha > 0 || dragUid) {
    animFrame = requestAnimationFrame(step)
  } else {
    // 即使能量耗尽也保持极低速运动（模拟微漂移）
    simAlpha = 0.05  // 重新注入微量能量
    animFrame = requestAnimationFrame(step)
  }
}

// ====== 拖动事件 ======
function onDragStart(uid) {
  dragUid = uid
  simAlphaTarget = PHYS.DRAG_ALPHA  // 拖拽时加热模拟
  const s = physState.get(uid)
  if (s) {
    s._impl.isDragging = true
    s._impl.fx = s.x; s._impl.fy = s.y  // 固定当前位置
  }
}
function onDragMove(uid, px, py) {
  const s = physState.get(uid)
  if (s) { s._impl.fx = px; s._impl.fy = py }  // 更新固定坐标
}
function onDragEnd(uid) {
  dragUid = null
  simAlphaTarget = 0  // 开始冷却
  const s = physState.get(uid)
  if (s) {
    s._impl.isDragging = false
    s._impl.fx = null; s._impl.fy = null  // 释放固定 → 自然漂回
  }
}

// ====== 布局初始化 ======
function layoutBubbles(raw) {
  if (!raw.length) return []
  const isM = window.innerWidth < 768
  const bnd = universeBounds.value
  const cols = isM ? 4 : 6; const rows = isM ? 4 : 5
  const cellW = (bnd.right - bnd.left) / cols
  const cellH = (bnd.bottom - bnd.top) / rows
  const sorted = [...raw].sort((a, b) => (b.checkin_count || 0) - (a.checkin_count || 0))
  const maxN = isM ? 20 : 36; const total = Math.min(sorted.length, maxN)

  const cells = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    cells.push({ x: bnd.left + c * cellW + cellW * 0.2 + Math.random() * cellW * 0.6, y: bnd.top + r * cellH + cellH * 0.2 + Math.random() * cellH * 0.6 })
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]] }

  return sorted.slice(0, Math.min(total, cells.length)).map((item, i) => {
    const size = isM ? (56 + (item.checkin_count || 0) * 12 + Math.random() * 18) : (72 + (item.checkin_count || 0) * 10 + Math.random() * 28)
    const cell = cells[i] || cells[cells.length - 1]
    const b = {
      ...item, uid: item.id + '_' + Math.random().toString(36).slice(2, 6),
      x: cell.x, y: cell.y, size: Math.round(size),
      _heat: Math.min(5, item.checkin_count || 0),
      _palette: CREAM[Math.floor(Math.random() * CREAM.length)],
      _curX: cell.x, _curY: cell.y,
      _mine: item._mine || false
    }
    initPhys(b)
    return b
  })
}

// 气泡回收
function onDone(uid) {
  const idx = allBubbles.value.findIndex(b => b.uid === uid)
  if (idx > -1) {
    physState.delete(uid)
    const old = allBubbles.value[idx]
    const fresh = layoutBubbles([{ ...old, _mine: old._mine }])[0]
    if (fresh) allBubbles.value.splice(idx, 1, fresh)
  }
}

// 新气泡
async function onNewBubble(bubble) {
  if (activeCat.value !== '全部' && bubble.category !== activeCat.value) return
  const isMine = myUserId.value && bubble.user_id === myUserId.value
  const placed = layoutBubbles([{ ...bubble, _mine: isMine }])[0]
  if (placed) {
    // 新气泡从底部随机位置出现
    const bnd = universeBounds.value
    placed.x = bnd.left + Math.random() * (bnd.right - bnd.left)
    placed.y = bnd.bottom - 5
    initPhys(placed)
    const s = physState.get(placed.uid)
    if (s) { s.x = placed.x; s.y = placed.y; s.vy = -1.5 }
    allBubbles.value.push(placed)
    toastShow.value = true; toastMine.value = isMine
    toastMsg.value = isMine ? '🎯 你的气泡已上浮！' : '✨ 有人刚刚打卡！'
    setTimeout(() => { toastShow.value = false }, 2500)
  }
}

// 数据加载
async function loadBubbles(category = '') {
  try {
    const params = category && category !== '全部' ? `?category=${encodeURIComponent(category)}` : ''
    const data = await get(`/checkin/recent${params}`)
    const marked = (data || []).map(b => ({ ...b, _mine: myUserId.value && b.user_id === myUserId.value }))
    // 保留已存在的 _curX/_curY（避免刷新跳位）
    const oldMap = new Map(allBubbles.value.map(b => [b.id, { x: b._curX ?? b.x, y: b._curY ?? b.y }]))
    allBubbles.value = layoutBubbles(marked)
    // 已有气泡保留位置
    for (const b of allBubbles.value) {
      const prev = oldMap.get(b.id)
      if (prev) { b.x = prev.x; b.y = prev.y; b._curX = prev.x; b._curY = prev.y }
    }
    stars.value = Array.from({ length: 10 }, (_, i) => ({ id: i, x: 2 + Math.random() * 96, y: 20 + Math.random() * 65, size: 5 + Math.random() * 6, op: 0.08 + Math.random() * 0.12, icon: ['✦','·','✧','∘'][Math.floor(Math.random() * 4)], delay: Math.random() * 4 }))
  } catch (e) { console.error(e) }
}

// 事件
function filterByCat(cat) { activeCat.value = cat; searchQ.value = ''; loadBubbles(cat) }
function resetFilter() { activeCat.value = '全部'; searchQ.value = ''; loadBubbles('') }
function onSearch() {}
function onClick(b) { if (b.food_id) router.push(`/food/${b.food_id}`) }

const displayBubbles = computed(() => {
  let list = allBubbles.value
  if (searchQ.value.trim()) {
    const kw = searchQ.value.trim().toLowerCase()
    list = list.filter(b => b.food_name.toLowerCase().includes(kw) || b.restaurant_name.toLowerCase().includes(kw))
  }
  return list
})

const universeBounds = computed(() => {
  const isM = window.innerWidth < 768
  return { top: isM ? 40 : 34, bottom: isM ? 91 : 88, left: isM ? 4 : 3, right: isM ? 96 : 97 }
})

const todayStr = computed(() => { const d = new Date(); const w = ['日','一','二','三','四','五','六']; return `${d.getMonth()+1}月${d.getDate()}日 星期${w[d.getDay()]}` })
const moodEmoji = computed(() => { const h = new Date().getHours(); if (h < 9) return '☀️'; if (h < 12) return '🌤️'; if (h < 14) return '🍱'; if (h < 18) return '🍰'; return '🌙' })

onMounted(async () => {
  if (!userStore.isLogin) await userStore.autoLogin()
  myUserId.value = userStore.profile?.id || null
  const { wsClient } = await import('../utils/websocket')
  wsClient.on('bubble_new', onNewBubble)
  await loadBubbles('')
  animFrame = requestAnimationFrame(step)
  refreshTimer = setInterval(() => { if (activeCat.value === '全部' && !searchQ.value) loadBubbles('') }, 45000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
.home { min-height: 100vh; position: relative; overflow: hidden; background: var(--c-bg); }
.bg-layer { position: absolute; inset: 0; z-index: 0; background: radial-gradient(ellipse 80% 60% at 50% 35%, #FFF8F0 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 20% 70%, #FFFDF5 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 60%, #FFFBF0 0%, transparent 60%), var(--c-bg); }
.journal-top { padding: 16px 20px 6px; position: relative; z-index: 50; }
.j-header { display: flex; align-items: baseline; gap: 10px; }
.j-tagline { font-size: 22px; font-weight: 800; color: var(--c-primary); letter-spacing: 1.5px; border-bottom: 3px dashed rgba(232,160,144,0.35); padding-bottom: 2px; }
.j-date { font-size: 12px; color: var(--c-text-s); }
.j-mood { margin-top: 6px; }
.j-mood-text { font-size: 12px; color: var(--c-text-s); font-style: italic; }
.filter-strip { padding: 10px 20px 0; position: relative; z-index: 50; }
.search-pill { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.8); border: 1px solid var(--c-border); padding: 8px 14px; border-radius: 22px; font-size: 13px; }
.search-pill input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: var(--c-text); }
.search-pill input::placeholder { color: var(--c-text-t); }
.clear { color: var(--c-text-t); cursor: pointer; }
.cat-row { display: flex; gap: 6px; margin-top: 8px; overflow-x: auto; white-space: nowrap; }
.cat-pill { padding: 5px 14px; border-radius: 14px; font-size: 12px; background: rgba(255,255,255,0.7); color: var(--c-text-s); border: 1px solid var(--c-border); cursor: pointer; flex-shrink: 0; transition: all 0.18s; }
.cat-pill.on { background: var(--c-primary); color: #fff; border-color: var(--c-primary); font-weight: 600; }
.memo-strip { display: flex; align-items: center; gap: 8px; padding: 8px 20px 0; position: relative; z-index: 50; font-size: 12px; color: var(--c-text-s); }
.memo-dot { width: 5px; height: 5px; border-radius: 50%; background: #A8BF9E; animation: memoPulse 1.8s ease-in-out infinite; }
.memo-text b { color: var(--c-primary); font-weight: 700; }
.memo-tag { margin-left: auto; color: var(--c-primary); font-size: 11px; cursor: pointer; background: var(--c-primary-l); padding: 2px 10px; border-radius: 10px; }
@keyframes memoPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
.bubble-universe { position: absolute; top: 0; left: 0; right: 0; bottom: 60px; z-index: 10; }
.deco-star { position: absolute; color: #E0D0BE; pointer-events: none; z-index: 2; animation: starTwinkle 3s ease-in-out infinite; }
@keyframes starTwinkle { 0%,100%{opacity:0.08;transform:scale(1)} 50%{opacity:0.25;transform:scale(1.3)} }
.empty-journal { position: absolute; top: 55%; left: 50%; transform: translate(-50%,-50%); text-align: center; z-index: 30; }
.ej-icon { font-size: 56px; display: block; margin-bottom: 12px; }
.ej-title { font-size: 17px; font-weight: 600; color: var(--c-text); }
.ej-hint { font-size: 13px; color: var(--c-text-s); margin-top: 4px; }
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 999; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; white-space: nowrap; background: var(--c-primary); color: #fff; box-shadow: 0 4px 16px rgba(232,160,144,0.35); }
.toast.mine { background: #E89080; }
.toast-enter-active { transition: all 0.4s ease; }
.toast-leave-active { transition: all 0.6s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }

@media (min-width: 768px) {
  .bubble-universe { bottom: 0; }
  .journal-top { padding: 20px 32px 6px; }
  .j-tagline { font-size: 26px; }
  .filter-strip { padding: 14px 32px 0; max-width: 560px; }
  .search-pill input { font-size: 14px; }
  .memo-strip { padding: 10px 34px 0; font-size: 13px; }
}
</style>
