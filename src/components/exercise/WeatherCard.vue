<!--
  WeatherCard.vue — 도시 한 곳의 날씨 카드

  props : city, unit, selected, keyword, isFavorite
  emits : select-card, click-detail, toggle-favorite

  자기 상태를 갖지 않는다. 무슨 일이 있었는지만 알리고,
  무엇을 할지(페이지 이동·즐겨찾기 저장)는 부모가 정한다.
  덕분에 이번 과제에서 alert 를 라우터 이동으로 바꿔도 이 파일은 손댈 필요가 없었다.
-->

<script setup>
import { computed } from 'vue'

import { useTemperature } from '../../composables/useTemperature.js'
import { useFavoritesStore } from '../../stores/favoritesStore.js'
import { isHot, gaugePercent } from '../../utils/temperature.js'

const props = defineProps({
  city: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  keyword: { type: String, default: '' },
})

const emit = defineEmits(['select-card', 'click-detail', 'toggle-favorite'])

// 단위 변환은 Composable 한 곳에만 존재한다. 카드마다 같은 computed 를 작성하지 않는다.
const { format } = useTemperature()

const favoritesStore = useFavoritesStore()
const isFavorite = computed(() => favoritesStore.has(props.city.id))

const hot = computed(() => isHot(props.city.temp))
const tempLabel = computed(() => format(props.city.temp))
const barWidth = computed(() => gaugePercent(props.city.temp) + '%')

// 검색어와 일치하는 구간을 조각내어 형광펜 표시
// (초성 검색으로 걸린 경우에는 일치 구간이 없어 통째로 한 조각이 된다)
const nameParts = computed(() => {
  const name = props.city.name
  const keyword = props.keyword.trim()
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
})

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
const iconPaths = computed(() => ICON_PATHS[props.city.status] ?? ICON_PATHS['구름'])

const STAR_PATH = 'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z'

const onSelect = () => emit('select-card', props.city)
const onDetail = () => emit('click-detail', props.city)
const onToggleFavorite = () => emit('toggle-favorite', props.city)
</script>

<template>
  <article
    class="card"
    :class="{ selected: props.selected, fav: isFavorite }"
    tabindex="0"
    role="button"
    :aria-pressed="props.selected"
    @click="onSelect"
    @keydown.enter="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <div class="card-top">
      <h3 class="city">
        <span v-for="(part, i) in nameParts" :key="i" :class="{ hit: part.match }">{{
          part.text
        }}</span>
      </h3>

      <span class="status" :class="hot ? 'hot' : 'cool'">
        <svg
          class="wx"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path v-for="(d, i) in iconPaths" :key="i" :d="d" />
        </svg>
        {{ props.city.status }}
      </span>
    </div>

    <p class="temp tnum">{{ tempLabel }}</p>

    <div class="gauge" role="presentation">
      <div class="gauge-fill" :class="hot ? 'hot' : 'cool'" :style="{ width: barWidth }"></div>
    </div>

    <div class="card-bottom">
      <el-tag :type="hot ? 'danger' : 'primary'" effect="light" size="small" round>
        <template v-if="props.city.temp >= 25">더움 (25도 이상)</template>
        <template v-else>선선함 (25도 미만)</template>
      </el-tag>

      <div class="btns">
        <!-- 카드 안의 버튼이므로 .stop 으로 카드 클릭까지 번지는 것을 막는다 -->
        <el-tooltip :content="isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'" placement="top">
          <button
            type="button"
            class="fav-btn"
            :class="{ on: isFavorite }"
            :aria-pressed="isFavorite"
            @click.stop="onToggleFavorite"
          >
            <svg
              viewBox="0 0 24 24"
              :fill="isFavorite ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path :d="STAR_PATH" />
            </svg>
          </button>
        </el-tooltip>

        <el-button size="small" round @click.stop="onDetail">상세보기</el-button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
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

/* 즐겨찾기 카드는 왼쪽 띠로 구분한다 */
.card.fav::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--star);
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

.btns {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-faint);
  transition: all 0.18s var(--ease);
}

.fav-btn svg {
  width: 15px;
  height: 15px;
}

.fav-btn:hover {
  background: var(--surface-sunken);
  color: var(--star);
}

.fav-btn.on {
  color: var(--star);
}
</style>
