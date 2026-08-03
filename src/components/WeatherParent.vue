<!--
  ============================================================================
  WeatherParent.vue — 화면 전체를 지휘하는 부모 컴포넌트
  ============================================================================

  [역할]
  이 화면의 모든 반응형 데이터를 혼자서 소유한다.
  자식 컴포넌트들은 상태를 갖지 않고, 받은 것을 표시하고 사건을 알리기만 한다.

  [컴포넌트 구성도]

      WeatherParent  (모든 ref / computed / watch 가 여기 있다)
        │
        ├─ BaseDashboardCard "도시 검색"        ← 껍데기(디자인)
        │    └─ SearchBar                       ← props: query / emit: update-query
        │
        ├─ BaseDashboardCard "지역별 날씨 현황"  ← 껍데기(디자인)
        │    └─ WeatherCard × N                 ← props: city, unit, selected, keyword
        │                                          emit: select-card, click-detail
        └─ 상태 바

  [데이터가 도는 순서 — 검색어를 한 글자 칠 때]
    1. SearchBar 가 emit('update-query', '서')
    2. WeatherParent 의 handleUpdateQuery 가 searchQuery.value = '서'
    3. searchQuery 에 의존하는 filteredWeatherList(computed)가 다시 계산됨
    4. 새 목록이 :city 로 각 WeatherCard 에 내려가고, :keyword 로 형광펜도 갱신
    5. watchEffect 가 감지해 콘솔에 로그를 남김

  [슬롯에 관한 중요한 사실]
  아래 템플릿에서 <SearchBar> 와 <WeatherCard> 는 <BaseDashboardCard> 안쪽에 있지만,
  이 코드는 어디까지나 WeatherParent 가 작성한 것이다.
  따라서 BaseDashboardCard 를 거치지 않고 부모가 직접 props 를 주고 이벤트를 받는다.
  같은 이유로, 슬롯에 넣은 내용의 CSS 도 이 파일의 <style scoped> 에 써야 적용된다.
  ============================================================================
-->

<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'

// 공통 유틸 — 조사 처리와 온도 변환
import { withJosa } from '../utils/korean.js'
import { formatTemp } from '../utils/temperature.js'

// 자식 컴포넌트 — import 만 하면 템플릿에서 태그로 쓸 수 있다(script setup 의 편의 기능)
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'

/* ============================================================
   1. 반응형 상태
   ref() 로 감싼 값은 Vue 가 감시한다. 값이 바뀌면 이 값을 쓰는 화면 부분이 자동으로 다시 그려진다.
   ============================================================ */

const weatherList = ref([]) // 원본 날씨 데이터 (항상 섭씨로 보관)
const searchQuery = ref('') // 검색어
const selectedCityInfo = ref('') // 상태 바에 띄울 문구
const selectedCityId = ref(null) // 선택된 카드를 강조하기 위한 id

const isLoading = ref(false) // 로딩 중인가
const errorMessage = ref('') // 에러 문구 (빈 문자열이면 에러 없음)
// (세 번째 '빈 결과'는 아래 isEmptyResult computed 로 판단한다)

// 부가 기능용 상태
const unit = ref('C') // 'C' | 'F'
const tempFilter = ref('all') // 'all' | 'hot' | 'cool'
const sortKey = ref('temp-desc') // 'temp-desc' | 'temp-asc' | 'name'

/* ============================================================
   2. 가짜 API

   setTimeout 으로 지연을 흉내 내고, shouldFail 플래그로 실패를 유발한다.

   나중에 진짜 API 를 붙일 때는 try 블록 안의 두 줄만 fetch(...) 로 갈아 끼우면 되고, 나머지 구조는 그대로 쓸 수 있다.
   ============================================================ */

const MOCK_DATA = [
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '인천', temp: 24, status: '흐림' },
  { id: 'city_03', name: '수원', temp: 24, status: '비' },
  { id: 'city_04', name: '강릉', temp: 22, status: '구름' },
  { id: 'city_05', name: '대전', temp: 27, status: '맑음' },
  { id: 'city_06', name: '대구', temp: 31, status: '맑음' }, // 받침 없는 이름 → 조사 처리 확인용
  { id: 'city_07', name: '광주', temp: 29, status: '구름' },
  { id: 'city_08', name: '부산', temp: 26, status: '구름' },
  { id: 'city_09', name: '제주', temp: 25, status: '비' },
]

