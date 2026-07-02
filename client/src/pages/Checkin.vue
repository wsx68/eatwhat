<template>
  <div class="spin-page">
    <!-- 顶部 -->
    <div class="head">
      <span class="title">🎡 今天吃啥转盘</span>
      <span class="sub">让命运决定这一顿美味</span>
    </div>

    <!-- 第一级：区域筛选 -->
    <div class="area-tabs">
      <span v-for="l in locs" :key="l.k" class="at" :class="{ on: curLoc === l.k }" @click="onLocClick(l.k)">{{ l.n }}</span>
    </div>
    <div v-if="floors.length" class="floor-bar">
      <span v-for="f in floors" :key="f" class="fl" :class="{ on: curFloor === f }" @click="curFloor = curFloor === f ? '' : f">{{ f }}</span>
    </div>

    <div class="pick-hint" v-if="!curLoc">👆 先选一个区域，帮你挑好吃的～</div>
    <div class="pick-hint" v-else-if="stalls.length === 0">😴 这个区域暂无档口，换一个试试？</div>

    <!-- 第二级：转盘 -->
    <div v-if="stalls.length > 0" class="wheel-section">
      <div class="wheel-wrap">
        <div class="wheel-pointer">▼</div>
        <canvas ref="wheelCanvas" :width="canvasSize" :height="canvasSize" class="wheel-canvas"></canvas>
        <button class="spin-btn" :class="{ spinning }" :disabled="spinning" @click="doSpin">
          {{ spinning ? '旋转中...' : '🎲 帮我挑一个' }}
        </button>
      </div>
    </div>

    <!-- 弹窗：档口结果 -->
    <transition name="pop">
      <div v-if="showStallResult" class="result-overlay" @click.self="closeAll">
        <div class="result-card">
          <div class="rc-sparkles">
            <span v-for="s in 8" :key="s" class="spk" :style="{ left: (10+Math.random()*80)+'%', top: (5+Math.random()*90)+'%', animationDelay: Math.random()*2+'s' }">✦</span>
          </div>
          <div class="rs-icon">🎯</div>
          <div class="rs-stall-name">{{ selectedStall?.name }}</div>
          <div class="rs-sub">就决定是这家了！</div>
          <div class="rs-actions-v">
            <button class="rs-btn primary" @click="confirmStallOnly">🤤 就吃这家了</button>
            <button class="rs-btn secondary" @click="startDishRoll">😵 选择困难？连菜品也帮我挑了！</button>
            <button class="rs-btn ghost" @click="reSpin">🔄 换一家试试</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 弹窗：菜品老虎机 & 结果 -->
    <transition name="pop">
      <div v-if="showDishPopup" class="result-overlay" @click.self="closeAll">
        <div class="result-card">
          <div class="rc-sparkles">
            <span v-for="s in 12" :key="s" class="spk" :style="{ left: (5+Math.random()*90)+'%', top: (5+Math.random()*90)+'%', animationDelay: Math.random()*2+'s' }">✦</span>
          </div>
          <!-- 老虎机动效 -->
          <template v-if="!finalDish">
            <div class="slot-label">🎰 为你挑选中...</div>
            <div class="slot-stall-name">{{ selectedStall?.name }}</div>
            <div class="slot-window">
              <div class="slot-reel" :style="{ transform: 'translateY(-'+slotOffset+'px)', transition: slotSpinning ? 'none' : 'transform 0.08s linear' }">
                <div v-for="(d,i) in shuffledDishes" :key="i" class="slot-item">{{ d }}</div>
              </div>
            </div>
          </template>
          <!-- 最终结果 -->
          <template v-else>
            <div class="fr-badge">✨ 最终决定 ✨</div>
            <div class="fr-text">去 <b>{{ selectedStall?.name }}</b> 吃</div>
            <div class="fr-dish">{{ finalDish }}</div>
            <div class="fr-actions">
              <button class="rs-btn primary" @click="confirmPick">🤤 就吃这个</button>
              <button class="rs-btn ghost" @click="reRollDish">🔀 再换一个菜</button>
            </div>
          </template>
        </div>
      </div>
    </transition>

    <!-- 粒子画布 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCheckinStore } from '../stores/checkin'
