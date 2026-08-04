/**
 * temperature.js — 온도 표시 공통 로직
 *
 * 화면이 여러 개로 늘어나면 "홈은 화씨인데 상세는 섭씨" 같은 불일치가 생기기 쉽다.
 * 변환 코드를 이 파일에만 두고 모든 화면이 여기서 가져다 쓰게 한다.
 *
 * 원본 데이터는 항상 섭씨로 보관하고, 화씨는 그릴 때만 변환한다.
 * 데이터 자체를 바꾸지 않으므로 단위를 여러 번 토글해도 오차가 쌓이지 않는다.
 */

export function toDisplayTemp(celsius, unit) {
  return unit === 'F' ? Math.round((celsius * 9) / 5 + 32) : celsius
}

export function formatTemp(celsius, unit) {
  return `${toDisplayTemp(celsius, unit)}°${unit}`
}

/**
 * 25도 기준 분기.
 * 판단은 반드시 섭씨 원본으로 한다. 화씨 값(77)을 25와 비교하면 전부 '더움'이 된다.
 */
export function isHot(celsius) {
  return celsius >= 25
}

/** 기온을 게이지 길이(%)로. 10℃~35℃ 를 0~100% 에 대응시킨다. */
export function gaugePercent(celsius) {
  const ratio = ((celsius - 10) / 25) * 100
  return Math.min(100, Math.max(6, Math.round(ratio)))
}