const fetchWeather = async ({ shouldFail = false } = {}) => {
  isLoading.value = true
  errorMessage.value = '' // 이전 에러를 먼저 지워야 재시도 화면이 깔끔하다

  try {
    await new Promise((resolve) => setTimeout(resolve, 700)) // 네트워크 지연 흉내
    if (shouldFail) throw new Error('NETWORK')
    weatherList.value = MOCK_DATA
  } catch {
    // 실패했을 때 이전 목록이 남아 있으면 사용자가 헷갈린다. 비우고 에러만 보여 준다.
    weatherList.value = []
    errorMessage.value = '날씨 정보를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'
  } finally {
    // 성공하든 실패하든 로딩은 반드시 끔
    isLoading.value = false
  }
}

// 템플릿의 @click 에는 표현식 하나만 넣을 수 있으므로, 인자가 필요한 호출은
// 이렇게 이름 붙인 함수로 감싸 둔다.
const loadNormal = () => fetchWeather()
const loadWithError = () => fetchWeather({ shouldFail: true })

// onMounted: 컴포넌트가 화면에 붙은 직후 한 번 실행된다.
onMounted(loadNormal)

/* ============================================================
   3. computed — 원본 데이터로부터 파생되는 값

   computed 는 의존하는 값이 바뀔 때만 다시 계산하고, 그 외에는
   캐시된 결과를 재사용한다. 그래서 화면이 여러 번 그려져도 낭비가 없다.
   computed 안에서는 값을 바꾸지 않는다(계산만 한다).
   ============================================================ */

// 과제 요구사항 2 — 검색 + 필터 + 정렬을 거친 최종 목록
const filteredWeatherList = computed(() => {
  const keyword = searchQuery.value.trim()
  let result = weatherList.value

  // (1) 검색어로 걸러내기. 비어 있으면 원본 그대로 둔다.
  if (keyword !== '') {
    result = result.filter((city) => city.name.includes(keyword))
  }

  // (2) 기온 필터
  if (tempFilter.value === 'hot') {
    result = result.filter((city) => city.temp >= 25)
  } else if (tempFilter.value === 'cool') {
    result = result.filter((city) => city.temp < 25)
  }

  // (3) 정렬
  // sort() 는 원본 배열을 직접 뒤섞는다. [...result] 로 복사한 뒤 정렬해야 weatherList 원본이 훼손되지 않는다.
  return [...result].sort((a, b) => {
    if (sortKey.value === 'temp-asc') return a.temp - b.temp
    // localeCompare(.., 'ko') 는 한글 가나다 순을 제대로 처리한다
    if (sortKey.value === 'name') return a.name.localeCompare(b.name, 'ko')
    return b.temp - a.temp
  })
})

// 요약 통계 — 전체가 아니라 지금 화면에 보이는 목록 기준으로 계산한다.
// 필터를 걸면 평균도 함께 바뀌어야 혼란스럽지 않음
const summary = computed(() => {
  const list = filteredWeatherList.value
  if (list.length === 0) return null // 빈 배열에 Math.max 를 쓰면 -Infinity 가 나온다

  const temps = list.map((city) => city.temp)
  const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length

  return {
    count: list.length,
    avg: Math.round(avg * 10) / 10, // 소수점 한 자리까지
    max: Math.max(...temps),
    min: Math.min(...temps),
  }
})

const hasKeyword = computed(() => searchQuery.value.trim() !== '')

// 세 번째 상태: 빈 결과.
// 로딩 중도 아니고 에러도 아닌데 목록이 0건일 때만 true 가 되어야 한다.
const isEmptyResult = computed(
  () => !isLoading.value && !errorMessage.value && filteredWeatherList.value.length === 0,
)

/**
 * 부모 쪽(요약 통계, alert)에서 온도를 찍을 때 쓰는 헬퍼.
 * WeatherCard 내부와 완전히 같은 formatTemp 를 호출하므로
 * 단위를 바꿔도 카드와 통계의 숫자가 어긋나지 않는다.
 */
const showTemp = (celsius) => formatTemp(celsius, unit.value)

/* ============================================================
   4. watch / watchEffect — 값 변화에 반응해 부수 효과를 실행

   computed 가 값을 만드는 도구라면, 이 둘은 일을 시키는 도구다.
   로그 출력, API 호출, localStorage 저장 등이 여기 들어간다.
   ============================================================ */

