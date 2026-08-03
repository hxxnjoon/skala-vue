<!--
  ============================================================================
  WeatherCard.vue — 도시 한 곳의 날씨 카드
  ============================================================================

  [역할]
  도시 객체 하나를 받아 카드 한 장을 그린다.
  자기 상태(ref)를 하나도 갖지 않으므로, 같은 props 를 주면 언제나 같은 화면이 나온다.
  이런 컴포넌트를 표시 전용(presentational) 컴포넌트라고 부른다.

  [받는 것 — props]
    city     : { id, name, temp, status } 도시 객체 (필수)
    unit     : 'C' | 'F' — 온도를 어떤 단위로 그릴지
    selected : 지금 선택된 카드인지 (테두리 강조용)
    keyword  : 현재 검색어 (이름에서 일치하는 부분을 노란색으로 표시)

  [올리는 것 — emits]
    select-card  : 카드 본체를 클릭했을 때. 도시 객체를 실어 보낸다.
    click-detail : [상세보기] 버튼을 눌렀을 때. 역시 도시 객체를 실어 보낸다.

  [주의]
  이 컴포넌트는 alert 를 직접 띄우지 않고 상태 바 문구도 만들지 않는다.
  무슨 일이 일어났는지만 알리고, 무엇을 할지는 부모가 결정한다.
  ============================================================================
-->

<script setup>
import { computed } from 'vue'

// 온도 관련 계산은 전부 공통 유틸에서 가져온다.
// 부모의 요약 통계도 같은 함수를 쓰기 때문에 두 곳의 숫자가 어긋나지 않는다.
import { formatTemp, isHot, gaugePercent } from '../utils/temperature.js'

