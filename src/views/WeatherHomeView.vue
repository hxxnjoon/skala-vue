<!--
  WeatherHomeView.vue — 메인 대시보드 (기존 WeatherParent 를 페이지로 승격)

  과제 3의 WeatherParent 와 하는 일은 같다. 달라진 점은 두 가지다.
    1. views/ 로 옮겨 "페이지 단위 컴포넌트"가 되었다
    2. 상세보기가 window.alert 가 아니라 라우터 이동으로 바뀌었다
       → router.push() 로 /weather/:cityId 페이지를 연다 (Programmatic Navigation)
-->

<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { withJosa, matchesChoseong } from '../utils/korean.js'
import { formatTemp } from '../utils/temperature.js'
import { fetchWeatherList } from '../data/weather.js'

import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import SearchBar from '../components/exercise/SearchBar.vue'
import WeatherCard from '../components/exercise/WeatherCard.vue'

/**
 * useRouter() 는 이동시키는 도구를 준다 (push, replace, back).
 */
const router = useRouter()

/* ── 반응형 상태 ───────────────────────────── */
const weatherList = ref([])
const searchQuery = ref('')
const selectedCityInfo = ref('')
const selectedCityId = ref(null)

const isLoading = ref(false)
const errorMessage = ref('')

const unit = ref('C')
const tempFilter = ref('all')
const sortKey = ref('temp-desc')

// 즐겨찾기는 도시 객체가 아니라 id 만 저장한다.
// 원본 데이터가 갱신돼도 깨지지 않고 저장 용량도 작다.
const favoriteIds = ref([])
const favoritesOnly = ref(false)

const FAVORITES_KEY = 'weather-dashboard:favorites'

/* ── 데이터 불러오기 ──────────────────────── */
const loadWeather = async ({ shouldFail = false } = {}) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    weatherList.value = await fetchWeatherList({ shouldFail })
  } catch {
    weatherList.value = []
    errorMessage.value = '날씨 정보를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'
  } finally {
    isLoading.value = false
  }
}

const loadNormal = () => loadWeather()
const loadWithError = () => loadWeather({ shouldFail: true })

/** 저장해 둔 즐겨찾기 읽기. 값이 손상됐을 수 있으므로 try/catch 로 감싼다. */
const loadFavorites = () => {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (!saved) return
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) favoriteIds.value = parsed
  } catch {
    favoriteIds.value = []
  }
}

onMounted(() => {
  loadFavorites()
  loadNormal()
})

/* ── computed ─────────────────────────────── */
const filteredWeatherList = computed(() => {
  const keyword = searchQuery.value.trim()
  let result = weatherList.value

  if (keyword !== '') {
    // 일반 검색과 초성 검색을 함께 지원한다. '서울'도 'ㅅㅇ'도 걸린다.
    result = result.filter(
      (city) => city.name.includes(keyword) || matchesChoseong(city.name, keyword),
    )
  }

  if (favoritesOnly.value) {
    result = result.filter((city) => favoriteIds.value.includes(city.id))
  }

  if (tempFilter.value === 'hot') {
    result = result.filter((city) => city.temp >= 25)
  } else if (tempFilter.value === 'cool') {
    result = result.filter((city) => city.temp < 25)
  }

  // sort 는 원본을 뒤섞으므로 복사한 뒤 정렬한다
  return [...result].sort((a, b) => {
    if (sortKey.value === 'temp-asc') return a.temp - b.temp
    if (sortKey.value === 'name') return a.name.localeCompare(b.name, 'ko')
    return b.temp - a.temp
  })
})

const favoriteCount = computed(() => favoriteIds.value.length)

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

const selectedCity = computed(
  () => weatherList.value.find((city) => city.id === selectedCityId.value) ?? null,
)

const showTemp = (celsius) => formatTemp(celsius, unit.value)
const isFavorite = (id) => favoriteIds.value.includes(id)

/* ── watch / watchEffect ──────────────────── */
watch(selectedCityInfo, (newValue) => {
  console.log(`👀 [watch] 상태 바 문구 변경 → "${newValue}"`)
})

watch(unit, (newUnit) => {
  console.log(`🌡️ [watch] 표시 단위 → ${newUnit === 'C' ? '섭씨' : '화씨'}`)
})

/**
 * 즐겨찾기가 바뀌면 localStorage 에 저장한다.
 * 저장은 새 값을 만드는 일이 아니라 부수 효과라서 computed 가 아니라 watch 를 썼다.
 * deep: true 는 나중에 push() 로 배열 내부를 바꾸더라도 감지되게 하기 위한 것.
 */
