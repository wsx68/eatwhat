<template>
  <div class="card" @click="$emit('click', food)">
    <div class="img-box">
      <img :src="food.image_url || ph" alt="" />
      <span class="price">¥{{ food.price }}</span>
    </div>
    <div class="body">
      <span class="name">{{ food.name }}</span>
      <div class="meta">
        <span class="rest">{{ food.restaurant_name }}</span>
        <span class="count">{{ food.checkin_count || 0 }} 人吃过</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ food: Object })
defineEmits(['click'])
const ph = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23F5F0EB' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='70' text-anchor='middle' dy='.3em' fill='%23E0D5C8'%3E🍽%3C/text%3E%3C/svg%3E"
</script>

<style scoped>
.card {
  background: #fff; border-radius: 16px; overflow: hidden; cursor: pointer;
  margin: 10px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:active { transform: scale(0.985); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.img-box { position: relative; height: 170px; overflow: hidden; background: #FBF9F6; }
.img-box img { width: 100%; height: 100%; object-fit: cover; }
.price {
  position: absolute; bottom: 10px; right: 10px;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);
  color: var(--c-primary); padding: 4px 12px; border-radius: 14px;
  font-size: 13px; font-weight: 700;
}
.body { padding: 12px 14px; }
.name { font-size: 15px; font-weight: 600; color: var(--c-text); display: block; margin-bottom: 6px; }
.meta { display: flex; justify-content: space-between; align-items: center; }
.rest { font-size: 12px; color: var(--c-text-s); }
.count { font-size: 11px; color: var(--c-primary); background: var(--c-primary-l); padding: 2px 10px; border-radius: 10px; font-weight: 500; }
</style>
