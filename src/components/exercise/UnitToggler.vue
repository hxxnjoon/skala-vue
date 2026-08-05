<!--
  UnitToggler.vue — 온도 단위 전환 UI

  내비게이션 바에 배치되어 모든 페이지에서 접근할 수 있다.
  자체 상태를 갖지 않고 configStore 만 읽고 쓴다. props 도 emits 도 필요 없다.

  이전 구현에서는 대시보드와 상세 페이지가 각각 토글 버튼을 갖고 있었고,
  두 버튼이 서로 다른 ref 를 바라보았기 때문에 페이지를 옮기면 설정이 초기화됐다.
-->

<script setup>
import { computed } from 'vue'
import { useConfigStore } from '../../stores/configStore.js'

/**
 * 스토어 인스턴스를 그대로 사용한다.
 * 구조 분해(const { unit } = configStore)를 하면 반응성이 끊기므로,
 * 값을 따로 꺼내야 할 때는 storeToRefs() 를 쓴다.
 */
const configStore = useConfigStore()

/**
 * el-switch 는 boolean v-model 을 기대하므로, get/set computed 로
 * 스토어의 문자열 unit 값과 이어 준다.
 */
const isFahrenheit = computed({
  get: () => configStore.isFahrenheit,
  set: (value) => configStore.setUnit(value ? 'fahrenheit' : 'celsius'),
})
</script>

<template>
  <div class="toggler">
    <span class="label">날씨단위</span>

    <el-switch
      v-model="isFahrenheit"
      inline-prompt
      active-text="°F"
      inactive-text="°C"
      :aria-label="`온도 단위를 ${configStore.isFahrenheit ? '섭씨' : '화씨'}로 변경`"
    />
  </div>
</template>

<style scoped>
.toggler {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-2);
}

.label {
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}

@media (max-width: 560px) {
  /* 화면이 좁으면 문구는 감추고 스위치만 남긴다 */
  .label {
    display: none;
  }
}
</style>
