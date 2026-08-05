/**
 * temperature.js — 단위와 무관한 순수 계산 함수
 *
 * 스토어나 컴포넌트를 전혀 참조하지 않는다. 입력이 같으면 항상 같은 값을 돌려주므로
 * 테스트하기 쉽고, 어디서 호출하든 결과가 달라지지 않는다.
 * 스토어의 현재 단위와 연결하는 일은 composables/useTemperature.js 가 맡는다.
 */

/** 섭씨를 화씨로 변환 */
export function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32)
}

/**
 * 5단계 기온 구간.
 * min 내림차순으로 두고 첫 번째로 만족하는 구간을 찾는 방식이라 순서를 바꾸면 안 된다.
 */
export const TEMP_TIERS = [
  { key: 'very-hot', label: '매우더움', range: '30℃ 이상', min: 30, color: 'var(--very-hot)' },
  { key: 'hot', label: '더움', range: '25~29℃', min: 25, color: 'var(--warm)' },
  { key: 'mild', label: '선선함', range: '20~24℃', min: 20, color: 'var(--ok)' },
  { key: 'chilly', label: '쌀쌀함', range: '15~19℃', min: 15, color: 'var(--cool)' },
  { key: 'cold', label: '추움', range: '15℃ 미만', min: -Infinity, color: 'var(--cold)' },
]

/**
 * 섭씨 기온이 속한 구간을 돌려준다.
 * 판단은 반드시 섭씨 원본으로 한다. 화씨 값(77)을 그대로 비교하면 전부 '매우더움'이 된다.
 */
export function getTempTier(celsius) {
  return TEMP_TIERS.find((tier) => celsius >= tier.min)
}

/** 기온을 게이지 길이(%)로. 10℃~35℃ 를 0~100% 에 대응시킨다. */
export function gaugePercent(celsius) {
  const ratio = ((celsius - 10) / 25) * 100
  return Math.min(100, Math.max(6, Math.round(ratio)))
}