const props = defineProps({
  city: {
    type: Object,
    required: true,
  },
  unit: {
    type: String,
    default: 'C',
  },
  selected: {
    type: Boolean,
    default: false,
  },
  keyword: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-card', 'click-detail'])

/* ──────────────────────────────────────────────────────────────
   computed — props 로부터 파생되는 값들

   props 가 바뀌면 자동으로 다시 계산되고, 안 바뀌면 캐시된 값을 재사용한다.
   ────────────────────────────────────────────────────────────── */

// 25도 기준 분기. 반드시 섭씨 원본으로 판단한다(화씨로 비교하면 전부 '더움'이 된다).
const hot = computed(() => isHot(props.city.temp))

// 화면에 찍을 온도 문자열. unit props 가 바뀌면 이 값도 따라 바뀐다.
const tempLabel = computed(() => formatTemp(props.city.temp, props.unit))

// 게이지 막대 길이. style 바인딩에 바로 넣을 수 있도록 '%' 까지 붙여 둔다.
const barWidth = computed(() => gaugePercent(props.city.temp) + '%')

/**
 * 도시 이름을 검색어와 일치하는 조각 / 아닌 조각 으로 나눈다.
 *
 * 예) name='서울', keyword='서'
 *     → [{ text: '서', match: true }, { text: '울', match: false }]
 *
 * 이렇게 배열로 만들어 두면 템플릿에서 v-for 로 돌면서
 * match 인 조각에만 형광펜 클래스를 붙일 수 있다.
 */
const nameParts = computed(() => {
  const name = props.city.name
  const keyword = props.keyword.trim()

  // 검색어가 없으면 통째로 한 조각
  if (keyword === '') return [{ text: name, match: false }]

  const parts = []
  let cursor = 0

  // 이름 안에서 검색어가 나오는 위치를 앞에서부터 차례로 찾는다
  while (cursor < name.length) {
    const found = name.indexOf(keyword, cursor)

    // 더 이상 없으면 남은 부분을 통째로 넣고 종료
    if (found === -1) {
      parts.push({ text: name.slice(cursor), match: false })
      break
    }

    // 일치 지점 앞에 남은 글자가 있으면 먼저 넣는다
    if (found > cursor) parts.push({ text: name.slice(cursor, found), match: false })

    // 일치한 부분
    parts.push({ text: keyword, match: true })

    cursor = found + keyword.length
  }

  // 빈 조각은 걸러 낸다
  return parts.filter((part) => part.text !== '')
})

/* ──────────────────────────────────────────────────────────────
   날씨 아이콘

   이모지(☀️🌧️)는 빠르고 친근하지만 OS, 브라우저마다 모양, 크기가 달라 카드마다 정렬이 미묘하게 어긋난다.
   SVG 로 그리면 크기, 색, 선 굵기를 전부 CSS 로 제어할 수 있고,
   stroke="currentColor" 덕분에 더움/선선함에 따라 색이 자동으로 바뀐다.
   ────────────────────────────────────────────────────────────── */
const ICON_PATHS = {
  맑음: [
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z', // 해 원
    'M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4', // 광선 8개
  ],
  구름: ['M7.5 18.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4 3.4 3.4 0 0 0 1.2 6.6Z'],
  흐림: ['M8.5 15.5h8a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.5 1.3 3 3 0 0 0 1.2 5.7Z', 'M6 19h12'],
  비: [
    'M7.5 15.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4 3.4 3.4 0 0 0 1.2 6.6Z', // 구름
    'M9 18.5l-1 2.5M13 18.5l-1 2.5M17 18.5l-1 2.5', // 빗줄기 3개
  ],
  눈: [
    'M7.5 15.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4 3.4 3.4 0 0 0 1.2 6.6Z',
    'M9.5 19.5h.01M13 19.5h.01M16.5 19.5h.01', // 점 3개(눈송이)
  ],
}

// ?? 는 왼쪽이 null/undefined 일 때만 오른쪽을 쓴다.
// 데이터에 없는 날씨 상태가 들어와도 화면이 깨지지 않도록 기본값을 둔다.
const iconPaths = computed(() => ICON_PATHS[props.city.status] ?? ICON_PATHS['구름'])

/* ──────────────────────────────────────────────────────────────
   이벤트 — 부모에게 알리기만 한다
   ────────────────────────────────────────────────────────────── */

/** 카드 본체 클릭 → 어떤 도시가 선택됐는지 부모에게 전달 */
const onSelect = () => {
  emit('select-card', props.city)
}

/** [상세보기] 버튼 클릭 → 부모가 alert 를 띄우도록 전달 */
const onDetail = () => {
  emit('click-detail', props.city)
}
</script>

<template>
  <!--
    카드 전체가 클릭 가능한 영역이다.

    Tab 으로 이동하고 Enter/Space 로 누를 수 있도록 설정

    @keydown.space.prevent 의 .prevent 는 스페이스를 눌렀을 때 페이지가 아래로 스크롤되는 브라우저 기본 동작을 막는다.
  -->
  <article
    class="card"
    :class="{ selected: props.selected }"
    tabindex="0"
    role="button"
    :aria-pressed="props.selected"
    @click="onSelect"
    @keydown.enter="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <div class="card-top">
      <h3 class="city">
        <!--
          이름을 조각내어 출력한다.
          match 가 true 인 조각에만 .hit 클래스가 붙어 형광펜 효과가 생긴다.
        -->
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

    <!-- tnum: 숫자 폭을 고정해 단위를 바꿔도 글자가 덜컹거리지 않게 한다 -->
    <p class="temp tnum">{{ tempLabel }}</p>

    <!--
      이 화면의 시그니처 요소.
      기온을 길이로 보여 주기 때문에 카드를 훑기만 해도 어디가 더운지 보인다.
      :style 로 width 를 바인딩하면 값이 바뀔 때 CSS transition 이 부드럽게 이어 준다.
    -->
    <div class="gauge" role="presentation">
      <div class="gauge-fill" :class="hot ? 'hot' : 'cool'" :style="{ width: barWidth }"></div>
    </div>

    <div class="card-bottom">
      <!-- 과제 요구사항 2: 25도 기준 라벨 -->
      <span class="tag" :class="hot ? 'hot' : 'cool'">
        <template v-if="props.city.temp >= 25">더움 (25도 이상)</template>
        <template v-else>선선함 (25도 미만)</template>
      </span>

      <!--
        .stop 이 없으면 버튼 클릭이 부모인 카드까지 전파되어(버블링) alert 와 카드 선택이 동시에 일어난다.
      -->
      <button type="button" class="detail" @click.stop="onDetail">상세보기</button>
    </div>
  </article>
</template>

<style scoped>
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

/* 마우스를 올리면 살짝 떠오르게 해서 누를 수 있다는 신호를 준다 */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-2);
  border-color: var(--line-strong);
}

/* 선택된 카드. box-shadow 로 테두리를 한 겹 더 그려 두께만 늘린다.
   border-width 를 키우면 카드 크기가 변해서 레이아웃이 흔들린다. */
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

/* 검색어와 일치하는 글자 */
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
  white-space: nowrap; /* '맑음'이 두 줄로 쪼개지지 않게 */
}

.wx {
  width: 16px;
  height: 16px;
}

/* 기온에 따라 아이콘 색이 바뀐다 (stroke="currentColor" 덕분) */
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
  letter-spacing: -0.03em; /* 큰 숫자는 자간을 좁혀야 덩어리로 보인다 */
}

.gauge {
  height: 4px;
  background: var(--surface-sunken);
  border-radius: 999px;
  overflow: hidden; /* 안쪽 막대가 둥근 모서리를 넘지 않게 */
}

.gauge-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s var(--ease); /* 단위를 바꿀 때 길이가 부드럽게 이동 */
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
</style>
