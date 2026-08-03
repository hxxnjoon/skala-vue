<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { withJosa } from '../utils/korean.js'

/* ────────────────────────────────────────────────
   요구사항 1 — 반응형 상태 정의
   ──────────────────────────────────────────────── */
const weatherList = ref([])
const searchQuery = ref('')
const selectedCityInfo = ref('')

// 선택된 카드를 시각적으로 표시하기 위한 id
const selectedCityId = ref(null)

// 빠뜨리기 쉬운 상태 3가지: 로딩 / 에러 / 빈 결과
const isLoading = ref(false)
const errorMessage = ref('')

// 추가 기능: 단위 전환, 필터, 정렬
const unit = ref('C') // 'C' | 'F'
const tempFilter = ref('all') // 'all' | 'hot' | 'cool'
const sortKey = ref('temp-desc') // 'temp-desc' | 'temp-asc' | 'name'

/* ────────────────────────────────────────────────
   가짜 API — 로딩·에러 상태를 실제로 확인하기 위한 장치
   ──────────────────────────────────────────────── */
const MOCK_DATA = [
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '인천', temp: 24, status: '흐림' },
  { id: 'city_03', name: '수원', temp: 24, status: '비' },
  { id: 'city_04', name: '강릉', temp: 22, status: '구름' },
  { id: 'city_05', name: '대전', temp: 27, status: '맑음' },
  { id: 'city_06', name: '대구', temp: 31, status: '맑음' },
  { id: 'city_07', name: '광주', temp: 29, status: '구름' },
  { id: 'city_08', name: '부산', temp: 26, status: '구름' },
  { id: 'city_09', name: '제주', temp: 25, status: '비' },
]

