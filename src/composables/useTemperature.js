/**
 * useTemperature.js — 온도 표시 Composable
 * 스토어 참조와 변환 로직을 이 함수 하나에 모아 두고 각 컴포넌트는 호출만 한다.
 * 반환값이 반응형이므로 단위를 바꾸면 이 함수를 쓰는 모든 화면이 함께 갱신된다.
 */
import { computed } from 'vue'
import { useConfigStore } from '../stores/configStore.js'
import { celsiusToFahrenheit } from '../utils/temperature.js'

export function useTemperature() {
  const configStore = useConfigStore()

  /** 현재 단위에 맞는 숫자 (기호 없음) */
  const toDisplay = (celsius) => (configStore.isFahrenheit ? celsiusToFahrenheit(celsius) : celsius)

  /** 화면에 그대로 찍을 문자열 (예: '82°F') */
  const format = (celsius) => `${toDisplay(celsius)}${configStore.unitSymbol}`

  return {
    toDisplay,
    format,
    unitSymbol: computed(() => configStore.unitSymbol),
    isFahrenheit: computed(() => configStore.isFahrenheit),
  }
}
