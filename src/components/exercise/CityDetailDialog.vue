<!--
  CityDetailDialog.vue — 도시 상세 정보 + 주변 카페 추천 모달

  이전에는 페이지 이동(/weather/:cityId)이었지만, 페이지를 옮기지 않고 모달로 뜨도록 바꿨다.
  "주변 추천" 도 예전에는 별도 페이지(/places)였는데, 이제 이 모달 안으로 들어와서
  모달을 열 때마다 그 도시의 카페 중 무작위 2곳만 보여준다(음식점은 추천하지 않는다).

  [에러를 두 단계로 나눈 이유]
  상세 정보(날씨) 조회가 실패하면 모달 전체를 에러로 보여준다.
  반면 카페 조회만 실패한 경우 관측정보·시간대별 기온은 그대로 두고
  "추천 카페" 영역만 에러로 바꾼다 — 날씨 정보 자체는 이미 정상 도착했기 때문이다.

  props : modelValue(다이얼로그 열림 여부), cityId
  emits : update:modelValue
-->

<script setup>
import { computed, ref } from 'vue'

import { useTemperature } from '../../composables/useTemperature.js'
import { useFavoritesStore } from '../../stores/favoritesStore.js'
import { getTempTier } from '../../utils/temperature.js'
import { withJosa } from '../../utils/korean.js'
import { sampleRandom } from '../../utils/random.js'
import { getCafeRecommendReason } from '../../utils/weatherRecommendation.js'
import { fetchCityById } from '../../api/weatherApi.js'
import { fetchNearbyPlaces, PLACE_CATEGORY } from '../../api/placeApi.js'
import { findCity } from '../../data/cities.js'

import PlaceCard from './PlaceCard.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cityId: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue'])

/** el-dialog 의 v-model 을 부모의 modelValue prop 과 그대로 이어 준다. */
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const { toDisplay, format: showTemp } = useTemperature()
const favoritesStore = useFavoritesStore()

/* ── 상세 정보 ────────────────────────────── */
const city = ref(null)
const isDetailLoading = ref(false)
const detailError = ref('')
const detailCanRetry = ref(true)

/* ── 주변 카페 ────────────────────────────── */
const cafes = ref([])
const isCafesLoading = ref(false)
const cafesError = ref('')
const cafesCanRetry = ref(true)

/* ── 파생값 ───────────────────────────────── */
const tier = computed(() => (city.value ? getTempTier(city.value.temp) : null))
const isFavorite = computed(() => (city.value ? favoritesStore.has(city.value.id) : false))
const cafeReason = computed(() => (city.value ? getCafeRecommendReason(city.value) : ''))

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
    tier: getTempTier(item.temp),
  }))
})

/** 미세먼지 등급별 색 구분 */
const dustTagType = computed(() => {
  if (!city.value) return 'success'
  if (city.value.dust === '나쁨' || city.value.dust === '매우 나쁨' || city.value.dust === '위험')
    return 'danger'
  if (city.value.dust === '보통') return 'warning'
  return 'success'
})

/* ── 조회 ─────────────────────────────────── */
const loadDetail = async () => {
  isDetailLoading.value = true
  detailError.value = ''

  try {
    city.value = await fetchCityById(props.cityId)
  } catch (error) {
    city.value = null
    detailError.value = error.message
    detailCanRetry.value = error.retryable ?? true
  } finally {
    isDetailLoading.value = false
  }
}

/**
 * 카페 후보를 받아 그중 2곳만 무작위로 골라 보여준다.
 * fetchCityById 의 응답에는 좌표가 없어 data/cities.js 에서 따로 찾는다.
 */
const loadCafes = async () => {
  const meta = findCity(props.cityId)
  if (!meta) return

  isCafesLoading.value = true
  cafesError.value = ''

  try {
    const found = await fetchNearbyPlaces({
      lat: meta.lat,
      lon: meta.lon,
      categoryCode: PLACE_CATEGORY.CAFE,
      radius: 2000,
    })
    cafes.value = sampleRandom(found, 2)
  } catch (error) {
    cafes.value = []
    cafesError.value = error.message
    cafesCanRetry.value = error.retryable ?? true
  } finally {
    isCafesLoading.value = false
  }
}

/**
 * 모달이 닫힘→열림으로 바뀔 때마다(=창에 들어갈 때마다) 실행된다.
 * 카테고리가 항상 카페로 고정이라 예전처럼 날씨를 먼저 기다릴 필요가 없어 동시에 부른다.
 */
const onOpen = () => {
  loadDetail()
  loadCafes()
}

/** 다음에 열 때 잠깐이라도 이전 도시 내용이 비치지 않도록 닫힌 뒤 상태를 비운다. */
const onClosed = () => {
  city.value = null
  detailError.value = ''
  cafes.value = []
  cafesError.value = ''
}

