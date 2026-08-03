/**
 * ============================================================================
 * temperature.js — 온도 표시 공통 로직
 * ============================================================================
 * [설계 원칙]
 * 원본 데이터(weatherList)는 항상 섭씨로 보관한다.
 * 화씨는 "화면에 그릴 때만" 변환한다. 데이터 자체를 바꾸지 않기 때문에
 * 단위를 여러 번 토글해도 반올림 오차가 누적되지 않는다.
 * ============================================================================
 */

/**
 * 섭씨 값을 현재 단위에 맞는 숫자로 변환한다.
 *
 * @param {number} celsius - 원본 섭씨 값
 * @param {'C'|'F'} unit   - 표시할 단위
 * @returns {number} 변환된 숫자 (단위 기호는 붙이지 않음)
 */
export function toDisplayTemp(celsius, unit) {
  // 화씨 공식: °F = °C × 9/5 + 32
  return unit === 'F' ? Math.round((celsius * 9) / 5 + 32) : celsius
}

/**
 * 화면에 그대로 찍을 수 있는 문자열을 만든다.
 *
 * @returns {string} 예: '28°C', '82°F'
 */
export function formatTemp(celsius, unit) {
  return `${toDisplayTemp(celsius, unit)}°${unit}`
}

/**
 * 25도 기준 분기.
 *
 * 주의: 판단은 반드시 "섭씨 원본"으로 한다.
 * 화씨로 변환한 값(예: 77)을 25와 비교하면 전부 '더움'이 되어 버린다.
 */
export function isHot(celsius) {
  return celsius >= 25
}

/**
 * 기온을 게이지 막대의 길이(%)로 변환한다.
 * 10℃ ~ 35℃ 구간을 0% ~ 100% 에 대응시킨다.
 *
 * Math.max(6, ...) 로 최소 6% 를 보장하는 이유:
 * 기온이 아주 낮을 때 막대가 완전히 사라져서 "고장난 것처럼" 보이는 걸 막기 위해서다.
 */
export function gaugePercent(celsius) {
  const ratio = ((celsius - 10) / 25) * 100
  return Math.min(100, Math.max(6, Math.round(ratio)))
}