watch(
  favoriteIds,
  (newList) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newList))
    console.log(`⭐ [watch] 즐겨찾기 ${newList.length}곳 저장됨`)
  },
  { deep: true },
)

watchEffect(() => {
  console.log(
    `👁️ [watchEffect] 검색어 '${searchQuery.value}' → 결과 ${filteredWeatherList.value.length}건`,
  )
})

/**
 * 탭 제목 갱신.
 * isLoading, selectedCity, unit, 목록 개수 등 여러 값에 동시에 의존하므로
 * 감시 대상을 자동 추적해 주는 watchEffect 가 알맞다.
 */
watchEffect(() => {
  const base = '날씨 대시보드'

  if (isLoading.value) {
    document.title = `불러오는 중… · ${base}`
    return
  }

  if (selectedCity.value) {
    const city = selectedCity.value
    document.title = `${city.name} ${showTemp(city.temp)} · ${base}`
    return
  }

  document.title = `${filteredWeatherList.value.length}곳 · ${base}`
})

/* ── 자식이 올린 이벤트 처리 ──────────────── */
const handleUpdateQuery = (value) => {
  searchQuery.value = value
}

const handleSelectCard = (city) => {
  selectedCityId.value = city.id
  selectedCityInfo.value = `${withJosa(city.name, '이/가')} 선택되었습니다.`
}

/**
 * [상세보기] — 과제 요구사항 3
 *
 * 이전에는 window.alert 로 정보를 띄웠지만, 이제 상세 페이지로 이동한다.
 *
 * 경로를 '/weather/' + id 처럼 문자열로 이어 붙일 수도 있지만,
 * name + params 형태를 쓰면 나중에 경로 규칙이 바뀌어도 이 코드는 그대로 둘 수 있다.
 */
const handleClickDetail = (city) => {
  router.push({
    name: 'weather-detail',
    params: { cityId: city.id },
    query: { unit: unit.value },
  })
}

/** 즐겨찾기 토글 — 배열을 직접 수정하지 않고 새 배열로 갈아 끼운다 */
const handleToggleFavorite = (city) => {
  if (favoriteIds.value.includes(city.id)) {
    favoriteIds.value = favoriteIds.value.filter((id) => id !== city.id)
    selectedCityInfo.value = `${withJosa(city.name, '을/를')} 즐겨찾기에서 뺐습니다.`
  } else {
    favoriteIds.value = [...favoriteIds.value, city.id]
    selectedCityInfo.value = `${withJosa(city.name, '을/를')} 즐겨찾기에 담았습니다.`
  }
}

/* ── 그 밖의 조작 ─────────────────────────── */
const setUnitC = () => (unit.value = 'C')
const setUnitF = () => (unit.value = 'F')

const setFilterAll = () => (tempFilter.value = 'all')
const setFilterHot = () => (tempFilter.value = 'hot')
const setFilterCool = () => (tempFilter.value = 'cool')

const toggleFavoritesOnly = () => (favoritesOnly.value = !favoritesOnly.value)

const clearSelection = () => {
  selectedCityId.value = null
  selectedCityInfo.value = ''
}

