<!--
  WeatherDetailView.vue — 도시별 상세 기상관측 페이지 (/weather/:cityId)

  이전 버전에서 달라진 점
    · unit ref 와 단위 토글 버튼 제거 → 내비게이션 바의 UnitToggler 하나로 통합
    · ?unit= 쿼리 읽기/쓰기 제거      → 스토어가 전역이므로 주소로 전달할 필요가 없음
    · 즐겨찾기 버튼 추가              → favoritesStore 덕분에 대시보드와 상태를 공유

  단위 변경 시 현재 기온·체감온도·시간대별 그래프가 모두 함께 바뀐다.
  세 곳이 같은 Composable 을 쓰므로 한쪽만 섭씨로 남는 일이 발생하지 않는다.
-->

<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useTemperature } from '../composables/useTemperature.js'
import { useFavoritesStore } from '../stores/favoritesStore.js'
import { isHot } from '../utils/temperature.js'
import { withJosa } from '../utils/korean.js'
import { fetchCityById } from '../api/weatherApi.js'
/**
 * useRoute()  → 현재 주소를 읽는다 (params, query)
 * useRouter() → 주소를 바꾼다 (push, replace, back)
 */
const route = useRoute()
const router = useRouter()

const { toDisplay, format: showTemp } = useTemperature()
const favoritesStore = useFavoritesStore()

const city = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

/** 주소의 cityId 로 도시를 찾는다 */
const loadCity = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    city.value = await fetchCityById(route.params.cityId)
  } catch (error) {
    city.value = null
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

// Mount 시점에 Mock Data 에서 도시 객체를 선택한다
onMounted(loadCity)

/**
 * 같은 페이지에 머문 채 cityId 만 바뀌는 경우를 처리한다.
 * 라우터는 같은 컴포넌트를 재사용하므로 onMounted 가 다시 실행되지 않는다.
 * 이 감시가 없으면 주소만 바뀌고 화면은 그대로 남는다.
 */
watch(() => route.params.cityId, loadCity)

/* ── 표시용 파생 값 ───────────────────────── */
const hot = computed(() => (city.value ? isHot(city.value.temp) : false))
const isFavorite = computed(() => (city.value ? favoritesStore.has(city.value.id) : false))

/** 시간대별 기온을 막대 높이(%)로 변환. 최저~최고를 20~100% 구간에 대응시킨다. */
const hourlyBars = computed(() => {
  if (!city.value) return []

  const temps = city.value.hourly.map((item) => item.temp)
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const span = max - min || 1 // 값이 모두 같으면 0으로 나누게 되므로 방어

  return city.value.hourly.map((item) => ({
    label: item.label,
    temp: item.temp,
    height: 20 + Math.round(((item.temp - min) / span) * 80),
  }))
})

/** 미세먼지 등급별 색 구분 */
const dustTone = computed(() => {
  if (!city.value) return 'ok'
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

/* ── 동작 ─────────────────────────────────── */

/**
 * router.back() 대신 push 를 쓴다.
 * 주소를 직접 입력해 들어온 경우 back() 은 이 사이트 밖으로 나가 버린다.
 */
const goHome = () => router.push({ name: 'home' })

const onToggleFavorite = () => {
  if (!city.value) return
  favoritesStore.toggle(city.value.id)
}
</script>

<template>
  <div class="page">
    <!-- 로딩 -->
    <div v-if="isLoading" class="panel skeleton-panel" aria-busy="true">
      <div class="sk w30"></div>
      <div class="sk w60 tall"></div>
      <div class="sk w80"></div>
    </div>

    <!-- 도시를 찾지 못한 경우 -->
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
            {{ city.description || city.status }} · 체감 {{ showTemp(city.feelsLike) }}
            <span class="tag" :class="hot ? 'hot' : 'cool'">
              {{ city.temp >= 25 ? '더움 (25도 이상)' : '선선함 (25도 미만)' }}
            </span>
          </p>
        </div>

        <!-- 즐겨찾기 상태가 대시보드와 공유된다 -->
        <button
          type="button"
          class="fav"
          :class="{ on: isFavorite }"
          :aria-pressed="isFavorite"
          @click="onToggleFavorite"
        >
          <svg
            viewBox="0 0 24 24"
            :fill="isFavorite ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" />
          </svg>
          {{ isFavorite ? '즐겨찾기 해제' : '즐겨찾기' }}
        </button>
      </header>

      <section class="panel hero" :class="hot ? 'hot' : 'cool'">
        <p class="hero-label">현재 기온</p>
        <p class="hero-temp tnum">{{ showTemp(city.temp) }}</p>
        <p class="hero-note">{{ withJosa(city.name, '은/는') }} 지금 {{ city.status }}입니다.</p>
      </section>

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

      <section class="panel">
        <h2 class="panel-title">시간대별 기온</h2>
        <div class="chart">
          <!-- 막대 위 숫자도 같은 Composable 로 변환하므로 단위가 어긋나지 않는다 -->
          <div v-for="bar in hourlyBars" :key="bar.label" class="bar-col">
            <span class="bar-value tnum">{{ toDisplay(bar.temp) }}°</span>
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
  flex-wrap: wrap;
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

.fav {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-dim);
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.18s var(--ease);
}

.fav svg {
  width: 14px;
  height: 14px;
}

.fav:hover {
  border-color: var(--star);
  color: var(--star);
}

.fav.on {
  background: var(--star);
  border-color: var(--star);
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
