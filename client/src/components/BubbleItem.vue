<template>
  <div
    class="bubble-organism"
    :class="[colorClass, { dragging, tapping, mine: isMine }]"
    :style="organismStyle"
    @mousedown="onPointerDown"
    @touchstart="onPointerDown"
    @click.stop="onTap"
  >
    <!-- 膜体：内层暗、边缘亮的径向渐变（纯CSS，无SVG滤镜） -->
    <div class="membrane-layer">
      <!-- 边缘轮廓光 -->
      <div class="edge-rim"></div>
      <!-- 内部流体 -->
      <div class="inner-fluid"></div>
      <!-- 高光滑动 -->
      <div class="iridescent-sheen"></div>
    </div>

    <!-- 星尘 -->
    <div class="stardust">
      <span class="sd-p" v-for="p in 3" :key="p"
        :style="{ left: p*28+'%', top: (12+p*18)+'%', animationDelay: p*0.7+'s' }">✦</span>
    </div>

    <!-- 文字 -->
    <div class="bio-text">
      <span class="bio-food">{{ bubble.food_name }}</span>
      <span class="bio-restaurant">{{ bubble.restaurant_name }}</span>
    </div>

    <!-- 我的标记 -->
    <span v-if="isMine" class="bio-mine">◉</span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  bubble: Object, isMine: Boolean, bounds: Object, allBubbles: Array
})
const emit = defineEmits(['click', 'done', 'dragStart', 'dragMove', 'dragEnd'])

const fading = ref(false); const tapping = ref(false); const dragging = ref(false)
let t1 = null, t2 = null

const colorClass = computed(() => `color-${props.bubble._palette || 'ice'}`)

const organismStyle = computed(() => {
  const b = props.bubble; const s = b.size || 90; const half = s / 2
  const x = b._curX ?? b.x ?? 50; const y = b._curY ?? b.y ?? 40
  const seed = (b.uid || '0').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return {
    left: `calc(${x}% - ${half}px)`, top: `calc(${y}% - ${half}px)`,
    width: `${s}px`, height: `${s}px`,
    '--breathe-dur': `${6 + seed % 5}s`,
    '--breathe-delay': `${seed % 3}s`,
    '--wobble-dur': `${8 + seed % 7}s`,
    fontSize: `${Math.max(9, s / 7.5)}px`,
    opacity: fading.value ? 0 : undefined,
    zIndex: dragging.value ? 200 : (b._heat >= 2 ? 110 : 100)
  }
})

// ====== 拖动/点击分离逻辑 ======
// 问题根因：@mousedown.prevent + @touchstart.prevent 阻止了 click 事件触发
// 解决方案：按下时不 preventDefault，通过移动距离区分点击和拖动
let pointerStart = null
let hasMoved = false
const DRAG_THRESHOLD = 5 // 像素，超过此距离视为拖动

function onPointerDown(e) {
  const touch = e.touches ? e.touches[0] : e
  pointerStart = { x: touch.clientX, y: touch.clientY }
  hasMoved = false
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
  document.addEventListener('touchmove', onPointerMove, { passive: false })
  document.addEventListener('touchend', onPointerUp)
}

function onPointerMove(e) {
  if (!pointerStart) return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - pointerStart.x
  const dy = touch.clientY - pointerStart.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > DRAG_THRESHOLD && !hasMoved) {
    hasMoved = true
    dragging.value = true
    const fx = pointerStart.x / window.innerWidth * 100
    const fy = pointerStart.y / window.innerHeight * 100
    emit('dragStart', props.bubble.uid)
    emit('dragMove', props.bubble.uid, fx, fy)
  }

  if (hasMoved) {
    e.preventDefault() // 拖动时阻止页面滚动
    emit('dragMove', props.bubble.uid,
      touch.clientX / window.innerWidth * 100,
      touch.clientY / window.innerHeight * 100)
  }
}

function onPointerUp() {
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  document.removeEventListener('touchmove', onPointerMove)
  document.removeEventListener('touchend', onPointerUp)

  if (hasMoved) {
    dragging.value = false
    emit('dragEnd', props.bubble.uid)
  }
  pointerStart = null
  hasMoved = false
}

