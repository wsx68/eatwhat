<template>
  <div class="app-root">
    <!-- 桌面端：顶部导航栏 -->
    <header class="top-bar">
      <div class="tb-brand" @click="$router.push('/')">
        <span class="tb-logo">🍽️</span>
        <span class="tb-name">吃啥</span>
      </div>
      <nav class="tb-nav">
        <router-link to="/" class="tb-link" active-class="tb-on" exact>首页</router-link>
        <router-link to="/catalog" class="tb-link" active-class="tb-on">美食广场</router-link>
        <router-link to="/checkin" class="tb-link" active-class="tb-on">转盘</router-link>
        <router-link to="/mine" class="tb-link" active-class="tb-on">我的</router-link>
      </nav>
    </header>

    <!-- 主内容 -->
    <main class="main">
      <router-view v-slot="{ Component }">
        <keep-alive include="Home">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <!-- 移动端底部 Tab -->
    <nav class="tab-bar">
      <router-link to="/" class="tab" active-class="on" exact>
        <span class="t-icon">🏠</span><span class="t-label">首页</span>
      </router-link>
      <router-link to="/catalog" class="tab" active-class="on">
        <span class="t-icon">🍔</span><span class="t-label">美食</span>
      </router-link>
      <router-link to="/checkin" class="tab" active-class="on">
        <span class="t-icon">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="13" cy="13" r="11" fill="#F0E0D0" stroke="#C8B090" stroke-width="1.5"/>
            <path d="M13 3C10 5 7 7 5 10S4 15 6 18S11 22 13 22S18 20 20 17S22 10 20 7S16 3 13 3Z" fill="#E8C8B0" opacity="0.6"/>
            <circle cx="13" cy="13" r="3" fill="#C8A890"/>
          </svg>
        </span>
        <span class="t-label">转盘</span>
      </router-link>
      <router-link to="/mine" class="tab" active-class="on">
        <span class="t-icon">🙂</span><span class="t-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style>
:root {
  --c-primary:   #E8A090; --c-primary-s: #F5D0C0; --c-primary-l: #FDF3EC;
  --c-accent:    #A8BF9E; --c-accent-l:  #EDF4EA;
  --c-bg:        #FFFBF5; --c-surface:   #FFFFFF; --c-cream:     #FFF8ED;
  --c-text:      #5C4A3A; --c-text-s:    #9B8B7A; --c-text-t:    #C4B8A8;
  --c-border:    #F0E8DB;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #F0EDE8; color: var(--c-text); font-size: 14px; line-height: 1.6;
  -webkit-font-smoothing: antialiased; overscroll-behavior: none;
}
::-webkit-scrollbar { width: 0; height: 0; }
</style>

<style scoped>
.app-root { min-height: 100vh; background: var(--c-bg); }

/* 顶部导航栏 — 默认隐藏（移动端） */
.top-bar { display: none; }

/* 主内容 */
.main { min-height: 100vh; padding-bottom: 64px; }

/* 移动端底部 Tab */
.tab-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-around;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--c-border);
  padding: 6px 0 max(6px, env(safe-area-inset-bottom)); z-index: 900;
}
.tab {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  text-decoration: none; color: var(--c-text-t); font-size: 10px;
  padding: 4px 16px; transition: all 0.25s; min-width: 56px;
}
.tab.on { color: var(--c-primary); }
.t-icon { font-size: 22px; line-height: 1; transition: transform 0.25s; }
.tab.on .t-icon { transform: translateY(-2px); }
.t-label { font-size: 10px; font-weight: 500; letter-spacing: 0.5px; }

/* ======== 桌面端 >= 768px ======== */
@media (min-width: 768px) {
  .top-bar {
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 800;
    background: rgba(255,255,255,0.88); backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--c-border);
    padding: 0 32px; height: 56px;
  }
  .tb-brand { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
  .tb-logo { font-size: 24px; }
  .tb-name { font-size: 18px; font-weight: 700; color: var(--c-text); }
  .tb-nav { display: flex; align-items: center; gap: 4px; }
  .tb-link {
    padding: 8px 18px; border-radius: 10px; text-decoration: none;
    color: var(--c-text-s); font-size: 14px; font-weight: 500; transition: all 0.15s;
  }
  .tb-link:hover { color: var(--c-text); background: #fafaf8; }
  .tb-link.tb-on { color: var(--c-primary); background: var(--c-primary-l); font-weight: 600; }

  .main { padding-bottom: 0; padding-top: 0; }
  .tab-bar { display: none; }
}
</style>
