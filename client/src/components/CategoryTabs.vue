<template>
  <div class="tabs-wrap">
    <div class="tabs" style="overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;">
      <span
        v-for="cat in categories" :key="cat"
        class="tab" :class="{ active: currentCategory === cat }"
        @click="$emit('change', cat)"
      >{{ cat }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({ categories: Array, currentCategory: String })
defineEmits(['change'])
</script>

<style scoped>
.tabs-wrap { background: #fff; border-bottom: 1px solid #f0f0f0; }
.tabs { padding: 8px 12px; }
.tab {
  display: inline-block; padding: 6px 14px; margin: 0 2px;
  border-radius: 16px; font-size: 13px; color: #666; cursor: pointer; transition: all 0.2s;
}
.tab.active { background: #FFF0F0; color: #FF6B6B; font-weight: bold; }
</style>