import { get } from '../utils/request'

const router = useRouter()
const checkinStore = useCheckinStore()

// ---- 区域 & 楼层 ----
const curLoc = ref(''); const curFloor = ref('')
const locs = [{ k: '一食堂', n: '一餐' },{ k: '二食堂', n: '二餐' },{ k: '三食堂', n: '风餐' },{ k: 'commercial', n: '商业街' }]
const floorMap = { '一食堂': ['一楼','二楼'], '二食堂': ['一楼','二楼','三楼'], 'commercial': ['F1','F2'] }
const floors = computed(() => floorMap[curLoc.value] || [])
const rests = ref([])
const selectedStall = ref(null)
const stalls = computed(() => {
  let list = rests.value
  if (curLoc.value) list = list.filter(r => curLoc.value === 'commercial' ? r.type === 'commercial' : r.location?.includes(curLoc.value))
  if (curFloor.value) list = list.filter(r => r.location?.includes(curFloor.value))
  return list
})
function onLocClick(k) { curLoc.value = curLoc.value === k ? '' : k; curFloor.value = ''; selectedStall.value = null }

// ---- 转盘 ----
const wheelCanvas = ref(null)
const spinning = ref(false)
const canvasSize = ref(300)
// 轮盘色系: 马卡龙柔和彩虹
const PASTEL = ['#F4A7B9','#F9D56E','#A8D8B9','#7EC8E3','#C3AED6','#F7C59F','#B5EAD7','#FFD4C4','#D4C5E8','#F9E4A0','#A8D8EA','#F4C2C2']
let wheelAngle = 0, spinAnimId = null