const fetchWeather = async ({ shouldFail = false } = {}) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    await new Promise((resolve) => setTimeout(resolve, 700))
    if (shouldFail) throw new Error('NETWORK')
    weatherList.value = MOCK_DATA
  } catch {
    weatherList.value = []
    errorMessage.value = '날씨 정보를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchWeather())

/* ────────────────────────────────────────────────
   요구사항 2 — computed로 검색·필터·정렬 결과 만들기
   ──────────────────────────────────────────────── */
const filteredWeatherList = computed(() => {
  const keyword = searchQuery.value.trim()

  let result = weatherList.value

  // 검색어가 비었을 때는 원본 데이터를 그대로
  if (keyword !== '') {
    result = result.filter((city) => city.name.includes(keyword))
  }

  if (tempFilter.value === 'hot') {
    result = result.filter((city) => city.temp >= 25)
  } else if (tempFilter.value === 'cool') {
    result = result.filter((city) => city.temp < 25)
  }

  // 원본 배열을 건드리지 않도록 복사한 뒤 정렬
  return [...result].sort((a, b) => {
    if (sortKey.value === 'temp-asc') return a.temp - b.temp
    if (sortKey.value === 'name') return a.name.localeCompare(b.name, 'ko')
    return b.temp - a.temp
  })
})

// 요약 통계 — 화면에 보이는 목록 기준으로 계산
const summary = computed(() => {
  const list = filteredWeatherList.value
  if (list.length === 0) return null

  const temps = list.map((city) => city.temp)
  const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length

  return {
    count: list.length,
    avg: Math.round(avg * 10) / 10,
    max: Math.max(...temps),
    min: Math.min(...temps),
  }
})

const hasKeyword = computed(() => searchQuery.value.trim() !== '')
const isEmptyResult = computed(
  () => !isLoading.value && !errorMessage.value && filteredWeatherList.value.length === 0,
)

/* ────────────────────────────────────────────────
   요구사항 3 — watch / watchEffect
   ──────────────────────────────────────────────── */

// watch: 지정한 값이 "바뀐 순간"에만 실행되고, 이전 값도 받을 수 있다.
watch(selectedCityInfo, (newValue, oldValue) => {
  console.log(
    `👀 [watch 감지] 상태 바 문구가 업데이트되었습니다 → "${newValue}" (이전: "${oldValue}")`,
  )
})

// 단위를 바꿨을 때 화면 전체가 같은 단위로 도는지 확인하는 로그
watch(unit, (newUnit) => {
  console.log(`🌡️ [watch 감지] 표시 단위가 ${newUnit === 'C' ? '섭씨' : '화씨'}로 바뀌었습니다.`)
})

// watchEffect: 함수 안에서 읽은 반응형 값을 Vue가 알아서 추적한다.
// 감시 대상을 적지 않는 대신, 컴포넌트가 뜨는 순간 한 번 즉시 실행된다.
watchEffect(() => {
  console.log(
    `👁️ [watchEffect 자동 호출] 현재 검색어 '${searchQuery.value}'에 해당하는 데이터를 필터링합니다. (결과 ${filteredWeatherList.value.length}건)`,
  )
})

/* ────────────────────────────────────────────────
   표시 로직 — 단위 변환은 이 함수 하나만 거치게 한다.
   (목록·통계·alert 어디서든 같은 결과가 나오도록)
   ──────────────────────────────────────────────── */
const toDisplayTemp = (celsius) =>
  unit.value === 'C' ? celsius : Math.round((celsius * 9) / 5 + 32)

const formatTemp = (celsius) => `${toDisplayTemp(celsius)}°${unit.value}`

// 온도를 0~100% 게이지로 변환 (10℃~35℃ 구간을 기준으로)
const gaugePercent = (celsius) => {
  const ratio = ((celsius - 10) / 25) * 100
  return Math.min(100, Math.max(6, Math.round(ratio)))
}

const isHot = (celsius) => celsius >= 25

// 검색어와 일치하는 부분을 강조하기 위해 이름을 조각내는 함수
const highlightParts = (name) => {
  const keyword = searchQuery.value.trim()
  if (keyword === '') return [{ text: name, match: false }]

  const parts = []
  let cursor = 0

  while (cursor < name.length) {
    const found = name.indexOf(keyword, cursor)
    if (found === -1) {
      parts.push({ text: name.slice(cursor), match: false })
      break
    }
    if (found > cursor) parts.push({ text: name.slice(cursor, found), match: false })
    parts.push({ text: keyword, match: true })
    cursor = found + keyword.length
  }

  return parts.filter((part) => part.text !== '')
}

// 날씨 상태 아이콘 (이모지 대신 SVG로 그려 크기·색을 CSS로 제어)
const ICON_PATHS = {
  맑음: [
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
    'M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  ],
  구름: ['M7.5 18.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4 3.4 3.4 0 0 0 1.2 6.6Z'],
  흐림: ['M8.5 15.5h8a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.5 1.3 3 3 0 0 0 1.2 5.7Z', 'M6 19h12'],
  비: [
    'M7.5 15.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4 3.4 3.4 0 0 0 1.2 6.6Z',
    'M9 18.5l-1 2.5M13 18.5l-1 2.5M17 18.5l-1 2.5',
  ],
  눈: [
    'M7.5 15.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4 3.4 3.4 0 0 0 1.2 6.6Z',
    'M9.5 19.5h.01M13 19.5h.01M16.5 19.5h.01',
  ],
}
const iconPaths = (status) => ICON_PATHS[status] ?? ICON_PATHS['구름']

/* ────────────────────────────────────────────────
   요구사항 4 — 이벤트
   ──────────────────────────────────────────────── */
const onInput = (event) => {
  searchQuery.value = event.target.value
}

const clearSearch = () => {
  searchQuery.value = ''
}

const resetFilters = () => {
  searchQuery.value = ''
  tempFilter.value = 'all'
}

const selectCity = (city) => {
  selectedCityId.value = city.id
  // 받침 유무에 맞는 조사를 붙인다 → "대구가 선택되었습니다"
  selectedCityInfo.value = `${withJosa(city.name, '이/가')} 선택되었습니다.`
}

const clearSelection = () => {
  selectedCityId.value = null
  selectedCityInfo.value = ''
}

// .stop 으로 카드 클릭까지 함께 실행되는 것(버블링)을 막는다.
const showDetail = (city) => {
  window.alert(
    `${city.name}의 현재 날씨는 [${city.status}] 상태입니다.\n현재 기온: ${formatTemp(city.temp)}`,
  )
}
</script>

<template>
  <div class="page">
    <!-- 헤더 -->
    <header class="head">
      <div class="head-text">
        <p class="eyebrow">Composition API</p>
        <h1>과제 2 · 날씨</h1>
      </div>

      <!-- 단위 전환: 카드·통계·상세보기 모두 같은 값을 쓴다 -->
      <div class="unit" role="group" aria-label="온도 단위 전환">
        <button
          type="button"
          :class="{ on: unit === 'C' }"
          :aria-pressed="unit === 'C'"
          @click="unit = 'C'"
        >
          °C
        </button>
        <button
          type="button"
          :class="{ on: unit === 'F' }"
          :aria-pressed="unit === 'F'"
          @click="unit = 'F'"
        >
          °F
        </button>
      </div>
    </header>

    <!-- 검색 · 필터 · 정렬 -->
    <section class="panel">
      <label class="field">
        <span class="label">도시 검색</span>
        <span class="input-wrap">
          <input
            type="text"
            placeholder="도시 이름을 한글로 입력하세요"
            :value="searchQuery"
            @input="onInput"
          />
          <button
            v-if="hasKeyword"
            type="button"
            class="clear"
            aria-label="검색어 지우기"
            @click="clearSearch"
          >
            ×
          </button>
        </span>
      </label>

      <p class="echo">
        검색 중인 도시:
        <strong v-if="hasKeyword">{{ searchQuery }}</strong>
        <em v-else>입력 없음 — 전체 도시를 보여주는 중</em>
      </p>

      <div class="controls">
        <div class="chips" role="group" aria-label="기온 필터">
          <button type="button" :class="{ on: tempFilter === 'all' }" @click="tempFilter = 'all'">
            전체
          </button>
          <button type="button" :class="{ on: tempFilter === 'hot' }" @click="tempFilter = 'hot'">
            더움 25↑
          </button>
          <button type="button" :class="{ on: tempFilter === 'cool' }" @click="tempFilter = 'cool'">
            선선함 25↓
          </button>
        </div>

        <label class="sort">
          <span class="sr-only">정렬 기준</span>
          <select v-model="sortKey">
            <option value="temp-desc">기온 높은 순</option>
            <option value="temp-asc">기온 낮은 순</option>
            <option value="name">이름 순</option>
          </select>
        </label>
      </div>
    </section>

    <!-- 요약 통계 -->
    <section v-if="summary && !isLoading" class="summary">
      <div class="stat">
        <span class="stat-label">표시 중</span>
        <span class="stat-value tnum">{{ summary.count }}곳</span>
      </div>
      <div class="stat">
        <span class="stat-label">평균</span>
        <span class="stat-value tnum">{{ formatTemp(summary.avg) }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">최고</span>
        <span class="stat-value tnum hot">{{ formatTemp(summary.max) }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">최저</span>
        <span class="stat-value tnum cool">{{ formatTemp(summary.min) }}</span>
      </div>
    </section>

    <!-- 목록 -->
    <section class="list-area">
      <h2 class="section-title">지역별 날씨 현황</h2>

      <!-- 상태 1: 로딩 (스켈레톤) -->
      <div v-if="isLoading" class="grid" aria-busy="true">
        <div v-for="n in 6" :key="n" class="skeleton">
          <div class="sk-line w40"></div>
          <div class="sk-line w70 tall"></div>
          <div class="sk-bar"></div>
          <div class="sk-line w50"></div>
        </div>
      </div>

      <!-- 상태 2: 에러 -->
      <div v-else-if="errorMessage" class="notice error">
        <p class="notice-title">불러오기 실패</p>
        <p class="notice-body">{{ errorMessage }}</p>
        <button type="button" class="retry" @click="fetchWeather()">다시 시도</button>
      </div>

      <!-- 상태 3: 빈 결과 -->
      <div v-else-if="isEmptyResult" class="notice empty">
        <p class="notice-title">
          <template v-if="hasKeyword">'{{ searchQuery }}'와 일치하는 도시가 없습니다</template>
          <template v-else>조건에 맞는 도시가 없습니다</template>
        </p>
        <p class="notice-body">검색어를 지우거나 기온 필터를 넓혀 보세요.</p>
        <button type="button" class="retry" @click="resetFilters">조건 초기화</button>
      </div>

      <!-- 정상 목록 -->
      <div v-else class="grid">
        <article
          v-for="city in filteredWeatherList"
          :key="city.id"
          class="card"
          :class="{ selected: selectedCityId === city.id }"
          tabindex="0"
          role="button"
          :aria-pressed="selectedCityId === city.id"
          @click="selectCity(city)"
          @keydown.enter="selectCity(city)"
          @keydown.space.prevent="selectCity(city)"
        >
          <div class="card-top">
            <h3 class="city">
              <span
                v-for="(part, i) in highlightParts(city.name)"
                :key="i"
                :class="{ hit: part.match }"
                >{{ part.text }}</span
              >
            </h3>
            <span class="status" :class="isHot(city.temp) ? 'hot' : 'cool'">
              <svg
                class="wx"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path v-for="(d, i) in iconPaths(city.status)" :key="i" :d="d" />
              </svg>
              {{ city.status }}
            </span>
          </div>

          <p class="temp tnum">{{ formatTemp(city.temp) }}</p>

          <!-- 이 화면의 시그니처: 기온을 길이로 보여 주는 게이지 -->
          <div class="gauge" role="presentation">
            <div
              class="gauge-fill"
              :class="isHot(city.temp) ? 'hot' : 'cool'"
              :style="{ width: gaugePercent(city.temp) + '%' }"
            ></div>
          </div>

          <div class="card-bottom">
            <span class="tag" :class="isHot(city.temp) ? 'hot' : 'cool'">
              <template v-if="city.temp >= 25">더움 (25도 이상)</template>
              <template v-else>선선함 (25도 미만)</template>
            </span>
            <button type="button" class="detail" @click.stop="showDetail(city)">상세보기</button>
          </div>
        </article>
      </div>
    </section>

    <!-- 상태바 -->
    <footer class="statusbar" :class="{ active: selectedCityInfo !== '' }" aria-live="polite">
      <span v-if="selectedCityInfo">{{ selectedCityInfo }}</span>
      <span v-else class="muted">카드를 클릭하거나 검색해 보세요.</span>
      <button v-if="selectedCityInfo" type="button" class="unselect" @click="clearSelection">
        선택 해제
      </button>
    </footer>

    <!-- 에러 화면을 직접 확인할 수 있도록 -->
    <p class="devnote">
      <button type="button" @click="fetchWeather({ shouldFail: true })">에러 상태 보기</button>
      <button type="button" @click="fetchWeather()">정상 다시 불러오기</button>
    </p>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--gap-5) var(--gap-3) var(--gap-4);
}

/* ── 헤더 ───────────────────────────── */
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--gap-3);
  margin-bottom: var(--gap-4);
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
  margin: 2px 0 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.unit {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px;
  box-shadow: var(--shadow-1);
}
.unit button {
  border: 0;
  background: transparent;
  color: var(--text-dim);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.18s var(--ease);
}
.unit button.on {
  background: var(--text);
  color: #fff;
}

/* ── 검색 패널 ──────────────────────── */
.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: var(--gap-3);
  box-shadow: var(--shadow-1);
}
.field {
  display: block;
}
.label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: var(--gap-1);
}
.input-wrap {
  position: relative;
  display: block;
}
.input-wrap input {
  width: 100%;
  padding: 11px 38px 11px 13px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  transition:
    border-color 0.18s var(--ease),
    background 0.18s var(--ease);
}
.input-wrap input:focus {
  outline: none;
  border-color: var(--cool);
  background: var(--surface);
}
.clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: var(--line);
  color: var(--text-dim);
  line-height: 1;
  font-size: 16px;
}
.clear:hover {
  background: var(--line-strong);
}

