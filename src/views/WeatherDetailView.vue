<!--
  WeatherDetailView.vue — 도시별 상세 기상관측 페이지

  주소: /weather/:cityId   (예: /weather/city_06)

  라우터에서 :cityId 로 잡아 둔 값을 route.params.cityId 로 꺼내
  Mount 시점에 Mock Data 에서 해당 도시를 찾아 표시한다.
-->

<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { fetchCityById } from '../data/weather.js'
import { formatTemp, isHot, toDisplayTemp } from '../utils/temperature.js'
import { withJosa } from '../utils/korean.js'

/**
 * useRoute()  → 현재 주소 정보를 읽는다 (params, query, path)
 * useRouter() → 주소를 바꾼다 (push, replace, back)
 *
 * route 는 지금 어디에 있나, router 는 어디로 갈까를 담당한다.
 */
const route = useRoute()
const router = useRouter()

const city = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * 단위는 홈에서 query 로 넘겨받는다. (/weather/city_06?unit=F)
 * 이렇게 하면 상세 페이지에서 새로고침해도 단위가 유지되고,
 * 링크를 그대로 공유해도 같은 화면이 재현된다.
 */
const unit = ref(route.query.unit === 'F' ? 'F' : 'C')

/** 주소에서 도시 id 를 꺼내 데이터를 찾는다 */
const loadCity = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    city.value = await fetchCityById(route.params.cityId)
  } catch {
    city.value = null
    errorMessage.value = `'${route.params.cityId}' 에 해당하는 도시를 찾을 수 없습니다.`
  } finally {
    isLoading.value = false
  }
}

// 과제 요구사항 4 — Mount 시점에 Mock Data 에서 도시 객체를 선택한다
onMounted(loadCity)

/**
 * 같은 페이지에 머문 채 cityId 만 바뀌는 경우(아래 '다른 도시 보기' 버튼)를 대비한다.
 *
 * 라우터는 같은 컴포넌트를 재사용하므로 onMounted 가 다시 실행되지 않는다.
 */
watch(() => route.params.cityId, loadCity)

/* ── 표시용 파생 값 ───────────────────────── */
const showTemp = (celsius) => formatTemp(celsius, unit.value)
const hot = computed(() => (city.value ? isHot(city.value.temp) : false))

/** 시간대별 기온을 막대 높이(%)로 바꾼다. 최저~최고 구간을 20~100% 에 대응. */
const hourlyBars = computed(() => {
  if (!city.value) return []

  const temps = city.value.hourly
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const span = max - min || 1 // 전부 같은 값이면 0으로 나누게 되므로 방어

  return temps.map((temp, index) => ({
    label: `${(index + 1) * 3}시`,
    temp,
    height: 20 + Math.round(((temp - min) / span) * 80),
  }))
})

/** 미세먼지 등급에 따라 색을 다르게 준다 */
const dustTone = computed(() => {
  if (!city.value) return 'cool'
  if (city.value.dust === '나쁨') return 'hot'
  if (city.value.dust === '보통') return 'warn'
  return 'ok'
})

/* ── 탭 제목 ──────────────────────────────── */
watchEffect(() => {
  if (isLoading.value) {
    document.title = '불러오는 중… · 날씨 대시보드'
  } else if (city.value) {
    document.title = `${city.value.name} ${showTemp(city.value.temp)} · 상세`
  } else {
    document.title = '도시를 찾을 수 없음 · 날씨 대시보드'
  }
})

/* ── 이동 ─────────────────────────────────── */

/**
 * 목록으로 돌아가기.
 * router.back() 은 브라우저 뒤로 가기와 같아서, 주소를 직접 입력해 들어온 경우
 * 엉뚱한 사이트로 나가 버릴 수 있다. 항상 홈으로 가도록 push 를 쓴다.
 */
const goHome = () => router.push({ name: 'home' })

/**
 * 단위를 바꾸면 주소의 query 도 함께 갱신한다.
 * replace 를 쓰는 이유: push 를 쓰면 단위를 토글할 때마다 히스토리가 쌓여
 * 뒤로 가기를 여러 번 눌러야 목록으로 돌아가게 된다.
 */
const setUnit = (next) => {
  unit.value = next
  router.replace({ query: { ...route.query, unit: next } })
}
const setUnitC = () => setUnit('C')
const setUnitF = () => setUnit('F')
</script>