function onTap() {
  // 拖动过的不触发点击
  if (dragging.value || hasMoved) return
  tapping.value = true
  setTimeout(() => { tapping.value = false }, 250)
  emit('click', props.bubble)
}

onMounted(() => {
  const total = ((props.bubble.duration || 55) + (props.bubble.delay || 0)) * 1000
  t1 = setTimeout(() => { fading.value = true }, Math.max(0, total - 15000))
  t2 = setTimeout(() => { emit('done', props.bubble.uid) }, total + 700)
})
onUnmounted(() => {
  clearTimeout(t1); clearTimeout(t2)
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  document.removeEventListener('touchmove', onPointerMove)
  document.removeEventListener('touchend', onPointerUp)
})
</script>

<style scoped>
/* ============================================
   透明生物膜气泡
   Skyline 兼容版 — 纯 CSS，无 SVG 滤镜
   材质：70% 生物膜 + 20% 液态玻璃 + 10% 肥皂泡
   ============================================ */
.bubble-organism {
  position: absolute; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  cursor: pointer;
  user-select: none;
  overflow: visible;
  animation:
    breathe var(--breathe-dur, 7s) ease-in-out var(--breathe-delay, 0s) infinite,
    wobble var(--wobble-dur, 10s) ease-in-out infinite;
  will-change: left, top, transform;
  transition: opacity 2s ease;
  /* 关键：确保点击穿透到元素本身 */
  pointer-events: auto;
}

/* ====== 呼吸（Skyline 优化：仅用 scale，不用 opacity） ====== */
@keyframes breathe {
  0%   { transform: scale(1); }
  22%  { transform: scale(1.026); }
  48%  { transform: scale(0.987); }
  74%  { transform: scale(1.01); }
  100% { transform: scale(1); }
}

/* ====== 有机边缘波动（border-radius 微调，Skyline 安全） ====== */
@keyframes wobble {
  0%   { border-radius: 50% 50% 50% 50%; }
  25%  { border-radius: 48.5% 51.5% 49% 51%; }
  50%  { border-radius: 51% 49% 51.5% 48.5%; }
  75%  { border-radius: 49% 51% 48.5% 51.5%; }
  100% { border-radius: 50% 50% 50% 50%; }
}

.bubble-organism.dragging { cursor: grabbing; animation: none; box-shadow: 0 0 20px rgba(0,0,0,0.08); }
.bubble-organism.tapping { transform: scale(0.93); transition: transform 0.15s ease; }

/* ====== 膜体（纯 CSS 径向渐变，无 SVG 滤镜） ====== */
.membrane-layer {
  position: absolute; inset: 0; border-radius: inherit; overflow: hidden;
  /* 核心：中心暗（透明）→ 边缘亮（半透白） */
  background: var(--membrane-grad,
    radial-gradient(circle at 50% 50%,
      rgba(255,255,255,0.12) 0%,
      rgba(255,255,255,0.28) 55%,
      rgba(255,255,255,0.50) 80%,
      rgba(255,255,255,0.65) 100%
    ));
  /* 替代 SVG feTurbulence 的有机噪点：使用多层径向渐变叠加 */
  background-image:
    radial-gradient(ellipse at 25% 30%, rgba(255,255,255,0.25) 0%, transparent 55%),
    radial-gradient(ellipse at 70% 65%, rgba(255,255,255,0.18) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.35) 70%, rgba(255,255,255,0.55) 100%);
}

/* 边缘光环 */
.edge-rim {
  position: absolute; inset: 0; border-radius: inherit;
  box-shadow:
    inset 0 0 10px 1.5px rgba(255,255,255,0.45),
    inset 0 0 3px 0.5px rgba(255,255,255,0.30);
  pointer-events: none;
}

