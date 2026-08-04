<!--
  NotFoundView.vue — 정의되지 않은 경로로 들어왔을 때 보여 주는 화면

  라우터의 Catch-all Route(/:pathMatch(.*)*) 가 여기로 보낸다.
  주소를 잘못 입력했거나, 삭제된 링크를 눌렀을 때 빈 화면 대신 안내를 띄운다.
-->

<script setup>
import { useRoute, RouterLink } from 'vue-router'

const route = useRoute()
// 사용자가 어떤 주소로 들어왔는지 보여 주면 오타를 스스로 알아채기 쉽다
</script>

<template>
  <div class="page">
    <p class="code">404</p>
    <h1>페이지를 찾을 수 없습니다</h1>
    <p class="desc">
      요청하신 주소 <code>{{ route.fullPath }}</code> 에 해당하는 페이지가 없습니다.<br />
      주소를 다시 확인해 주세요.
    </p>

    <div class="actions">
      <RouterLink :to="{ name: 'home' }" class="primary">대시보드로 가기</RouterLink>
      <RouterLink :to="{ name: 'about' }" class="ghost">서비스 소개</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 520px;
  margin: 0 auto;
  padding: var(--gap-5) var(--gap-3);
  text-align: center;
}

.code {
  margin: 0;
  font-size: 64px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--line-strong);
}

h1 {
  margin: var(--gap-2) 0 var(--gap-2);
  font-size: 22px;
  font-weight: 700;
}

.desc {
  margin: 0 0 var(--gap-4);
  font-size: 14px;
  color: var(--text-dim);
  line-height: 1.7;
}

.desc code {
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: var(--gap-2);
  justify-content: center;
}

.primary,
.ghost {
  padding: 9px 18px;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.primary {
  background: var(--text);
  color: #fff;
}

.ghost {
  background: var(--surface);
  border: 1px solid var(--line-strong);
  color: var(--text-dim);
}
</style>