.echo {
  margin: var(--gap-2) 0 0;
  font-size: 13px;
  color: var(--text-dim);
}
.echo strong {
  color: var(--cool);
}
.echo em {
  font-style: normal;
  color: var(--text-faint);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-2);
  justify-content: space-between;
  align-items: center;
  margin-top: var(--gap-3);
  padding-top: var(--gap-3);
  border-top: 1px solid var(--line);
}
.chips {
  display: flex;
  gap: var(--gap-1);
}
.chips button {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-dim);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  transition: all 0.18s var(--ease);
}
.chips button:hover {
  border-color: var(--line-strong);
}
.chips button.on {
  background: var(--text);
  border-color: var(--text);
  color: #fff;
}
.sort select {
  font: inherit;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-dim);
}

/* ── 요약 통계 ──────────────────────── */
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
  margin-top: var(--gap-3);
}
.stat {
  background: var(--surface);
  padding: var(--gap-2) var(--gap-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label {
  font-size: 11px;
  color: var(--text-faint);
}
.stat-value {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.stat-value.hot {
  color: var(--hot);
}
.stat-value.cool {
  color: var(--cool);
}

/* ── 목록 ───────────────────────────── */
.list-area {
  margin-top: var(--gap-4);
}
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dim);
  letter-spacing: 0.02em;
  margin: 0 0 var(--gap-2);
}

/* 개수가 늘어도 열 수가 알아서 맞춰진다 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--gap-2);
}

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--gap-3);
  cursor: pointer;
  transition:
    transform 0.18s var(--ease),
    box-shadow 0.18s var(--ease),
    border-color 0.18s var(--ease);
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-2);
  border-color: var(--line-strong);
}
.card.selected {
  border-color: var(--text);
  box-shadow: 0 0 0 1px var(--text);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gap-1);
}
.city {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.city .hit {
  background: #fff2a8;
  border-radius: 3px;
  padding: 0 1px;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}
.wx {
  width: 16px;
  height: 16px;
}
.status.hot .wx {
  color: var(--hot);
}
.status.cool .wx {
  color: var(--cool);
}

.temp {
  margin: var(--gap-2) 0 var(--gap-1);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.gauge {
  height: 4px;
  background: var(--surface-sunken);
  border-radius: 999px;
  overflow: hidden;
}
.gauge-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s var(--ease);
}
.gauge-fill.hot {
  background: var(--hot);
}
.gauge-fill.cool {
  background: var(--cool);
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-1);
  margin-top: var(--gap-3);
}
.tag {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.tag.hot {
  background: var(--hot-soft);
  color: var(--hot);
}
.tag.cool {
  background: var(--cool-soft);
  color: var(--cool);
}
.detail {
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-dim);
  font-size: 12px;
  padding: 5px 10px;
  border-radius: var(--r-sm);
  transition: all 0.18s var(--ease);
}
.detail:hover {
  background: var(--text);
  border-color: var(--text);
  color: #fff;
}

/* ── 스켈레톤 ───────────────────────── */
.skeleton {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--gap-3);
}
.sk-line,
.sk-bar {
  background: linear-gradient(90deg, var(--surface-sunken), var(--line), var(--surface-sunken));
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite linear;
  border-radius: 4px;
  height: 12px;
  margin-bottom: var(--gap-2);
}
.sk-line.tall {
  height: 26px;
}
.sk-bar {
  height: 4px;
  border-radius: 999px;
}
.w40 {
  width: 40%;
}
.w50 {
  width: 50%;
  margin-bottom: 0;
}
.w70 {
  width: 70%;
}
@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