const resetFilters = () => {
  searchQuery.value = ''
  tempFilter.value = 'all'
  favoritesOnly.value = false
}
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="head-text">
        <p class="eyebrow">Vue Router</p>
        <h1>과제 4 · 날씨 대시보드</h1>
      </div>

      <div class="unit" role="group" aria-label="온도 단위 전환">
        <button
          type="button"
          :class="{ on: unit === 'C' }"
          :aria-pressed="unit === 'C'"
          @click="setUnitC"
        >
          °C
        </button>
        <button
          type="button"
          :class="{ on: unit === 'F' }"
          :aria-pressed="unit === 'F'"
          @click="setUnitF"
        >
          °F
        </button>
      </div>
    </header>

    <BaseDashboardCard title="도시 검색 (한글·초성 지원)" icon="search">
      <SearchBar :query="searchQuery" @update-query="handleUpdateQuery" />

      <p class="hint">
        초성으로도 찾을 수 있어요 — <code>ㅅㅇ</code> → 서울, <code>ㅂㅅ</code> → 부산
      </p>

      <div class="controls">
        <div class="chips" role="group" aria-label="목록 필터">
          <button type="button" :class="{ on: tempFilter === 'all' }" @click="setFilterAll">
            전체
          </button>
          <button type="button" :class="{ on: tempFilter === 'hot' }" @click="setFilterHot">
            더움 25↑
          </button>
          <button type="button" :class="{ on: tempFilter === 'cool' }" @click="setFilterCool">
            선선함 25↓
          </button>
          <button
            type="button"
            class="star-chip"
            :class="{ on: favoritesOnly }"
            :disabled="favoriteCount === 0"
            @click="toggleFavoritesOnly"
          >
            ★ 즐겨찾기 {{ favoriteCount }}
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
    </BaseDashboardCard>

    <BaseDashboardCard title="지역별 날씨 현황" icon="chart">
      <template #actions>
        <span v-if="summary" class="count tnum">{{ summary.count }}곳</span>
      </template>

      <div v-if="summary && !isLoading" class="summary">
        <div class="stat">
          <span class="stat-label">평균</span>
          <span class="stat-value tnum">{{ showTemp(summary.avg) }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">최고</span>
          <span class="stat-value tnum hot">{{ showTemp(summary.max) }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">최저</span>
          <span class="stat-value tnum cool">{{ showTemp(summary.min) }}</span>
        </div>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoading" class="grid" aria-busy="true">
        <div v-for="n in 6" :key="n" class="skeleton">
          <div class="sk-line w40"></div>
          <div class="sk-line w70 tall"></div>
          <div class="sk-bar"></div>
          <div class="sk-line w50"></div>
        </div>
      </div>

      <!-- 에러 -->
      <div v-else-if="errorMessage" class="notice error">
        <p class="notice-title">불러오기 실패</p>
        <p class="notice-body">{{ errorMessage }}</p>
        <button type="button" class="retry" @click="loadNormal">다시 시도</button>
      </div>

      <!-- 빈 결과 -->
      <div v-else-if="isEmptyResult" class="notice empty">
        <p class="notice-title">
          <template v-if="hasKeyword">'{{ searchQuery }}'와 일치하는 도시가 없습니다</template>
          <template v-else-if="favoritesOnly">즐겨찾기에 담은 도시가 없습니다</template>
          <template v-else>조건에 맞는 도시가 없습니다</template>
        </p>
        <p class="notice-body">검색어를 지우거나 필터를 넓혀 보세요.</p>
        <button type="button" class="retry" @click="resetFilters">조건 초기화</button>
      </div>

      <!-- 목록 -->
      <div v-else class="grid">
        <WeatherCard
          v-for="city in filteredWeatherList"
          :key="city.id"
          :city="city"
          :unit="unit"
          :keyword="searchQuery"
          :selected="selectedCityId === city.id"
          :is-favorite="isFavorite(city.id)"
          @select-card="handleSelectCard"
          @click-detail="handleClickDetail"
          @toggle-favorite="handleToggleFavorite"
        />
      </div>
    </BaseDashboardCard>

    <footer class="statusbar" :class="{ active: selectedCityInfo !== '' }" aria-live="polite">
      <span v-if="selectedCityInfo">{{ selectedCityInfo }}</span>
      <span v-else class="muted">카드를 클릭하거나 검색해 보세요.</span>
      <button v-if="selectedCityInfo" type="button" class="unselect" @click="clearSelection">
        선택 해제
      </button>
    </footer>

    <p class="devnote">
      <button type="button" @click="loadWithError">에러 상태 보기</button>
      <button type="button" @click="loadNormal">정상 다시 불러오기</button>
    </p>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--gap-4) var(--gap-3);
  display: flex;
  flex-direction: column;
  gap: var(--gap-3);
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--gap-3);
  margin-bottom: var(--gap-1);
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

.hint {
  margin: var(--gap-2) 0 0;
  font-size: 12px;
  color: var(--text-faint);
}

.hint code {
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
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
  flex-wrap: wrap;
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

.chips button:hover:not(:disabled) {
  border-color: var(--line-strong);
}

.chips button.on {
  background: var(--text);
  border-color: var(--text);
  color: #fff;
}

.star-chip.on {
  background: var(--star);
  border-color: var(--star);
  color: #fff;
}

.star-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

.count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-faint);
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
  margin-bottom: var(--gap-3);
}

.stat {
  background: var(--surface-sunken);
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
}

.stat-value.hot {
  color: var(--hot);
}

.stat-value.cool {
  color: var(--cool);
}

/* auto-fill + minmax: 화면 폭에 맞춰 열 개수가 자동 조정된다 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--gap-2);
}

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

.notice {
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  padding: var(--gap-4) var(--gap-3);
  text-align: center;
  background: var(--surface-sunken);
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

.statusbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-2);
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
  margin: 0;
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
  h1 {
    font-size: 22px;
  }
}
</style>