// watch: 감시 대상을 콕 집어 지정한다. 이전 값도 받을 수 있고,
// 기본적으로 컴포넌트가 처음 뜰 때는 실행되지 않는다.
watch(selectedCityInfo, (newValue, oldValue) => {
  console.log(
    `👀 [watch 감지] 상태 바 문구가 업데이트되었습니다 → "${newValue}" (이전: "${oldValue}")`,
  )
})

// 단위 전환이 화면 전체에 반영되는지 확인하기 위한 추가 감시
watch(unit, (newUnit) => {
  console.log(`🌡️ [watch 감지] 표시 단위가 ${newUnit === 'C' ? '섭씨' : '화씨'}로 바뀌었습니다.`)
})

// watchEffect: 감시 대상을 적지 않는다.
// 함수 안에서 읽은 반응형 값(searchQuery, filteredWeatherList)을 Vue 가 알아서 추적한다.
// 대신 컴포넌트가 뜨는 즉시 한 번 실행되므로, 새로고침 직후 콘솔에 로그가
// 하나 찍혀 있는 것은 정상이다.
watchEffect(() => {
  console.log(
    `👁️ [watchEffect 자동 호출] 현재 검색어 '${searchQuery.value}'에 해당하는 데이터를 필터링합니다. (결과 ${filteredWeatherList.value.length}건)`,
  )
})

/* ============================================================
   5. 자식이 올린 이벤트를 처리하는 자리

   자식은 무슨 일이 있었는지만 알리고, 실제 상태 변경은 전부 여기서 한다.
   값이 바뀌는 코드가 한 파일에만 모여 있으므로 흐름을 따라가기 쉽다.
   ============================================================ */

/** SearchBar 의 update-query 를 받아 검색어를 갱신한다 */
const handleUpdateQuery = (value) => {
  searchQuery.value = value
}

/** WeatherCard 의 select-card 를 받아 선택 상태와 상태 바 문구를 갱신한다 */
const handleSelectCard = (city) => {
  selectedCityId.value = city.id

  // 받침 유무에 맞는 조사를 붙인다.
  // '서울' → '서울이', '대구' → '대구가'
  selectedCityInfo.value = `${withJosa(city.name, '이/가')} 선택되었습니다.`
}

/** WeatherCard 의 click-detail 을 받아 상세 내용을 알린다 */
const handleClickDetail = (city) => {
  // showTemp 를 쓰므로 alert 안의 숫자도 현재 단위를 따른다
  window.alert(
    `${city.name}의 현재 날씨는 [${city.status}] 상태입니다.\n현재 기온: ${showTemp(city.temp)}`,
  )
}

/* ============================================================
   6. 그 밖의 조작 함수

   템플릿의 @click 에는 표현식 하나만 들어갈 수 있다.
   두 가지 이상을 처리해야 하면 반드시 함수로 만들어 이름만 넘긴다.
   (@click="a(); b()" 처럼 붙여 쓰면 코드 포매터가 줄을 나눌 때 문법이 깨진다.)
   ============================================================ */

const setUnitC = () => (unit.value = 'C')
const setUnitF = () => (unit.value = 'F')

const setFilterAll = () => (tempFilter.value = 'all')
const setFilterHot = () => (tempFilter.value = 'hot')
const setFilterCool = () => (tempFilter.value = 'cool')

/** 선택 해제 — 상태 바를 초기 문구로 되돌린다 */
const clearSelection = () => {
  selectedCityId.value = null
  selectedCityInfo.value = ''
}

/** 빈 결과 화면의 [조건 초기화] — 검색어와 필터를 한 번에 되돌린다 */
const resetFilters = () => {
  searchQuery.value = ''
  tempFilter.value = 'all'
}
</script>

