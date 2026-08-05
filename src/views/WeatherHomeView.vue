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
import { Refresh } from '@element-plus/icons-vue'

import { useTemperature } from '../composables/useTemperature.js'
import { useFavoritesStore } from '../stores/favoritesStore.js'
import { getTempTier, TEMP_TIERS } from '../utils/temperature.js'
import { withJosa, matchesChoseong } from '../utils/korean.js'
import { fetchWeatherList } from '../api/weatherApi.js'

import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import SearchBar from '../components/exercise/SearchBar.vue'
import WeatherCard from '../components/exercise/WeatherCard.vue'
import CityDetailDialog from '../components/exercise/CityDetailDialog.vue'

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

const canRetry = ref(true)
const lastUpdated = ref(null) // 마지막으로 성공한 시각

/* ── 상세보기 모달 ──────────────────────────
   페이지 이동 대신 모달로 띄운다. 카드를 클릭하면 selectedCityId(선택 표시)와
   함께 이 두 값도 같이 설정된다 — handleSelectCard 참고. */
const detailCityId = ref(null)
const detailDialogVisible = ref(false)

/**
 * 날씨 목록을 불러온다.
 *
 * Mock 을 쓰던 때와 달리 실패 사유가 여러 가지다(키 오류·네트워크·요청 한도).
 * 사유별 문구는 API 계층의 ApiError 가 이미 만들어 두었으므로 그대로 사용하고,
 * 재시도 버튼 표시 여부만 retryable 로 판단한다.
 */
const loadWeather = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    weatherList.value = await fetchWeatherList()
    lastUpdated.value = new Date()
  } catch (error) {
    weatherList.value = []
    errorMessage.value = error.message
    canRetry.value = error.retryable ?? true
  } finally {
    isLoading.value = false
  }
}

const loadNormal = () => loadWeather()

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

  if (tempFilter.value !== 'all') {
    result = result.filter((city) => getTempTier(city.temp).key === tempFilter.value)
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

const updatedLabel = computed(() => {
  if (!lastUpdated.value) return ''
  const hh = String(lastUpdated.value.getHours()).padStart(2, '0')
  const mm = String(lastUpdated.value.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} 기준`
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

/**
 * 카드를 클릭하면 선택 표시(상태바 문구)와 함께 상세보기 모달을 바로 연다.
 * 별도의 "상세보기" 버튼 없이 카드 자체가 그 역할을 한다.
 * 페이지 이동은 하지 않는다 — CityDetailDialog 가 필요한 데이터를 직접 불러온다.
 */
const handleSelectCard = (city) => {
  selectedCityId.value = city.id
  selectedCityInfo.value = `${withJosa(city.name, '이/가')} 선택되었습니다.`
  detailCityId.value = city.id
  detailDialogVisible.value = true
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
          <el-radio-group v-model="tempFilter" size="small">
            <el-radio-button value="all">전체</el-radio-button>
            <el-radio-button v-for="tempTier in TEMP_TIERS" :key="tempTier.key" :value="tempTier.key">
              {{ tempTier.label }}
            </el-radio-button>
          </el-radio-group>

          <el-check-tag
            :checked="favoritesOnly"
            :disabled="favoritesStore.count === 0"
            type="warning"
            @change="toggleFavoritesOnly"
          >
            ★ 즐겨찾기 {{ favoritesStore.count }}
          </el-check-tag>
        </div>

        <el-select v-model="sortKey" class="sort" size="small" aria-label="정렬 기준">
          <el-option value="temp-desc" label="기온 높은 순" />
          <el-option value="temp-asc" label="기온 낮은 순" />
          <el-option value="name" label="이름 순" />
        </el-select>
      </div>
    </BaseDashboardCard>

    <BaseDashboardCard title="지역별 날씨 현황" icon="chart">
      <template #actions>
        <span v-if="lastUpdated" class="updated">{{ updatedLabel }}</span>
        <el-tag v-if="summary" size="small" round class="tnum">{{ summary.count }}곳</el-tag>
      </template>

      <!-- 요약 통계도 카드와 같은 Composable 을 쓰므로 단위가 어긋날 수 없다 -->
      <div v-if="summary && !isLoading" class="summary">
        <div class="stat">
          <span class="stat-label">평균</span>
          <span class="stat-value tnum">{{ showTemp(summary.avg) }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">최고</span>
          <span class="stat-value tnum" :style="{ color: getTempTier(summary.max).color }">{{ showTemp(summary.max) }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">최저</span>
          <span class="stat-value tnum" :style="{ color: getTempTier(summary.min).color }">{{ showTemp(summary.min) }}</span>
        </div>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoading" class="grid" aria-busy="true">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="text" style="width: 40%; margin-bottom: 14px" />
              <el-skeleton-item variant="h3" style="width: 70%; margin-bottom: 14px" />
              <el-skeleton-item variant="text" style="width: 100%; margin-bottom: 10px" />
              <el-skeleton-item variant="text" style="width: 50%" />
            </template>
          </el-skeleton>
        </div>
      </div>

      <!-- 에러 -->
      <div v-else-if="errorMessage" class="notice">
        <el-alert type="error" show-icon :closable="false" title="불러오기 실패" :description="errorMessage" />
        <!-- 키 오류처럼 다시 눌러도 소용없는 경우에는 버튼을 감춘다 -->
        <el-button v-if="canRetry" type="danger" plain @click="loadNormal">다시 시도</el-button>
      </div>

      <!-- 빈 결과 -->
      <el-empty v-else-if="isEmptyResult" :image-size="72">
        <template #description>
          <p class="notice-title">
            <template v-if="hasKeyword">'{{ searchQuery }}'와 일치하는 도시가 없습니다</template>
            <template v-else-if="favoritesOnly">즐겨찾기에 담은 도시가 없습니다</template>
            <template v-else>조건에 맞는 도시가 없습니다</template>
          </p>
          <p class="notice-body">검색어를 지우거나 필터를 넓혀 보세요.</p>
        </template>
        <el-button @click="resetFilters">조건 초기화</el-button>
      </el-empty>

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
      <el-button type="primary" link :icon="Refresh" @click="loadNormal">새로고침</el-button>
    </p>

    <CityDetailDialog v-model="detailDialogVisible" :city-id="detailCityId" />
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
  align-items: center;
  gap: var(--gap-2);
}

.updated {
  font-size: 11px;
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

/* auto-fill + minmax: 화면 폭에 맞춰 열 개수가 자동 조정된다 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--gap-2);
}

.skeleton-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--gap-3);
}

.notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-3);
  padding: var(--gap-3) 0;
}

.notice-title {
  margin: 0 0 4px;
  font-weight: 700;
  font-size: 15px;
}

.notice-body {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
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

@media (max-width: 520px) {
  h1 {
    font-size: 22px;
  }
}
</style>