/* 内部流体（缓慢漂移，纯 CSS） */
.inner-fluid {
  position: absolute; inset: 12%; border-radius: inherit;
  background:
    radial-gradient(ellipse at 35% 28%, rgba(255,255,255,0.22) 0%, transparent 55%),
    radial-gradient(ellipse at 62% 58%, rgba(255,255,255,0.14) 0%, transparent 48%);
  animation: fluidFlow 14s ease-in-out infinite;
  pointer-events: none;
}
@keyframes fluidFlow {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  33%     { transform: translate(2.5%,-1.5%) rotate(1.5deg); }
  66%     { transform: translate(-1.5%,2%) rotate(-1deg); }
}

/* 虹彩高光（模拟油膜折射） */
.iridescent-sheen {
  position: absolute; inset: 4%; border-radius: inherit;
  background:
    radial-gradient(ellipse at 28% 22%, rgba(255,255,255,0.28) 0%, transparent 42%),
    radial-gradient(ellipse at 72% 68%, rgba(255,255,255,0.18) 0%, transparent 38%);
  animation: sheenDrift 17s ease-in-out infinite;
  pointer-events: none;
}
@keyframes sheenDrift {
  0%   { transform: translate(0,0); opacity: 0.65; }
  28%  { transform: translate(3.5%,-2.5%); opacity: 0.88; }
  58%  { transform: translate(-2%,3%); opacity: 0.58; }
  100% { transform: translate(0,0); opacity: 0.65; }
}

/* 星尘 */
.stardust { position: absolute; inset: 8%; pointer-events: none; z-index: 2; }
.sd-p {
  position: absolute; font-size: 0.45em; color: rgba(255,255,255,0.55);
  animation: starFloat 5.5s ease-in-out infinite;
}
@keyframes starFloat {
  0%,100% { transform: translate(0,0); opacity: 0.25; }
  50%     { transform: translate(3px,-5px); opacity: 0.65; }
}

/* 文字 */
.bio-text { position: relative; z-index: 3; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1px; pointer-events: none; }
.bio-food { font-weight: 600; color: rgba(55,45,35,0.78); line-height: 1.2; text-shadow: 0 0 6px rgba(255,255,255,0.35); }
.bio-restaurant { font-size: 0.55em; color: rgba(95,80,65,0.55); text-shadow: 0 0 3px rgba(255,255,255,0.25); }
.bio-mine { position: absolute; top: 4px; right: 7px; font-size: 0.65em; color: rgba(255,210,120,0.8); z-index: 5; }

/* ====== 颜色方案 ====== */
/* 冰蓝 */ .color-ice    { --membrane-grad: radial-gradient(circle at 50% 50%, rgba(220,235,250,0.15) 0%, rgba(200,225,248,0.35) 55%, rgba(180,215,245,0.55) 82%, rgba(210,235,252,0.70) 100%); }
/* 银白 */ .color-silver { --membrane-grad: radial-gradient(circle at 50% 50%, rgba(245,245,248,0.15) 0%, rgba(235,235,242,0.35) 55%, rgba(225,225,235,0.55) 82%, rgba(240,240,245,0.70) 100%); }
/* 月光紫 */ .color-moon { --membrane-grad: radial-gradient(circle at 50% 50%, rgba(235,228,248,0.15) 0%, rgba(225,215,242,0.35) 55%, rgba(215,200,238,0.55) 82%, rgba(230,220,245,0.70) 100%); }
/* 淡粉 */ .color-rose  { --membrane-grad: radial-gradient(circle at 50% 50%, rgba(250,235,238,0.15) 0%, rgba(248,225,230,0.35) 55%, rgba(245,210,220,0.55) 82%, rgba(250,230,235,0.70) 100%); }
/* 浅金 */ .color-gold  { --membrane-grad: radial-gradient(circle at 50% 50%, rgba(252,248,235,0.15) 0%, rgba(250,242,225,0.35) 55%, rgba(245,232,210,0.55) 82%, rgba(250,242,228,0.70) 100%); }

.bubble-organism.mine {
  box-shadow: 0 0 6px rgba(255,215,120,0.30), 0 0 14px rgba(255,200,100,0.16);
}
</style>