<template>
  <div class="page">
    <!-- ── 페이지 머리: 제목 + 단위 전환 ─────────────────── -->
    <header class="head">
      <div class="head-text">
        <p class="eyebrow">Vue Component</p>
        <h1>과제 3 · 날씨</h1>
      </div>

      <!--
        aria-pressed 는 스크린 리더에게 "이 버튼이 눌린 상태"임을 알린다.
        :class 로 시각적 표시를, aria 로 비시각적 표시를 함께 준다.
      -->
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

    <!-- ── 상자 1: 도시 검색 ──────────────────────────────
         BaseDashboardCard 는 테두리와 제목만 그리고,
         그 안의 내용은 여기서 통째로 넘긴다(기본 슬롯).
    ──────────────────────────────────────────────────── -->
    <BaseDashboardCard title="도시 검색" icon="search">
      <!--
        :query      → 부모의 검색어를 자식에게 내려보낸다 (props)
        @update-query → 자식이 보낸 새 값을 부모가 받는다 (emit)

        이 한 줄에 데이터의 왕복이 모두 드러난다.
      -->
      <SearchBar :query="searchQuery" @update-query="handleUpdateQuery" />

      <!-- 필터 칩과 정렬 -->
      <div class="controls">
        <div class="chips" role="group" aria-label="기온 필터">
          <button type="button" :class="{ on: tempFilter === 'all' }" @click="setFilterAll">
            전체
          </button>
          <button type="button" :class="{ on: tempFilter === 'hot' }" @click="setFilterHot">
            더움 25↑
          </button>
          <button type="button" :class="{ on: tempFilter === 'cool' }" @click="setFilterCool">
            선선함 25↓
          </button>
        </div>

        <label class="sort">
          <!-- 화면에는 안 보이지만 스크린 리더가 읽을 수 있는 설명 -->
          <span class="sr-only">정렬 기준</span>
          <!-- select 는 한글 조합 이슈가 없으므로 v-model 을 그대로 써도 된다 -->
          <select v-model="sortKey">
            <option value="temp-desc">기온 높은 순</option>
            <option value="temp-asc">기온 낮은 순</option>
            <option value="name">이름 순</option>
          </select>
        </label>
      </div>
    </BaseDashboardCard>

    <!-- ── 상자 2: 지역별 날씨 현황 ───────────────────── -->
    <BaseDashboardCard title="지역별 날씨 현황" icon="chart">
      <!-- #actions 는 v-slot:actions 의 줄임말. 제목 오른쪽 구멍에 꽂힌다. -->
      <template #actions>
        <span v-if="summary" class="count tnum">{{ summary.count }}곳</span>
      </template>

      <!-- 요약 통계. showTemp 를 쓰므로 카드와 항상 같은 단위로 표시된다. -->
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

      <!--
        아래 v-if / v-else-if / v-else 는 하나의 연결된 사슬이다.
        네 가지 중 정확히 하나만 화면에 나온다.
        순서가 중요하다: 로딩 → 에러 → 빈 결과 → 정상 목록
      -->

      <!-- 상태 1: 로딩 — 빈 화면 대신 회색 뼈대를 보여 준다(스켈레톤 UI).
           멈춘 것 같은 느낌을 줄이고, 곧 나올 레이아웃을 미리 알려 준다. -->
      <div v-if="isLoading" class="grid" aria-busy="true">
        <div v-for="n in 6" :key="n" class="skeleton">
          <div class="sk-line w40"></div>
          <div class="sk-line w70 tall"></div>
          <div class="sk-bar"></div>
          <div class="sk-line w50"></div>
        </div>
      </div>

      <!-- 상태 2: 에러 — 무엇이 잘못됐는지 짧게 설명하고 다음 행동을 준다 -->
      <div v-else-if="errorMessage" class="notice error">
        <p class="notice-title">불러오기 실패</p>
        <p class="notice-body">{{ errorMessage }}</p>
        <button type="button" class="retry" @click="loadNormal">다시 시도</button>
      </div>

      <!-- 상태 3: 빈 결과 — 아무것도 안 보이면 고장으로 오해하므로 반드시 안내한다.
           검색어가 있을 때와 없을 때 문구를 다르게 해서 원인을 알려 준다. -->
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
        <!--
          v-for 로 카드를 반복 생성한다.

          :key 는 Vue 가 각 카드를 구분하는 이름표다. 정렬이나 필터로 순서가
          바뀔 때 이름표가 있어야 DOM 을 올바르게 재사용한다.

          내려보내는 것(props) 4개, 받는 것(emit) 2개가 한눈에 보인다.
        -->
        <WeatherCard
          v-for="city in filteredWeatherList"
          :key="city.id"
          :city="city"
          :unit="unit"
          :keyword="searchQuery"
          :selected="selectedCityId === city.id"
          @select-card="handleSelectCard"
          @click-detail="handleClickDetail"
        />
      </div>
    </BaseDashboardCard>

    <!-- ── 상태 바 ─────────────────────────────────────
         aria-live="polite" 를 주면 내용이 바뀔 때 스크린 리더가
         읽어 준다. 시각 정보에만 의존하지 않게 하는 장치다.
    ──────────────────────────────────────────────── -->
    <footer class="statusbar" :class="{ active: selectedCityInfo !== '' }" aria-live="polite">
      <span v-if="selectedCityInfo">{{ selectedCityInfo }}</span>
      <span v-else class="muted">카드를 클릭하거나 검색해 보세요.</span>
      <button v-if="selectedCityInfo" type="button" class="unselect" @click="clearSelection">
        선택 해제
      </button>
    </footer>

    <!-- 에러 화면을 직접 확인할 수 있도록 만든 확인용 버튼 -->
    <p class="devnote">
      <button type="button" @click="loadWithError">에러 상태 보기</button>
      <button type="button" @click="loadNormal">정상 다시 불러오기</button>
    </p>
  </div>