const onToggleFavorite = () => {
  if (!city.value) return
  favoritesStore.toggle(city.value.id)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="640px"
    align-center
    class="detail-dialog"
    :title="city ? city.name : detailError ? '오류' : '불러오는 중…'"
    @open="onOpen"
    @closed="onClosed"
  >
    <!-- 로딩 -->
    <el-skeleton v-if="isDetailLoading" animated :rows="4" />

    <!-- 상세 정보 실패 — 모달 전체를 에러로 -->
    <el-result
      v-else-if="detailError"
      icon="warning"
      title="정보를 불러올 수 없습니다"
      :sub-title="detailError"
    >
      <template #extra>
        <el-button v-if="detailCanRetry" type="primary" @click="loadDetail">다시 시도</el-button>
      </template>
    </el-result>

    <!-- 정상 -->
    <template v-else-if="city">
      <div class="sub">
        <span class="desc">
          {{ city.description || city.status }} · 체감 {{ showTemp(city.feelsLike) }}
        </span>
        <el-tag effect="light" size="small" round :class="'tier-' + tier.key">{{ tier.label }}</el-tag>

        <button type="button" class="fav" :class="{ on: isFavorite }" :aria-pressed="isFavorite" @click="onToggleFavorite">
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
      </div>

      <section class="panel">
        <h2 class="panel-title">추천 카페</h2>

        <el-alert
          v-if="cafeReason && !cafesError"
          class="reason"
          type="info"
          :closable="false"
          show-icon
          :title="cafeReason"
        />

        <!-- 로딩 -->
        <div v-if="isCafesLoading" class="cafe-grid" aria-busy="true">
          <div v-for="n in 2" :key="n" class="skeleton-card">
            <el-skeleton animated :rows="3" />
          </div>
        </div>

        <!-- 카페만 실패 (날씨는 정상) -->
        <div v-else-if="cafesError" class="notice">
          <el-alert type="error" show-icon :closable="false" title="카페 정보를 불러오지 못했습니다" :description="cafesError" />
          <el-button v-if="cafesCanRetry" type="danger" plain @click="loadCafes">다시 시도</el-button>
        </div>

        <!-- 빈 결과 -->
        <el-empty v-else-if="cafes.length === 0" :image-size="56" description="주변에 추천할 카페가 없어요" />

        <!-- 성공 -->
        <div v-else class="cafe-grid">
          <PlaceCard v-for="place in cafes" :key="place.id" :place="place" />
        </div>
      </section>

      <section class="hero" :class="'tier-' + tier.key">
        <p class="hero-label">현재 기온</p>
        <p class="hero-temp tnum">{{ showTemp(city.temp) }}</p>
        <p class="hero-note">{{ withJosa(city.name, '은/는') }} 지금 {{ city.status }}입니다.</p>
      </section>

      <section class="panel">
        <h2 class="panel-title">관측 정보</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="습도">
            <span class="tnum">{{ city.humidity }}%</span>
          </el-descriptions-item>
          <el-descriptions-item label="풍속">
            <span class="tnum">{{ city.wind }} m/s</span>
          </el-descriptions-item>
          <el-descriptions-item label="강수확률">
            <span class="tnum">{{ city.rainChance }}%</span>
          </el-descriptions-item>
          <el-descriptions-item label="미세먼지">
            <el-tag :type="dustTagType" size="small">{{ city.dust }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="일출">
            <span class="tnum">{{ city.sunrise }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="일몰">
            <span class="tnum">{{ city.sunset }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="panel">
        <h2 class="panel-title">시간대별 기온</h2>
        <div class="chart">
          <div v-for="bar in hourlyBars" :key="bar.label" class="bar-col">
            <span class="bar-value tnum">{{ toDisplay(bar.temp) }}°</span>
            <div class="bar" :style="{ height: bar.height + '%', background: bar.tier.color }"></div>
            <span class="bar-label">{{ bar.label }}</span>
          </div>
        </div>
      </section>
    </template>
  </el-dialog>
</template>

<style scoped>
:deep(.el-dialog) {
  max-width: 92vw;
}

.sub {
  display: flex;
  align-items: center;
  gap: var(--gap-2);
  flex-wrap: wrap;
  margin: 0 0 var(--gap-3);
}

.desc {
  font-size: 13px;
  color: var(--text-dim);
}

.fav {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
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
  margin-bottom: var(--gap-3);
}

.panel:last-child {
  margin-bottom: 0;
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
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  margin-bottom: var(--gap-3);
}

.hero.tier-very-hot {
  background: var(--very-hot-soft);
  border-color: #eab8ab;
}

.hero.tier-hot {
  background: var(--warm-soft);
  border-color: #eccea0;
}

.hero.tier-mild {
  background: var(--ok-soft);
  border-color: #bfe0cd;
}

.hero.tier-chilly {
  background: var(--cool-soft);
  border-color: #c2d6f2;
}

.hero.tier-cold {
  background: var(--cold-soft);
  border-color: #d3c1ee;
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

.tier-very-hot .hero-temp {
  color: var(--very-hot);
}

.tier-hot .hero-temp {
  color: var(--warm);
}

.tier-mild .hero-temp {
  color: var(--ok);
}

.tier-chilly .hero-temp {
  color: var(--cool);
}

.tier-cold .hero-temp {
  color: var(--cold);
}

.hero-note {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
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
  transition:
    height 0.4s var(--ease),
    background 0.3s var(--ease);
}

.bar-label {
  font-size: 11px;
  color: var(--text-faint);
}

.reason {
  margin-bottom: var(--gap-3);
}

.cafe-grid {
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
</style>