/* ── 에러 · 빈 결과 ─────────────────── */
.notice {
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  padding: var(--gap-4) var(--gap-3);
  text-align: center;
  background: var(--surface);
}
.notice-title {
  margin: 0 0 4px;
  font-weight: 700;
  font-size: 15px;
}
.notice-body {
  margin: 0 0 var(--gap-3);
  font-size: 13px;
  color: var(--text-dim);
}
.notice.error {
  border-color: var(--hot);
  background: var(--hot-soft);
}
.notice.error .notice-title {
  color: var(--hot);
}
.retry {
  border: 1px solid var(--line-strong);
  background: var(--surface);
  padding: 7px 16px;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 600;
}
.retry:hover {
  background: var(--text);
  border-color: var(--text);
  color: #fff;
}

/* ── 상태바 ─────────────────────────── */
.statusbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-2);
  margin-top: var(--gap-4);
  padding: var(--gap-3);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  font-size: 14px;
  transition: all 0.2s var(--ease);
}
.statusbar.active {
  background: var(--ok-soft);
  border-color: #bfe0cd;
  color: var(--ok);
  font-weight: 600;
}
.statusbar .muted {
  color: var(--text-faint);
}
.unselect {
  border: 0;
  background: transparent;
  color: var(--ok);
  font-size: 12px;
  text-decoration: underline;
  padding: 0;
}

.devnote {
  margin-top: var(--gap-3);
  text-align: center;
  display: flex;
  gap: var(--gap-2);
  justify-content: center;
}
.devnote button {
  border: 0;
  background: transparent;
  color: var(--text-faint);
  font-size: 12px;
  text-decoration: underline;
  padding: 0;
}
.devnote button:hover {
  color: var(--text-dim);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 520px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
  h1 {
    font-size: 22px;
  }
}
</style>
