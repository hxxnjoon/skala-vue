<!--
  PlaceCard.vue — 추천 장소(카페/음식점) 한 곳의 카드

  props : place — { id, name, category, address, phone, distance, placeUrl }
  자기 상태를 갖지 않는 순수 표시용 컴포넌트다. WeatherCard.vue 와 같은 시각 관례를 따른다.
-->

<script setup>
import { computed } from 'vue'

const props = defineProps({
  place: { type: Object, required: true },
})

// Kakao 의 category_name 은 "음식점 > 한식 > 육류,고기" 처럼 전체 경로를 준다.
// 가장 구체적인 마지막 항목만 태그로 보여준다.
const categoryLabel = computed(() => props.place.category.split(' > ').pop())

const distanceLabel = computed(() => `${Math.round(props.place.distance)}m`)
</script>

<template>
  <article class="card">
    <div class="card-top">
      <h3 class="name">{{ place.name }}</h3>
      <span class="distance tnum">{{ distanceLabel }}</span>
    </div>

    <el-tag size="small" type="primary" effect="light" round>{{ categoryLabel }}</el-tag>

    <p class="address">{{ place.address }}</p>
    <p v-if="place.phone" class="phone tnum">{{ place.phone }}</p>

    <el-button tag="a" :href="place.placeUrl" target="_blank" rel="noopener" size="small" class="link">
      카카오맵에서 보기
    </el-button>
  </article>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--gap-3);
  display: flex;
  flex-direction: column;
  gap: var(--gap-1);
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

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gap-2);
}

.name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.distance {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-faint);
}

.address {
  margin: var(--gap-1) 0 0;
  font-size: 13px;
  color: var(--text-dim);
}

.phone {
  margin: 0;
  font-size: 12px;
  color: var(--text-faint);
}

.link {
  align-self: flex-start;
  margin-top: var(--gap-1);
}
</style>