</template>

<!--
  이 파일의 스타일 범위

  슬롯으로 BaseDashboardCard 에 넘긴 내용(.controls, .summary, .grid 등)은
  화면상으로는 그 상자 안에 있지만 코드상으로는 이 컴포넌트 소유다.
  따라서 그 CSS 는 BaseDashboardCard.vue 가 아니라 여기에 있어야 적용된다.

  반대로 카드 한 장의 스타일(.card, .temp 등)은 WeatherCard.vue 안에 있다.
  각 컴포넌트가 자기 모양을 책임지는 구조다.
-->
<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--gap-5) var(--gap-3) var(--gap-4);
  display: flex;
  flex-direction: column;
  gap: var(--gap-3); /* 상자들 사이 간격을 한 번에 관리 */
}

/* ── 페이지 머리 ─────────────────────── */
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

/* 단위 전환 토글 */
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

/* ── 검색 상자 안의 필터·정렬 ────────── */
.controls {
  display: flex;
  flex-wrap: wrap; /* 화면이 좁아지면 자연스럽게 줄바꿈 */
  gap: var(--gap-2);
  justify-content: space-between;
  align-items: center;
  margin-top: var(--gap-3);
  padding-top: var(--gap-3);
  border-top: 1px solid var(--line); /* 검색창과 시각적으로 구분 */
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

/* 선택된 칩 */
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

/* 상자 제목 오른쪽의 개수 표시 (actions 슬롯) */
.count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-faint);
}

/* ── 요약 통계 ───────────────────────
   gap: 1px + 배경색 트릭: 칸 사이에 1px 틈을 만들고 그 아래 배경이
   비쳐 보이게 해서, 구분선을 따로 그리지 않고도 격자를 만든다.
──────────────────────────────────── */
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
  letter-spacing: -0.01em;
}

.stat-value.hot {
  color: var(--hot);
}

.stat-value.cool {
  color: var(--cool);
}

/* ── 카드 그리드 ─────────────────────
   auto-fill + minmax 한 줄이면 화면 폭에 맞춰 열 개수가 알아서 조정된다.
   도시가 3개든 20개든, 화면이 좁든 넓든 미디어 쿼리 없이 대응된다.
──────────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--gap-2);
}

/* ── 스켈레톤(로딩) ──────────────────
   실제 카드와 비슷한 위치,크기의 회색 막대를 두어
   무엇이 로딩 중인지 미리 알려 준다.
──────────────────────────────────── */
.skeleton {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--gap-3);
}

.sk-line,
.sk-bar {
  /* 밝은 띠가 좌우로 흐르는 효과 */
  background: linear-gradient(90deg, var(--surface-sunken), var(--line), var(--surface-sunken));
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite linear;
  border-radius: 4px;
  height: 12px;
  margin-bottom: var(--gap-2);
}

.sk-line.tall {
  height: 26px; /* 큰 온도 숫자 자리 */
}

.sk-bar {
  height: 4px; /* 게이지 자리 */
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

/* ── 에러 · 빈 결과 안내 ─────────────
   점선 테두리로 여기는 임시 상태라는 느낌을 준다.
──────────────────────────────────── */
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

/* 에러는 빈 결과보다 강한 신호가 필요하므로 색을 입힌다 */
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

/* ── 상태 바 ─────────────────────── */
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

/* 도시가 선택되면 초록 톤으로 바뀌어 반응했다는 신호를 준다 */
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

/* 확인용 버튼 — 본문보다 눈에 덜 띄게 처리 */
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

/* 화면에는 안 보이지만 스크린 리더는 읽는 텍스트 */
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
