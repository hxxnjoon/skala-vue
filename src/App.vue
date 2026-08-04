<!--
  App.vue — 모든 페이지가 공유하는 뼈대
-->

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="shell">
    <!-- 내비게이션 바 — 모든 페이지에 공통으로 뜬다 -->
    <nav class="nav">
      <!--
        RouterLink 는 <a> 로 렌더링되지만 클릭 시 페이지를 새로고침하지 않는다.
        필요한 부분만 바꿔 그리므로 화면 전환이 즉각적이다.
      -->
      <RouterLink :to="{ name: 'home' }" class="brand">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          aria-hidden="true"
        >
          <path d="M7.5 18.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4 3.4 3.4 0 0 0 1.2 6.6Z" />
        </svg>
        날씨 대시보드
      </RouterLink>

      <div class="links">
        <!--
          RouterLink 는 현재 주소와 맞으면 자동으로 클래스를 붙여 준다.
        -->
        <RouterLink :to="{ name: 'home' }">대시보드</RouterLink>
        <RouterLink :to="{ name: 'about' }">서비스 소개</RouterLink>
      </div>
    </nav>

    <main class="main">
      <!--
        RouterView — 주소에 맞는 페이지 컴포넌트가 이 자리에 들어온다.
      -->
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.nav {
  position: sticky; /* 스크롤해도 상단에 붙어 있게 */
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-3);
  padding: 0 var(--gap-3);
  height: 56px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: var(--text);
  text-decoration: none;
}

.brand svg {
  width: 19px;
  height: 19px;
  color: var(--cool);
}

.links {
  display: flex;
  gap: 4px;
}

.links a {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  text-decoration: none;
  transition: all 0.18s var(--ease);
}

.links a:hover {
  background: var(--surface-sunken);
  color: var(--text);
}

/* 현재 보고 있는 페이지 표시 */
.links a.router-link-exact-active {
  background: var(--text);
  color: #fff;
}

.main {
  padding-bottom: var(--gap-5);
}

/* 페이지 전환 효과 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.18s var(--ease),
    transform 0.18s var(--ease);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
