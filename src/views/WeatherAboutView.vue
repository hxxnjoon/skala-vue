<!--
  WeatherAboutView.vue — 서비스 소개 (정적 페이지)

  데이터를 불러오지 않고 고정된 내용만 보여 준다.
-->

<script setup>
import { RouterLink } from 'vue-router'

const FEATURES = [
  { title: '한글·초성 검색', desc: "'서울'은 물론 'ㅅㅇ'으로도 도시를 찾을 수 있습니다." },
  {
    title: '즐겨찾기',
    desc: '자주 보는 도시를 담아 두면 브라우저에 저장되어 다음에도 유지됩니다.',
  },
  { title: '섭씨 / 화씨 전환', desc: '목록·통계·상세 페이지가 항상 같은 단위로 표시됩니다.' },
  {
    title: '상세 관측 정보',
    desc: '습도·풍속·강수확률과 시간대별 기온 변화를 확인할 수 있습니다.',
  },
]

const STACK = ['Vue 3', 'Composition API', 'Vue Router', 'Vite']
</script>

<template>
  <div class="page">
    <header class="head">
      <p class="eyebrow">About</p>
      <h1>서비스 소개</h1>
      <p class="lead">
        Vue 3 학습용으로 만든 날씨 대시보드입니다. 실제 기상 API 대신 Mock 데이터를 사용하며,
        컴포넌트 분리와 라우팅 구조를 연습하기 위해 작성했습니다.
      </p>
    </header>

    <section class="panel">
      <h2 class="panel-title">주요 기능</h2>
      <ul class="features">
        <li v-for="feature in FEATURES" :key="feature.title">
          <strong>{{ feature.title }}</strong>
          <span>{{ feature.desc }}</span>
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2 class="panel-title">사용 기술</h2>
      <div class="stack">
        <span v-for="tech in STACK" :key="tech" class="chip">{{ tech }}</span>
      </div>
      <p class="note">
        데이터는 <code>src/data/weather.js</code> 의 Mock 배열이며, 실제 관측값이 아닙니다.
      </p>
    </section>

    <!--
      RouterLink 를 버튼처럼 꾸몄다.
      화면 이동은 <a> 로 만들어야 새 탭으로 열기·주소 복사가 정상 동작한다.
      router.push 는 저장 후 이동처럼 코드 흐름에서 옮겨야 할 때 쓴다.
    -->
    <RouterLink :to="{ name: 'home' }" class="cta">← 대시보드로 돌아가기</RouterLink>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--gap-4) var(--gap-3);
  display: flex;
  flex-direction: column;
  gap: var(--gap-3);
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
}

h1 {
  margin: 2px 0 var(--gap-2);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.lead {
  margin: 0;
  font-size: 14px;
  color: var(--text-dim);
  line-height: 1.7;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: var(--gap-3);
  box-shadow: var(--shadow-1);
}

.panel-title {
  margin: 0 0 var(--gap-3);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dim);
}

.features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--gap-2);
}

.features li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--gap-2) var(--gap-3);
  background: var(--surface-sunken);
  border-radius: var(--r-md);
}

.features strong {
  font-size: 14px;
}

.features span {
  font-size: 13px;
  color: var(--text-dim);
}

.stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-1);
}

.chip {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--cool-soft);
  color: var(--cool);
}

.note {
  margin: var(--gap-3) 0 0;
  font-size: 12px;
  color: var(--text-faint);
}

.note code {
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 1px 5px;
}

.cta {
  align-self: flex-start;
  padding: 9px 18px;
  border-radius: var(--r-sm);
  background: var(--text);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
</style>
