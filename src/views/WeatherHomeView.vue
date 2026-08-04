<!--
  WeatherHomeView.vue — 메인 대시보드

  이전 버전에서 달라진 점
    · unit ref 제거          → configStore 로 이동, 단위 토글 버튼도 내비게이션 바로 이동
    · favoriteIds ref 제거   → favoritesStore 로 이동
    · 즐겨찾기 저장 watch 제거 → 저장 시점이 스토어 action 안으로 들어감
    · 상세 페이지 이동 시 ?unit= 쿼리 전달 제거 → 스토어가 전역이라 넘길 필요가 없음

  화면 고유의 상태(검색어·필터·정렬·선택)는 그대로 이 컴포넌트에 남겼다.
  다른 화면이 공유하지 않는 값까지 스토어로 옮기면 전역 상태가 불필요하게 커진다.
-->

<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useTemperature } from '../composables/useTemperature.js'
import { useFavoritesStore } from '../stores/favoritesStore.js'
import { withJosa, matchesChoseong } from '../utils/korean.js'
import { fetchWeatherList } from '../data/weather.js'

import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import SearchBar from '../components/exercise/SearchBar.vue'
import WeatherCard from '../components/exercise/WeatherCard.vue'

const router = useRouter()

// 단위 변환은 Composable 을 통해서만 접근한다
const { format: showTemp } = useTemperature()

const favoritesStore = useFavoritesStore()

/* ── 이 화면에서만 쓰는 상태 ───────────────── */
const weatherList = ref([])
const searchQuery = ref('')
const selectedCityInfo = ref('')
const selectedCityId = ref(null)

const isLoading = ref(false)
const errorMessage = ref('')

const tempFilter = ref('all')
const sortKey = ref('temp-desc')
const favoritesOnly = ref(false)

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

onMounted(loadNormal)

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
    result = result.filter((city) => favoritesStore.has(city.id))
  }

  if (tempFilter.value === 'hot') {
    result = result.filter((city) => city.temp >= 25)
  } else if (tempFilter.value === 'cool') {
    result = result.filter((city) => city.temp < 25)
  }

  // sort 는 원본 배열을 뒤섞으므로 복사한 뒤 정렬한다
  return [...result].sort((a, b) => {
    if (sortKey.value === 'temp-asc') return a.temp - b.temp
    if (sortKey.value === 'name') return a.name.localeCompare(b.name, 'ko')
    return b.temp - a.temp
  })
})

const summary = computed(() => {
  const list = filteredWeatherList.value
  if (list.length === 0) return null // 빈 배열에 Math.max 를 쓰면 -Infinity 가 된다

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

/* ── watch / watchEffect ──────────────────── */
watch(selectedCityInfo, (newValue) => {
  console.log(`👀 [watch] 상태 바 문구 변경 → "${newValue}"`)
})

/**
 * 스토어의 값도 일반 반응형 값처럼 감시할 수 있다.
 * getter 를 함수로 감싸 넘기는 형태에 주의한다.
 */
watch(
  () => favoritesStore.count,
  (count) => {
    console.log(`⭐ [watch] 즐겨찾기 ${count}곳`)
  },
)

watchEffect(() => {
  console.log(
    `👁️ [watchEffect] 검색어 '${searchQuery.value}' → 결과 ${filteredWeatherList.value.length}건`,
  )
})

/**
 * 탭 제목 갱신.
 * 로딩 여부·선택 도시·단위·목록 개수 등 여러 값에 동시에 의존하므로,
 * 감시 대상을 자동으로 추적하는 watchEffect 가 알맞다.
 * 단위를 바꾸면 showTemp 가 참조하는 스토어 값이 바뀌어 제목도 함께 갱신된다.
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
 * 상세 페이지로 이동한다.
 * 이전에는 단위를 query 로 함께 넘겼으나, 스토어가 전역이므로 더 이상 필요 없다.
 */
const handleClickDetail = (city) => {
  router.push({ name: 'weather-detail', params: { cityId: city.id } })
}

/**
 * 즐겨찾기 토글.
 * 목록 관리는 스토어 action 이 담당하고, 이 화면은 안내 문구만 만든다.
 * toggle() 이 담긴 상태인지를 돌려주므로 조사 처리와 함께 문구를 구성할 수 있다.
 */
const handleToggleFavorite = (city) => {
  const added = favoritesStore.toggle(city.id)
  const josaAttached = withJosa(city.name, '을/를')
  selectedCityInfo.value = added
    ? `${josaAttached} 즐겨찾기에 담았습니다.`
    : `${josaAttached} 즐겨찾기에서 뺐습니다.`
}

/* ── 그 밖의 조작 ─────────────────────────── */
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
      <p class="eyebrow">Pinia Store</p>
      <h1>과제 5 · 날씨 대시보드</h1>
    </header>

    <BaseDashboardCard title="도시 검색 (한글 즉시 동기화)" icon="search">
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
            :disabled="favoritesStore.count === 0"
            @click="toggleFavoritesOnly"
          >
            ★ 즐겨찾기 {{ favoritesStore.count }}
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

      <!-- 요약 통계도 카드와 같은 Composable 을 쓰므로 단위가 어긋날 수 없다 -->
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
        <!-- unit 과 is-favorite 을 넘기지 않는다. 자식이 스토어에서 직접 읽는다. -->
        <WeatherCard
          v-for="city in filteredWeatherList"
          :key="city.id"
          :city="city"
          :keyword="searchQuery"
          :selected="selectedCityId === city.id"
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

/* gap 1px + 배경색으로 구분선을 대신한다 */
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