<template>
  <div class="page">
    <!-- 로딩 -->
    <div v-if="isLoading" class="panel skeleton-panel" aria-busy="true">
      <div class="sk w30"></div>
      <div class="sk w60 tall"></div>
      <div class="sk w80"></div>
    </div>

    <!-- 도시를 못 찾은 경우 -->
    <div v-else-if="errorMessage" class="panel notice">
      <p class="notice-title">도시를 찾을 수 없습니다</p>
      <p class="notice-body">{{ errorMessage }}</p>
      <button type="button" class="primary" @click="goHome">대시보드로 돌아가기</button>
    </div>

    <!-- 정상 -->
    <template v-else-if="city">
      <header class="head">
        <div>
          <button type="button" class="back" @click="goHome">← 대시보드</button>
          <h1>{{ city.name }}</h1>
          <p class="sub">
            {{ city.status }} · 체감 {{ showTemp(city.feelsLike) }}
            <span class="tag" :class="hot ? 'hot' : 'cool'">
              {{ city.temp >= 25 ? '더움 (25도 이상)' : '선선함 (25도 미만)' }}
            </span>
          </p>
        </div>

        <div class="unit" role="group" aria-label="온도 단위 전환">
          <button type="button" :class="{ on: unit === 'C' }" @click="setUnitC">°C</button>
          <button type="button" :class="{ on: unit === 'F' }" @click="setUnitF">°F</button>
        </div>
      </header>

      <!-- 현재 기온 -->
      <section class="panel hero" :class="hot ? 'hot' : 'cool'">
        <p class="hero-label">현재 기온</p>
        <p class="hero-temp tnum">{{ showTemp(city.temp) }}</p>
        <p class="hero-note">{{ withJosa(city.name, '은/는') }} 지금 {{ city.status }}입니다.</p>
      </section>

      <!-- 관측 정보 -->
      <section class="panel">
        <h2 class="panel-title">관측 정보</h2>
        <dl class="specs">
          <div class="spec">
            <dt>습도</dt>
            <dd class="tnum">{{ city.humidity }}%</dd>
          </div>
          <div class="spec">
            <dt>풍속</dt>
            <dd class="tnum">{{ city.wind }} m/s</dd>
          </div>
          <div class="spec">
            <dt>강수확률</dt>
            <dd class="tnum">{{ city.rainChance }}%</dd>
          </div>
          <div class="spec">
            <dt>미세먼지</dt>
            <dd :class="dustTone">{{ city.dust }}</dd>
          </div>
          <div class="spec">
            <dt>일출</dt>
            <dd class="tnum">{{ city.sunrise }}</dd>
          </div>
          <div class="spec">
            <dt>일몰</dt>
            <dd class="tnum">{{ city.sunset }}</dd>
          </div>
        </dl>
      </section>

      <!-- 시간대별 기온 -->
      <section class="panel">
        <h2 class="panel-title">시간대별 기온</h2>
        <div class="chart">
          <div v-for="bar in hourlyBars" :key="bar.label" class="bar-col">
            <span class="bar-value tnum">{{ toDisplayTemp(bar.temp, unit) }}°</span>
            <div
              class="bar"
              :class="bar.temp >= 25 ? 'hot' : 'cool'"
              :style="{ height: bar.height + '%' }"
            ></div>
            <span class="bar-label">{{ bar.label }}</span>
          </div>
        </div>
      </section>
    </template>
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

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gap-3);
}

.back {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-faint);
}

.back:hover {
  color: var(--text);
}

h1 {
  margin: 4px 0 2px;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: var(--gap-2);
}

.tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
}

.tag.hot {
  background: var(--hot-soft);
  color: var(--hot);
}

.tag.cool {
  background: var(--cool-soft);
  color: var(--cool);
}

.unit {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px;
  flex-shrink: 0;
}

.unit button {
  border: 0;
  background: transparent;
  color: var(--text-dim);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.unit button.on {
  background: var(--text);
  color: #fff;
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

/* 현재 기온 강조 영역 */
.hero {
  text-align: center;
  padding: var(--gap-4) var(--gap-3);
}

.hero.hot {
  background: var(--hot-soft);
  border-color: #f4c9ba;
}

.hero.cool {
  background: var(--cool-soft);
  border-color: #c2d6f2;
}

.hero-label {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}

.hero-temp {
  margin: 4px 0;
  font-size: 56px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
}

.hero.hot .hero-temp {
  color: var(--hot);
}

.hero.cool .hero-temp {
  color: var(--cool);
}

.hero-note {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
}

/* 관측 정보 */
.specs {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
}

.spec {
  background: var(--surface-sunken);
  padding: var(--gap-2) var(--gap-3);
}

.spec dt {
  font-size: 11px;
  color: var(--text-faint);
}

.spec dd {
  margin: 2px 0 0;
  font-size: 16px;
  font-weight: 700;
}

.spec dd.hot {
  color: var(--hot);
}

.spec dd.warn {
  color: #a8630b;
}

.spec dd.ok {
  color: var(--ok);
}

/* 시간대별 막대 */
.chart {
  display: flex;
  align-items: flex-end;
  gap: var(--gap-2);
  height: 150px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 4px;
}

.bar-value {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
}

.bar {
  width: 100%;
  border-radius: var(--r-sm) var(--r-sm) 0 0;
  transition: height 0.4s var(--ease);
}

.bar.hot {
  background: var(--hot);
}

.bar.cool {
  background: var(--cool);
}

.bar-label {
  font-size: 11px;
  color: var(--text-faint);
}

/* 로딩 · 에러 */
.skeleton-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-2);
}

.sk {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--surface-sunken), var(--line), var(--surface-sunken));
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite linear;
}

.sk.tall {
  height: 44px;
}

.w30 {
  width: 30%;
}

.w60 {
  width: 60%;
}

.w80 {
  width: 80%;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

.notice {
  text-align: center;
  border-style: dashed;
}

.notice-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--hot);
}

.notice-body {
  margin: 0 0 var(--gap-3);
  font-size: 13px;
  color: var(--text-dim);
}

.primary {
  border: 1px solid var(--text);
  background: var(--text);
  color: #fff;
  padding: 8px 18px;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 600;
}
</style>