function drawWheel(highlightIdx = -1) {
  const canvas = wheelCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 8
  const list = stalls.value
  if (!list.length) { ctx.clearRect(0, 0, canvas.width, canvas.height); return }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const sliceAngle = (2 * Math.PI) / list.length
  // 文字自适应大小
  const fontSize = list.length > 8 ? Math.max(10, 14 - (list.length - 8) * 0.8) : 14

  list.forEach((s, i) => {
    const startAngle = wheelAngle + i * sliceAngle
    const endAngle = startAngle + sliceAngle
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, startAngle, endAngle); ctx.closePath()

    if (highlightIdx === i) {
      const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r)
      glow.addColorStop(0, '#FFF5F0'); glow.addColorStop(0.5, '#FFE0D0'); glow.addColorStop(1, PASTEL[i % PASTEL.length])
      ctx.fillStyle = glow
    } else {
      ctx.fillStyle = PASTEL[i % PASTEL.length]
    }
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5; ctx.stroke()

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(startAngle + sliceAngle / 2)
    ctx.textAlign = 'right'; ctx.fillStyle = '#6B5B4F'; ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`
    const maxLen = Math.floor(r / (fontSize * 0.8))
    const name = s.name.length > maxLen ? s.name.slice(0, maxLen)+'..' : s.name
    ctx.fillText(name, r - 14, fontSize * 0.35); ctx.restore()
  })

  // 中心圆: 奶糖白
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 2*Math.PI)
  const cg = ctx.createRadialGradient(cx-3, cy-3, 2, cx, cy, 24)
  cg.addColorStop(0, '#FFF'); cg.addColorStop(0.6, '#FFFBF8'); cg.addColorStop(1, '#F5EDE5')
  ctx.fillStyle = cg; ctx.fill()
}

function doSpin() {
  if (spinning.value || !stalls.value.length) return
  spinning.value = true
  showStallResult.value = false; showDishPopup.value = false; finalDish.value = null; selectedStall.value = null
  clearInterval(slotTimer)

  const targetAngle = Math.random() * Math.PI * 2 + Math.PI * 6
  const duration = 3000 + Math.random() * 2000
  const startAngle = wheelAngle, startTime = performance.now()

  function animate(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    wheelAngle = startAngle + targetAngle * eased
    drawWheel()
    if (progress < 1) { spinAnimId = requestAnimationFrame(animate); return }
    // 停下
    spinning.value = false
    const list = stalls.value
    const sliceAngle = (2 * Math.PI) / list.length
    let norm = wheelAngle % (2 * Math.PI); if (norm < 0) norm += 2 * Math.PI
    const pointerAngle = (2 * Math.PI - norm + Math.PI / 2) % (2 * Math.PI)
    const idx = Math.floor(pointerAngle / sliceAngle) % list.length
    const winner = list[idx]
    selectedStall.value = winner
    // 高亮闪烁 + 粒子
    drawWheel(idx)
    spawnParticles()
    setTimeout(() => { showStallResult.value = true; drawWheel() }, 700)
  }
  spinAnimId = requestAnimationFrame(animate)
}

// ---- 档口结果弹窗 ----
const showStallResult = ref(false)

async function confirmStallOnly() {
  if (!selectedStall.value) return
  const foods = await fetchStallFoods(selectedStall.value.id)
  if (!foods.length) { alert('该档口暂无菜品数据'); return }
  const dish = foods[Math.floor(Math.random() * foods.length)]
  await doCheckin(selectedStall.value, dish)
  showStallResult.value = false
  alert(`打卡成功 🎉\n在 ${selectedStall.value.name} 吃了 ${dish}！`)
  spawnParticles()
}

function reSpin() {
  showStallResult.value = false
  setTimeout(() => doSpin(), 400)
}

// ---- 菜品老虎机 ----
const showDishPopup = ref(false)
const finalDish = ref(null)
const slotSpinning = ref(false), slotOffset = ref(0), shuffledDishes = ref([])
let slotTimer = null

async function fetchStallFoods(restaurantId) {
  try {
    const d = await get('/food/list', { restaurant_id: restaurantId, size: 50 })
    return (d.list || []).map(f => f.name)
  } catch (e) { return ['今日特供'] }
}

function runSlotMachine(names) {
  clearInterval(slotTimer)
  const result = names[Math.floor(Math.random() * names.length)]
  const shuffled = []
  for (let i = 0; i < 25; i++) shuffled.push(names[Math.floor(Math.random() * names.length)])
  shuffled.push(result)
  shuffledDishes.value = shuffled
  slotSpinning.value = true; slotOffset.value = 0
  const total = shuffled.length - 1; let idx = 0; const itemH = 42
  slotTimer = setInterval(() => {
    idx++; slotOffset.value = idx * itemH
    if (idx >= total) { clearInterval(slotTimer); slotSpinning.value = false; setTimeout(() => { finalDish.value = result; spawnParticles() }, 350) }
  }, 65)
}

async function startDishRoll() {
  showStallResult.value = false; showDishPopup.value = true; finalDish.value = null
  const foods = await fetchStallFoods(selectedStall.value.id)
  runSlotMachine(foods.length ? foods : ['神秘美食'])
}

async function reRollDish() {
  finalDish.value = null
  const foods = await fetchStallFoods(selectedStall.value.id)
  runSlotMachine(foods.length ? foods : ['神秘美食'])
}

async function doCheckin(stall, dishName) {
  try {
    const d = await get('/food/list', { restaurant_id: stall.id, size: 100 })
    const foodObj = (d.list || []).find(f => f.name === dishName)
    if (foodObj) {
      checkinStore.selectFood({ ...foodObj, restaurant_id: stall.id })
      await checkinStore.submitCheckin()
    }
  } catch (e) { console.error(e) }
}

async function confirmPick() {
  if (!selectedStall.value || !finalDish.value) return
  await doCheckin(selectedStall.value, finalDish.value)
  alert(`打卡成功 🎉\n去 ${selectedStall.value.name} 吃了 ${finalDish.value}！`)
  showDishPopup.value = false; finalDish.value = null
}

function closeAll() { showStallResult.value = false; showDishPopup.value = false; finalDish.value = null; clearInterval(slotTimer) }

// ---- 粒子效果 ----
const particleCanvas = ref(null)
let particles = [], pAnimId = null

function spawnParticles() {
  const cvs = particleCanvas.value
  if (!cvs) return
  cvs.width = window.innerWidth; cvs.height = window.innerHeight
  const cx = cvs.width / 2, cy = cvs.height * 0.5
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2; const speed = 2 + Math.random() * 4
    particles.push({
      x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 6, life: 1, decay: 0.006 + Math.random() * 0.018,
      color: PASTEL[Math.floor(Math.random()*PASTEL.length)]
    })
  }
  if (!pAnimId) animateParticles()
}

function animateParticles() {
  const cvs = particleCanvas.value
  if (!cvs) return
  const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, cvs.width, cvs.height)
  particles = particles.filter(p => p.life > 0)
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= p.decay
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 2*Math.PI); ctx.fill()
  })
  ctx.globalAlpha = 1
  if (particles.length) pAnimId = requestAnimationFrame(animateParticles)
  else { pAnimId = null; ctx.clearRect(0, 0, cvs.width, cvs.height) }
}

// ---- 初始化 ----
onMounted(async () => {
  canvasSize.value = Math.min(window.innerWidth - 48, 340)
  try { const d = await get('/restaurant/list'); rests.value = [...(d.commercial||[]), ...(d.cafeteria||[])] } catch (e) {}
  await nextTick(); drawWheel()
})
</script>

<style scoped>
.spin-page { min-height: 100vh; background: #FDFBF7; display: flex; flex-direction: column; align-items: center; padding-bottom: 40px; overflow-x: hidden; }

/* 头部 */
.head { text-align: center; padding: 24px 20px 8px; }
.title { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #F4A7B9, #C3AED6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.sub { display: block; font-size: 13px; color: #C4B8A8; margin-top: 4px; font-style: italic; }

/* 区域标签 */
.area-tabs { display: flex; gap: 8px; padding: 10px 16px; justify-content: center; flex-wrap: wrap; }
.at { padding: 8px 20px; border-radius: 22px; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.8); color: #8B7355; cursor: pointer; border: 1.5px solid #F0E8DB; transition: all 0.2s; }
.at.on { background: #F4A7B9; color: #fff; border-color: #F4A7B9; box-shadow: 0 4px 16px rgba(244,167,185,0.35); }
.floor-bar { display: flex; gap: 6px; padding: 4px 16px; justify-content: center; }
.fl { padding: 5px 14px; border-radius: 14px; font-size: 12px; background: rgba(255,255,255,0.7); color: #8B7355; cursor: pointer; border: 1px solid #F0E8DB; transition: all 0.18s; }
.fl.on { background: #A8D8B9; color: #fff; border-color: #A8D8B9; font-weight: 600; }

.pick-hint { text-align: center; padding: 50px 20px; color: #C4B8A8; font-size: 15px; }

/* 转盘 */
.wheel-section { margin-top: 8px; display: flex; flex-direction: column; align-items: center; }
.wheel-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
.wheel-pointer { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); z-index: 20; font-size: 30px; color: #E8A0B0; filter: drop-shadow(0 3px 6px rgba(232,160,176,0.4)); }
.wheel-canvas { border-radius: 50%; box-shadow: 0 8px 40px rgba(150,130,120,0.08), 0 0 0 8px rgba(255,255,255,0.7), 0 0 0 10px rgba(240,232,219,0.5); }
.spin-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 72px; height: 72px; border-radius: 50%; border: none;
  background: linear-gradient(135deg, #FFFBF8, #FDE8EE); color: #8B6B7B;
  font-size: 13px; font-weight: 700; cursor: pointer; z-index: 15;
  box-shadow: 0 4px 20px rgba(200,160,170,0.3), inset 0 1px 0 rgba(255,255,255,0.8);
  transition: all 0.2s; letter-spacing: 1px;
}
.spin-btn:active { transform: translate(-50%,-50%) scale(0.9); }
.spin-btn.spinning { background: #F0ECE8; color: #C4B8A8; box-shadow: none; cursor: default; }

/* 弹窗 */
.result-overlay { position: fixed; inset: 0; background: rgba(80,60,50,0.35); z-index: 999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
.result-card {
  background: #FFFDF9; border-radius: 24px; padding: 32px 24px; width: 88vw; max-width: 360px;
  text-align: center; position: relative; overflow: hidden;
  box-shadow: 0 20px 60px rgba(120,90,70,0.12);
  animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.rc-sparkles { position: absolute; inset: 0; pointer-events: none; }
.spk { position: absolute; font-size: 10px; color: #E8C0D0; animation: spkFloat 2s ease-in-out infinite; }
@keyframes spkFloat { 0%,100% { opacity: 0; transform: translateY(0) scale(0.5); } 50% { opacity: 1; transform: translateY(-8px) scale(1.2); } }

/* 档口结果 */
.rs-icon { font-size: 52px; margin-bottom: 8px; }
.rs-stall-name { font-size: 22px; font-weight: 800; color: #6B5B4F; line-height: 1.3; }
.rs-sub { font-size: 13px; color: #B0A090; margin-bottom: 24px; margin-top: 4px; }
.rs-actions-v { display: flex; flex-direction: column; gap: 10px; }
.rs-btn { width: 100%; padding: 13px 0; border-radius: 18px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
.rs-btn:active { transform: scale(0.97); }
.rs-btn.primary { background: linear-gradient(135deg, #F4A7B9, #F7C59F); color: #fff; box-shadow: 0 4px 18px rgba(244,167,185,0.35); }
.rs-btn.secondary { background: #FFF5F8; color: #C08090; border: 1.5px solid #F4D0D8; }
.rs-btn.ghost { background: transparent; color: #B0A090; font-size: 13px; font-weight: 500; padding: 8px 0; }

/* 老虎机 */
.slot-label { font-size: 13px; color: #C4B8A8; margin-bottom: 4px; }
.slot-stall-name { font-size: 15px; font-weight: 700; color: #6B5B4F; margin-bottom: 16px; }
.slot-window { height: 42px; overflow: hidden; border-radius: 12px; background: #FDF8F5; margin: 0 12px; border: 2px solid #F0E0D8; }
.slot-reel { display: flex; flex-direction: column; }
.slot-item { height: 42px; line-height: 42px; font-size: 18px; font-weight: 700; color: #E8A0B0; text-align: center; white-space: nowrap; }

/* 最终菜品结果 */
.fr-badge { font-size: 12px; color: #D4A0B0; font-weight: 600; margin-bottom: 12px; letter-spacing: 2px; animation: badgePulse 1.5s ease-in-out infinite; }
@keyframes badgePulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
.fr-text { font-size: 15px; color: #6B5B4F; margin-bottom: 4px; }
.fr-text b { color: #E8A0B0; }
.fr-dish { font-size: 30px; font-weight: 800; color: #D4889A; margin: 8px 0 24px; line-height: 1.3; }
.fr-actions { display: flex; gap: 10px; }

/* 粒子 */
.particle-canvas { position: fixed; inset: 0; pointer-events: none; z-index: 998; }

/* 弹窗过渡 */
.pop-enter-active { transition: all 0.35s ease; }
.pop-leave-active { transition: all 0.25s ease; }
.pop-enter-from,.pop-leave-to { opacity: 0; }

@media (min-width: 768px) {
  .spin-page { max-width: 800px; margin: 0 auto; }
  .title { font-size: 28px; }
  .wheel-section { margin-top: 16px; }
}
</style>
