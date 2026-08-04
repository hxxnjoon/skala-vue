<!--
  UnitToggler.vue — 온도 단위 전환 UI

  내비게이션 바에 배치되어 모든 페이지에서 접근할 수 있다.
  자체 상태를 갖지 않고 configStore 만 읽고 쓴다. props 도 emits 도 필요 없다.

  이전 구현에서는 대시보드와 상세 페이지가 각각 토글 버튼을 갖고 있었고,
  두 버튼이 서로 다른 ref 를 바라보았기 때문에 페이지를 옮기면 설정이 초기화됐다.
-->

<script setup>
import { useConfigStore } from '../../stores/configStore.js'

/**
 * 스토어 인스턴스를 그대로 사용한다.
 * 구조 분해(const { unit } = configStore)를 하면 반응성이 끊기므로,
 * 값을 따로 꺼내야 할 때는 storeToRefs() 를 쓴다.
 */
const configStore = useConfigStore()
</script>

<template>
  <div class="toggler">
    <span class="label">
      날씨단위: <strong>{{ configStore.unitLabel }}</strong>
    </span>

    <!--
      action 을 직접 호출한다.
    -->
    <button
      type="button"
      class="btn"
      :aria-label="`온도 단위를 ${configStore.isFahrenheit ? '섭씨' : '화씨'}로 변경`"
      @click="configStore.toggleUnit"
    >
      단위변경
    </button>
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

.label strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.btn {
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-dim);
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.18s var(--ease);
}

.btn:hover {
  background: var(--text);
  border-color: var(--text);
  color: #fff;
}

@media (max-width: 560px) {
  /* 화면이 좁으면 문구는 감추고 버튼만 남긴다 */
  .label {
    display: none;
  }
}
</style>
